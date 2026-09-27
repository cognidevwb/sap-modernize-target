using System.Globalization;
using SapSettlement.Connectors;
using SapSettlement.Operations;

if (args.Length != 5)
{
    Console.Error.WriteLine("Usage: SapSettlement.Batch <bank.csv> <company> <currency> <yyyy-MM-dd> <report-directory>");
    return 64;
}
using var cancellation = new CancellationTokenSource();
Console.CancelKeyPress += (_, e) => { e.Cancel = true; cancellation.Cancel(); };
try
{
    string Required(string name) => Environment.GetEnvironmentVariable(name) is {Length: >0} value ? value : throw new ArgumentException($"Missing {name}");
    using var client = new HttpClient(new HttpClientHandler { AllowAutoRedirect = false }) { Timeout = TimeSpan.FromSeconds(30) };
    using var tokens = new OAuthTokenProvider(client, new Uri(Required("SAP_OAUTH_TOKEN_URL")), Required("SAP_OAUTH_CLIENT_ID"), Required("SAP_OAUTH_CLIENT_SECRET"));
    var ledger = new ApiInvoiceLedger(client, new Uri(Required("SAP_FINANCE_BASE_URL")), tokens.GetAsync);
    var job = new SettlementJob(ledger);
    using var input = File.OpenText(args[0]);
    var report = await job.RunAsync(args[1], args[2], DateOnly.ParseExact(args[3], "yyyy-MM-dd", CultureInfo.InvariantCulture), input, cancellation.Token);
    var output = await ReportStore.SaveAsync(args[4], report, cancellation.Token);
    Console.WriteLine(System.Text.Json.JsonSerializer.Serialize(new { report.ExceptionCount, report.DifferenceTotal, output }));
    return report.ExceptionCount == 0 ? 0 : 2;
}
catch (OperationCanceledException) { Console.Error.WriteLine("Settlement cancelled"); return 130; }
catch (Exception error) when (error is IOException or ArgumentException or FormatException or HttpRequestException or System.Text.Json.JsonException or InvalidOperationException)
{
    Console.Error.WriteLine($"Settlement failed: {error.GetType().Name}");
    return 1;
}
