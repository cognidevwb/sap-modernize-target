using SapSettlement.Contracts;
using System.Text.RegularExpressions;

namespace SapSettlement.Domain;

public static partial class Reconciler
{
    [GeneratedRegex("^[A-Z0-9]{4}$")] private static partial Regex CompanyPattern();
    [GeneratedRegex("^[A-Z]{3}$")] private static partial Regex CurrencyPattern();

    public static void ValidateScope(string companyCode, string currency)
    {
        if (!CompanyPattern().IsMatch(companyCode) || !CurrencyPattern().IsMatch(currency))
            throw new ArgumentException("Invalid company code or currency");
    }

    public static ReconciliationReport Run(string companyCode, string currency, DateOnly asOf,
        IReadOnlyList<LedgerInvoice> invoices, IReadOnlyList<BankPayment> payments,
        decimal tolerance = 0.01m)
    {
        ValidateScope(companyCode, currency);
        if (tolerance < 0m || tolerance > 0.01m)
            throw new ArgumentOutOfRangeException(nameof(tolerance));
        var ledger = new Dictionary<string, LedgerInvoice>(StringComparer.Ordinal);
        foreach (var invoice in invoices)
        {
            if (invoice.CompanyCode != companyCode || invoice.Currency != currency)
                throw new InvalidDataException("Ledger returned data outside the requested scope");
            ValidateAmount(invoice.Amount);
            if (string.IsNullOrWhiteSpace(invoice.InvoiceId) || !ledger.TryAdd(invoice.InvoiceId, invoice))
                throw new InvalidDataException("Invalid or duplicate invoice ID");
            if (invoice.Status is not ("OPEN" or "PARTIAL"))
                throw new InvalidDataException("Ledger returned a non-open invoice");
            if (invoice.DueDate > asOf) throw new InvalidDataException("Ledger returned a future invoice");
        }
        var seen = new HashSet<string>(StringComparer.Ordinal);
        var amounts = new Dictionary<string, decimal>(StringComparer.Ordinal);
        foreach (var payment in payments)
        {
            if (string.IsNullOrWhiteSpace(payment.TransactionId) || !seen.Add(payment.TransactionId))
                throw new InvalidDataException("Invalid or duplicate bank transaction ID");
            ValidateAmount(payment.Amount);
            if (payment.CompanyCode != companyCode || payment.Currency != currency)
                throw new InvalidDataException("Bank statement contains another company or currency");
            if (string.IsNullOrWhiteSpace(payment.InvoiceId)) throw new InvalidDataException("Missing invoice reference");
            if (payment.ValueDate > asOf) continue;
            amounts[payment.InvoiceId] = amounts.GetValueOrDefault(payment.InvoiceId) + payment.Amount;
        }
        var lines = new List<ReconciliationLine>();
        foreach (var id in ledger.Keys.Union(amounts.Keys).Order(StringComparer.Ordinal))
        {
            var expected = ledger.TryGetValue(id, out var invoice) ? invoice.Amount : 0m;
            var received = amounts.GetValueOrDefault(id);
            var difference = expected - received;
            var outcome = invoice is null ? "UNMATCHED_BANK"
                : Math.Abs(difference) <= tolerance ? "MATCHED"
                : received == 0 ? "MISSING_PAYMENT"
                : difference > 0 ? "UNDERPAID" : "OVERPAID";
            lines.Add(new(id, expected, received, difference, outcome));
        }
        return new(companyCode, currency, asOf, lines, lines.Sum(x => x.Expected),
            lines.Sum(x => x.Received), lines.Sum(x => x.Difference), lines.Count(x => x.Outcome != "MATCHED"));
    }
    public static void ValidateAmount(decimal amount)
    {
        if (amount <= 0 || amount > 9999999999999.99m || decimal.Round(amount, 2) != amount)
            throw new InvalidDataException("Amounts must be positive, bounded, and have at most two decimal places");
    }
}
