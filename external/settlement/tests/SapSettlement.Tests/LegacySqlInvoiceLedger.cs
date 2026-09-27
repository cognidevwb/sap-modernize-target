using System.Data;
using System.Data.Common;
using System.Globalization;
using SapSettlement.Contracts;
using SapSettlement.Domain;

namespace SapSettlement.Connectors;

/// <summary>Legacy direct database boundary. Queries a reconciled SAP extract, never writes SAP tables.</summary>
public sealed class SqlInvoiceLedger(Func<DbConnection> connectionFactory) : IInvoiceLedger
{
    public async Task<IReadOnlyList<LedgerInvoice>> ReadOpenAsync(string companyCode, string currency,
        DateOnly asOf, CancellationToken cancellationToken)
    {
        Reconciler.ValidateScope(companyCode, currency);
        await using var connection = connectionFactory();
        await connection.OpenAsync(cancellationToken);
        await using var command = connection.CreateCommand();
        command.CommandTimeout = 30;
        command.CommandText = """
            SELECT invoice_id, company_code, currency, amount_minor, due_date, status
            FROM sap_invoice_extract
            WHERE company_code = @company AND currency = @currency
              AND due_date <= @asOf AND status IN ('OPEN', 'PARTIAL')
            ORDER BY invoice_id
            """;
        Add(command, "@company", companyCode);
        Add(command, "@currency", currency);
        Add(command, "@asOf", asOf.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture));
        var rows = new List<LedgerInvoice>();
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            if (rows.Count >= 100000) throw new InvalidDataException("Ledger requires partitioning above 100000 invoices");
            rows.Add(new(reader.GetString(0), reader.GetString(1), reader.GetString(2),
                reader.GetInt64(3) / 100m, DateOnly.ParseExact(reader.GetString(4), "yyyy-MM-dd", CultureInfo.InvariantCulture), reader.GetString(5)));
        }
        return rows;
    }
    private static void Add(DbCommand command, string name, string value)
    {
        var parameter = command.CreateParameter();
        parameter.ParameterName = name;
        parameter.DbType = DbType.String;
        parameter.Value = value;
        command.Parameters.Add(parameter);
    }
}
