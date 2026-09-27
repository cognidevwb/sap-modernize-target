using System.Net;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using SapSettlement.Contracts;
using SapSettlement.Connectors;
using SapSettlement.Domain;
using SapSettlement.Operations;

public static class ApiTests
{
    private static readonly DateOnly Date = new(2026, 9, 26);
    private static readonly Uri Endpoint = new("https://finance.example.test");
    private static object Invoice(string id = "INV-1", string company = "1000") => new { ID = id, companyCode = company, currency = "EUR", netAmount = "100.00", taxAmount = "19.00", dueDate = "2026-09-26", status = "OPEN" };
    private static HttpResponseMessage Json(object body) => new(HttpStatusCode.OK) {Content = new StringContent(JsonSerializer.Serialize(body), Encoding.UTF8, "application/json")};
    private static void Check(bool condition, string message) { if (!condition) throw new Exception(message); }
    private static async Task Rejected(Func<Task> run) {
        try { await run(); } catch (Exception ex) when (ex is InvalidDataException or ArgumentException or HttpRequestException) { return; }
        throw new Exception("Expected API rejection");
    }
    public static void Register(List<(string Name, Func<Task> Run)> tests)
    {
        tests.Add(("target API maps exact monetary values and preserves source reconciliation results", async () => {
            using var client = new HttpClient(new Handler(request => {
                Check(request.Headers.Authorization?.ToString() == "Bearer test-token", "Missing bearer token");
                var query = Uri.UnescapeDataString(request.RequestUri!.Query);
                Check(query.Contains("companyCode eq '1000'") && query.Contains("currency eq 'EUR'") && query.Contains("dueDate le 2026-09-26"), "Missing scope filter");
                return Json(new { value = new[] {Invoice()} });
            }));
            var ledger = new ApiInvoiceLedger(client, Endpoint, _ => Task.FromResult("test-token"));
            var rows = await ledger.ReadOpenAsync("1000", "EUR", Date, default);
            var payments = new[] { new BankPayment("B1", "INV-1", "1000", "EUR", 119m, Date) };
            var target = Reconciler.Run("1000", "EUR", Date, rows, payments);
            var baseline = Reconciler.Run("1000", "EUR", Date, [new("INV-1", "1000", "EUR", 119m, Date, "OPEN")], payments);
            Check(target.Lines.SequenceEqual(baseline.Lines) && target.ExpectedTotal == baseline.ExpectedTotal && target.ReceivedTotal == baseline.ReceivedTotal && target.DifferenceTotal == baseline.DifferenceTotal && target.ExceptionCount == baseline.ExceptionCount, "Source/target reconciliation differs");
            var directory = Path.Combine(Path.GetTempPath(), $"sap-equivalence-{Guid.NewGuid():N}");
            try { Check(await ReportStore.SaveAsync(directory, target, default) == await ReportStore.SaveAsync(directory, baseline, default), "Equivalent reports are not byte-identical"); }
            finally { Directory.Delete(directory, recursive: true); }
        }));
        tests.Add(("target follows same-resource OData pagination and sorts results", async () => {
            var calls = 0;
            using var client = new HttpClient(new Handler(_ => ++calls == 1
                ? Json(new Dictionary<string, object> { ["value"] = new[] {Invoice("INV-2")}, ["@odata.nextLink"] = "Invoices?$skiptoken=next" })
                : Json(new {value = new[] {Invoice("INV-1")} })));
            var rows = await new ApiInvoiceLedger(client, Endpoint, _ => Task.FromResult("token")).ReadOpenAsync("1000", "EUR", Date, default);
            Check(calls == 2 && rows.Count == 2 && rows[0].InvoiceId == "INV-1", "Pagination result wrong");
        }));
        tests.Add(("target refuses external next-link before disclosing bearer token", async () => {
            var calls = 0;
            using var client = new HttpClient(new Handler(_ => { calls++; return Json(new Dictionary<string, object> { ["value"] = Array.Empty<object>(), ["@odata.nextLink"] = "https://untrusted.example/odata/v4/finance/Invoices" }); }));
            await Rejected(async () => await new ApiInvoiceLedger(client, Endpoint, _ => Task.FromResult("token")).ReadOpenAsync("1000", "EUR", Date, default));
            Check(calls == 1, "Followed untrusted link");
        }));
        tests.Add(("target refuses cross-company response even if server ignored filter", async () => {
            using var client = new HttpClient(new Handler(_ => Json(new { value = new[] {Invoice(company:"2000")} })));
            await Rejected(async () => await new ApiInvoiceLedger(client, Endpoint, _ => Task.FromResult("token")).ReadOpenAsync("1000", "EUR", Date, default));
        }));
        tests.Add(("target refuses duplicate invoices across pages", async () => {
            using var client = new HttpClient(new Handler(_ => Json(new { value = new[] {Invoice(), Invoice()} })));
            await Rejected(async () => await new ApiInvoiceLedger(client, Endpoint, _ => Task.FromResult("token")).ReadOpenAsync("1000", "EUR", Date, default));
        }));
        tests.Add(("target throttling retries have a bounded count and delay", async () => {
            var calls = 0; var delays = new List<TimeSpan>();
            using var client = new HttpClient(new Handler(_ => { calls++; var response = new HttpResponseMessage(HttpStatusCode.TooManyRequests); response.Headers.RetryAfter = new RetryConditionHeaderValue(TimeSpan.FromHours(1)); return response; }));
            var ledger = new ApiInvoiceLedger(client, Endpoint, _ => Task.FromResult("token"), (delay, _) => { delays.Add(delay); return Task.CompletedTask; });
            await Rejected(async () => await ledger.ReadOpenAsync("1000", "EUR", Date, default));
            Check(calls == 4 && delays.Count == 3 && delays.All(x => x <= TimeSpan.FromSeconds(10)), "Unbounded retry");
        }));
        tests.Add(("target never retries authentication rejection", async () => {
            var calls = 0; using var client = new HttpClient(new Handler(_ => { calls++; return new HttpResponseMessage(HttpStatusCode.Unauthorized); }));
            await Rejected(async () => await new ApiInvoiceLedger(client, Endpoint, _ => Task.FromResult("token")).ReadOpenAsync("1000", "EUR", Date, default));
            Check(calls == 1, "Unauthorized request retried");
        }));
        tests.Add(("target rejects insecure transport", async () => {
            using var client = new HttpClient(new Handler(_ => Json(new {value = Array.Empty<object>()})));
            await Rejected(() => { _ = new ApiInvoiceLedger(client, new Uri("http://finance.example.test"), _ => Task.FromResult("token")); return Task.CompletedTask; });
        }));
        tests.Add(("OAuth provider caches one token across concurrent consumers", async () => {
            var calls = 0; using var client = new HttpClient(new Handler(request => {
                Interlocked.Increment(ref calls); Check(request.Method == HttpMethod.Post, "OAuth must POST");
                Check(request.Headers.Authorization?.Scheme == "Basic", "OAuth client authentication missing");
                return Json(new {access_token = "unit-test-token", token_type = "Bearer", expires_in = 3600});
            }));
            using var provider = new OAuthTokenProvider(client, new Uri("https://auth.example.test/oauth/token"), "client", "test-secret");
            var values = await Task.WhenAll(Enumerable.Range(0, 20).Select(_ => provider.GetAsync(default)));
            Check(calls == 1 && values.All(x => x == "unit-test-token"), "Concurrent token refresh duplicated");
        }));
        tests.Add(("OAuth refuses malformed token response", async () => {
            using var client = new HttpClient(new Handler(_ => Json(new {access_token = "token", token_type = "Other", expires_in = 3600})));
            using var provider = new OAuthTokenProvider(client, new Uri("https://auth.example.test/oauth/token"), "client", "test-secret");
            await Rejected(async () => await provider.GetAsync(default));
        }));
    }
    private sealed class Handler(Func<HttpRequestMessage, HttpResponseMessage> respond) : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        { cancellationToken.ThrowIfCancellationRequested(); return Task.FromResult(respond(request)); }
    }
}
