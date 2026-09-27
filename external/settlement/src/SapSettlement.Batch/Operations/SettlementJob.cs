using SapSettlement.Contracts;
using SapSettlement.Connectors;
using SapSettlement.Domain;

namespace SapSettlement.Operations;

public sealed class SettlementJob(IInvoiceLedger ledger)
{
    public async Task<ReconciliationReport> RunAsync(string companyCode, string currency, DateOnly asOf,
        TextReader bankStatement, CancellationToken token)
    {
        token.ThrowIfCancellationRequested();
        Reconciler.ValidateScope(companyCode, currency);
        var payments = BankCsvReader.Read(bankStatement);
        var invoices = await ledger.ReadOpenAsync(companyCode, currency, asOf, token);
        token.ThrowIfCancellationRequested();
        return Reconciler.Run(companyCode, currency, asOf, invoices, payments);
    }
}
