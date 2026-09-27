namespace SapSettlement.Contracts;

public sealed record LedgerInvoice(string InvoiceId, string CompanyCode, string Currency,
    decimal Amount, DateOnly DueDate, string Status);
public sealed record BankPayment(string TransactionId, string InvoiceId, string CompanyCode,
    string Currency, decimal Amount, DateOnly ValueDate);
public interface IInvoiceLedger
{
    Task<IReadOnlyList<LedgerInvoice>> ReadOpenAsync(string companyCode, string currency,
        DateOnly asOf, CancellationToken cancellationToken);
}
public sealed record ReconciliationLine(string InvoiceId, decimal Expected, decimal Received,
    decimal Difference, string Outcome);
public sealed record ReconciliationReport(string CompanyCode, string Currency, DateOnly AsOf,
    IReadOnlyList<ReconciliationLine> Lines, decimal ExpectedTotal, decimal ReceivedTotal,
    decimal DifferenceTotal, int ExceptionCount);
