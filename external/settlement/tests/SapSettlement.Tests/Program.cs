using System.Text.Json;
using Microsoft.Data.Sqlite;
using SapSettlement.Contracts;
using SapSettlement.Connectors;
using SapSettlement.Domain;
using SapSettlement.Operations;

var tests = new List<(string Name, Func<Task> Run)>();
var date = new DateOnly(2026, 9, 26);
LedgerInvoice Invoice(string id = "INV-1", decimal amount = 100m) => new(id, "1000", "EUR", amount, date, "OPEN");
BankPayment Payment(string id = "TX-1", decimal amount = 100m, string invoice = "INV-1") => new(id, invoice, "1000", "EUR", amount, date);
void Equal<T>(T actual, T expected) { if (!EqualityComparer<T>.Default.Equals(actual, expected)) throw new Exception($"Expected {expected}, got {actual}"); }
void Reject(Action action) { try { action(); } catch (Exception ex) when (ex is ArgumentException or InvalidDataException) { return; } throw new Exception("Expected rejection"); }
void Add(string name, Action run) => tests.Add((name, () => { run(); return Task.CompletedTask; }));
ReconciliationReport Report(LedgerInvoice[] invoices, BankPayment[] payments) => Reconciler.Run("1000", "EUR", date, invoices, payments);
Add("full payment matches and balances", () => {
    var r = Report([Invoice()], [Payment()]); Equal(r.ExceptionCount, 0); Equal(r.DifferenceTotal, 0m); Equal(r.Lines[0].Outcome, "MATCHED");
});
Add("multiple payments aggregate exactly", () => Equal(Report([Invoice()], [Payment("A", 33.33m), Payment("B", 66.67m)]).ExceptionCount, 0));
Add("one cent tolerance is bounded", () => {
    Equal(Report([Invoice()], [Payment(amount: 99.99m)]).ExceptionCount, 0);
    Equal(Report([Invoice()], [Payment(amount: 99.98m)]).Lines[0].Outcome, "UNDERPAID");
    Reject(() => Reconciler.Run("1000", "EUR", date, [], [], 1m));
});
Add("underpayment overpayment and missing are distinguishable", () => {
    Equal(Report([Invoice()], [Payment(amount: 90m)]).Lines[0].Outcome, "UNDERPAID");
    Equal(Report([Invoice()], [Payment(amount: 110m)]).Lines[0].Outcome, "OVERPAID");
    Equal(Report([Invoice()], []).Lines[0].Outcome, "MISSING_PAYMENT");
});
Add("unmatched bank is retained and affects reconciliation totals", () => {
    var r = Report([], [Payment()]); Equal(r.Lines[0].Outcome, "UNMATCHED_BANK"); Equal(r.DifferenceTotal, -100m);
});
Add("duplicate transactions rejected even if payload matches", () => Reject(() => Report([Invoice()], [Payment(), Payment()])));
Add("duplicate invoice extraction rejected", () => Reject(() => Report([Invoice(), Invoice()], [])));
Add("mixed company ledger rejected", () => Reject(() => Report([Invoice() with {CompanyCode = "2000"}], [])));
Add("mixed currency bank rejected", () => Reject(() => Report([Invoice()], [Payment() with {Currency = "USD"}])));
Add("cancelled and future invoices rejected at domain boundary", () => {
    Reject(() => Report([Invoice() with {Status = "CANCELLED"}], []));
    Reject(() => Report([Invoice() with {DueDate = date.AddDays(1)}], []));
});
Add("future bank value date excluded", () => Equal(Report([Invoice()], [Payment() with {ValueDate = date.AddDays(1)}]).ReceivedTotal, 0m));
Add("negative zero overprecision and excessive amounts rejected", () => {
    foreach (var amount in new[] { -1m, 0m, 1.001m, 10000000000000m }) Reject(() => Report([Invoice()], [Payment(amount: amount)]));
});
Add("empty scope returns zero", () => { var r = Report([], []); Equal(r.ExceptionCount, 0); Equal(r.ExpectedTotal, 0m); });
const string header = "transactionId,invoiceId,companyCode,currency,amount,valueDate\n";
Add("CSV quoted identifiers handled without splitting", () => {
    var rows = BankCsvReader.Read(new StringReader(header + "\"TX,1\",INV-1,1000,EUR,100.00,2026-09-26\n"));
    Equal(rows[0].TransactionId, "TX,1"); Equal(rows[0].Amount, 100m);
});
Add("CSV header date field count and precision validated", () => {
    Reject(() => BankCsvReader.Read(new StringReader("bad,header\n")));
    foreach (var row in new[] { "TX,INV,1000,EUR,1.00,2026-02-30", "TX,INV,1000,EUR,1.001,2026-09-26", "TX,INV,1000,EUR,1.00" })
        Reject(() => BankCsvReader.Read(new StringReader(header + row)));
});
tests.Add(("real SQLite connector scopes company currency dates and statuses", async () => {
    var path = Path.Combine(Path.GetTempPath(), $"sap-ledger-{Guid.NewGuid():N}.sqlite");
    try {
        await using (var db = new SqliteConnection($"Data Source={path}")) {
            await db.OpenAsync(); await using var cmd = db.CreateCommand();
            cmd.CommandText = """
                CREATE TABLE sap_invoice_extract(invoice_id TEXT PRIMARY KEY,company_code TEXT,currency TEXT,amount_minor INTEGER,due_date TEXT,status TEXT);
                INSERT INTO sap_invoice_extract VALUES
                  ('INV-1','1000','EUR',10000,'2026-09-26','OPEN'),
                  ('INV-2','1000','EUR',5000,'2026-09-25','PARTIAL'),
                  ('OTHER','2000','EUR',90000,'2026-09-25','OPEN'),
                  ('USD','1000','USD',90000,'2026-09-25','OPEN'),
                  ('FUTURE','1000','EUR',90000,'2026-09-27','OPEN'),
                  ('CLOSED','1000','EUR',90000,'2026-09-25','PAID');
                """;
            await cmd.ExecuteNonQueryAsync();
        }
        var ledger = new SqlInvoiceLedger(() => new SqliteConnection($"Data Source={path};Mode=ReadOnly;Pooling=False"));
        var rows = await ledger.ReadOpenAsync("1000", "EUR", date, default);
        Equal(rows.Count, 2); Equal(rows.Sum(x => x.Amount), 150m);
        var job = new SettlementJob(ledger);
        using var input = new StringReader(header + "TX-1,INV-1,1000,EUR,100.00,2026-09-26\nTX-2,INV-2,1000,EUR,50.00,2026-09-26\n");
        Equal((await job.RunAsync("1000", "EUR", date, input, default)).ExceptionCount, 0);
        try { await ledger.ReadOpenAsync("' OR", "EUR", date, default); throw new Exception("Injection scope accepted"); }
        catch (ArgumentException) { }
    } finally { SqliteConnection.ClearAllPools(); File.Delete(path); }
}));
tests.Add(("atomic report is deterministic retry safe and detects tampering", async () => {
    var directory = Path.Combine(Path.GetTempPath(), $"sap-reports-{Guid.NewGuid():N}");
    try {
        var r = Report([Invoice()], [Payment()]);
        var paths = await Task.WhenAll(Enumerable.Range(0, 8).Select(_ => ReportStore.SaveAsync(directory, r, default)));
        Equal(paths.Distinct().Count(), 1); Equal(Directory.GetFiles(directory).Length, 1);
        await File.WriteAllTextAsync(paths[0], "tampered");
        try { await ReportStore.SaveAsync(directory, r, default); throw new Exception("Tampering accepted"); }
        catch (InvalidDataException) { }
    } finally { Directory.Delete(directory, recursive: true); }
}));
tests.Add(("cancellation propagates without reading ledger", async () => {
    var job = new SettlementJob(new ForbiddenLedger());
    using var cancel = new CancellationTokenSource(); cancel.Cancel();
    try { await job.RunAsync("1000", "EUR", date, new StringReader(header), cancel.Token); throw new Exception("Cancellation ignored"); }
    catch (OperationCanceledException) { }
}));
ApiTests.Register(tests);
var results = new List<object>();
var failed = 0;
foreach (var test in tests) {
    try { await test.Run(); Console.WriteLine($"PASS {test.Name}"); results.Add(new { test.Name, passed = true }); }
    catch (Exception ex) { failed++; Console.Error.WriteLine($"FAIL {test.Name}: {ex.Message}"); results.Add(new { test.Name, passed = false, error = ex.Message }); }
}
Console.WriteLine(JsonSerializer.Serialize(new { total = tests.Count, passed = tests.Count - failed, failed, results }));
return failed == 0 ? 0 : 1;

sealed class ForbiddenLedger : IInvoiceLedger
{
    public Task<IReadOnlyList<LedgerInvoice>> ReadOpenAsync(string companyCode, string currency, DateOnly asOf, CancellationToken cancellationToken)
        => throw new Exception("Ledger must not be called after cancellation");
}
