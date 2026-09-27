using System.Globalization;
using Microsoft.VisualBasic.FileIO;
using SapSettlement.Contracts;
using SapSettlement.Domain;

namespace SapSettlement.Connectors;

public static class BankCsvReader
{
    private static readonly string[] Header = ["transactionId", "invoiceId", "companyCode", "currency", "amount", "valueDate"];
    public static IReadOnlyList<BankPayment> Read(TextReader input)
    {
        using var parser = new TextFieldParser(input) { TextFieldType = FieldType.Delimited,
            HasFieldsEnclosedInQuotes = true, TrimWhiteSpace = false };
        parser.SetDelimiters(",");
        if (!(parser.ReadFields() ?? []).SequenceEqual(Header))
            throw new InvalidDataException("Bank CSV header does not match the settlement contract");
        var rows = new List<BankPayment>();
        while (!parser.EndOfData)
        {
            if (rows.Count >= 100000) throw new InvalidDataException("Bank statement exceeds 100000 rows");
            var fields = parser.ReadFields() ?? [];
            if (fields.Length != Header.Length || fields.Any(string.IsNullOrWhiteSpace))
                throw new InvalidDataException("Invalid bank CSV record");
            if (!decimal.TryParse(fields[4], NumberStyles.AllowDecimalPoint, CultureInfo.InvariantCulture, out var amount)
                || !DateOnly.TryParseExact(fields[5], "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var date))
                throw new InvalidDataException("Invalid bank amount or ISO date");
            Reconciler.ValidateAmount(amount);
            Reconciler.ValidateScope(fields[2], fields[3]);
            rows.Add(new(fields[0], fields[1], fields[2], fields[3], amount, date));
        }
        return rows;
    }
}
