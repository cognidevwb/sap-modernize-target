using System.Globalization;
using System.Net;
using System.Net.Http.Headers;
using System.Text.Json;
using SapSettlement.Contracts;
using SapSettlement.Domain;

namespace SapSettlement.Connectors;

/// <summary>Target boundary: tenant-scoped, authenticated CAP OData reads; no database credentials.</summary>
public sealed class ApiInvoiceLedger : IInvoiceLedger
{
    private readonly HttpClient client;
    private readonly Uri endpoint;
    private readonly Func<CancellationToken, Task<string>> accessToken;
    private readonly Func<TimeSpan, CancellationToken, Task> delay;
    public ApiInvoiceLedger(HttpClient client, Uri baseUri, Func<CancellationToken, Task<string>> accessToken,
        Func<TimeSpan, CancellationToken, Task>? delay = null)
    {
        if (baseUri.Scheme != "https" || !string.IsNullOrEmpty(baseUri.UserInfo) || !string.IsNullOrEmpty(baseUri.Query) || !string.IsNullOrEmpty(baseUri.Fragment))
            throw new ArgumentException("Finance API requires a clean HTTPS base URI");
        this.client = client;
        endpoint = new Uri(baseUri, "/odata/v4/finance/Invoices");
        this.accessToken = accessToken;
        this.delay = delay ?? Task.Delay;
    }
    public async Task<IReadOnlyList<LedgerInvoice>> ReadOpenAsync(string companyCode, string currency,
        DateOnly asOf, CancellationToken cancellationToken)
    {
        Reconciler.ValidateScope(companyCode, currency);
        var filter = $"companyCode eq '{companyCode}' and currency eq '{currency}' and dueDate le {asOf:yyyy-MM-dd} and status eq 'OPEN'";
        Uri? page = new(endpoint + "?$select=ID,companyCode,currency,netAmount,taxAmount,dueDate,status&$orderby=ID&$top=1000&$filter=" + Uri.EscapeDataString(filter));
        var visited = new HashSet<string>(StringComparer.Ordinal);
        var rows = new List<LedgerInvoice>();
        var identifiers = new HashSet<string>(StringComparer.Ordinal);
        while (page is not null)
        {
            if (!visited.Add(page.AbsoluteUri) || visited.Count > 100) throw new InvalidDataException("Invalid or excessive OData pagination");
            using var response = await GetAsync(page, cancellationToken);
            response.EnsureSuccessStatusCode();
            if (response.Content.Headers.ContentLength is > 8_000_000) throw new InvalidDataException("OData page exceeds size limit");
            await using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
            using var bounded = new MemoryStream();
            var buffer = new byte[16384]; int count;
            while ((count = await stream.ReadAsync(buffer, cancellationToken)) > 0)
            {
                if (bounded.Length + count > 8_000_000) throw new InvalidDataException("OData page exceeds size limit");
                bounded.Write(buffer, 0, count);
            }
            using var document = JsonDocument.Parse(bounded.ToArray());
            foreach (var row in document.RootElement.GetProperty("value").EnumerateArray())
            {
                var id = row.GetProperty("ID").GetString() ?? "";
                var company = row.GetProperty("companyCode").GetString() ?? "";
                var rowCurrency = row.GetProperty("currency").GetString() ?? "";
                var status = row.GetProperty("status").GetString() ?? "";
                var dueDate = DateOnly.ParseExact(row.GetProperty("dueDate").GetString()!, "yyyy-MM-dd", CultureInfo.InvariantCulture);
                if (company != companyCode || rowCurrency != currency || status != "OPEN" || dueDate > asOf)
                    throw new InvalidDataException("Finance API returned data outside requested scope");
                if (string.IsNullOrWhiteSpace(id) || !identifiers.Add(id) || rows.Count >= 100000)
                    throw new InvalidDataException("Invalid, duplicate, or excessive invoice collection");
                var amount = Amount(row.GetProperty("netAmount")) + Amount(row.GetProperty("taxAmount"));
                Reconciler.ValidateAmount(amount);
                rows.Add(new(id, company, rowCurrency, amount, dueDate, status));
            }
            page = null;
            if (document.RootElement.TryGetProperty("@odata.nextLink", out var next))
            {
                var text = next.GetString();
                if (string.IsNullOrWhiteSpace(text)) throw new InvalidDataException("Empty OData next link");
                page = new Uri(endpoint, text);
                if (page.Scheme != endpoint.Scheme || page.Authority != endpoint.Authority || page.AbsolutePath != endpoint.AbsolutePath
                    || !string.IsNullOrEmpty(page.UserInfo) || !string.IsNullOrEmpty(page.Fragment))
                    throw new InvalidDataException("OData next link changes the trusted endpoint");
            }
        }
        return rows.OrderBy(x => x.InvoiceId, StringComparer.Ordinal).ToArray();
    }
    private static decimal Amount(JsonElement value)
    {
        var amount = value.ValueKind == JsonValueKind.String
            ? decimal.Parse(value.GetString()!, NumberStyles.AllowDecimalPoint, CultureInfo.InvariantCulture)
            : value.GetDecimal();
        if (amount < 0 || decimal.Round(amount, 2) != amount) throw new InvalidDataException("Invalid API monetary amount");
        return amount;
    }
    private async Task<HttpResponseMessage> GetAsync(Uri page, CancellationToken token)
    {
        for (var attempt = 0; ; attempt++)
        {
            using var request = new HttpRequestMessage(HttpMethod.Get, page);
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", await accessToken(token));
            request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
            var response = await client.SendAsync(request, HttpCompletionOption.ResponseHeadersRead, token);
            if (attempt >= 3 || response.StatusCode is not (HttpStatusCode.TooManyRequests or HttpStatusCode.ServiceUnavailable)) return response;
            var wait = response.Headers.RetryAfter?.Delta ?? TimeSpan.FromMilliseconds(250 * (1 << attempt));
            response.Dispose();
            await delay(TimeSpan.FromMilliseconds(Math.Clamp(wait.TotalMilliseconds, 0, 10000)), token);
        }
    }
}
