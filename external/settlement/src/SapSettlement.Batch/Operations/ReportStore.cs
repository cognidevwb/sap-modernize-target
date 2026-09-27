using System.Security.Cryptography;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Globalization;
using SapSettlement.Contracts;

namespace SapSettlement.Operations;

public static class ReportStore
{
    private static readonly JsonSerializerOptions Options = new() { WriteIndented = true, PropertyNamingPolicy = JsonNamingPolicy.CamelCase, Converters = { new MoneyConverter() } };
    private sealed class MoneyConverter : JsonConverter<decimal>
    {
        public override decimal Read(ref Utf8JsonReader reader, Type type, JsonSerializerOptions options) => reader.GetDecimal();
        public override void Write(Utf8JsonWriter writer, decimal value, JsonSerializerOptions options)
            => writer.WriteRawValue(value.ToString("0.00", CultureInfo.InvariantCulture));
    }
    /// <summary>Content-addressed output: retry writes the same immutable report and cannot overwrite a differing report.</summary>
    public static async Task<string> SaveAsync(string directory, ReconciliationReport report, CancellationToken token)
    {
        Directory.CreateDirectory(directory);
        var bytes = JsonSerializer.SerializeToUtf8Bytes(report, Options);
        var digest = Convert.ToHexStringLower(SHA256.HashData(bytes));
        var destination = Path.Combine(directory, $"settlement-{report.CompanyCode}-{report.AsOf:yyyyMMdd}-{digest}.json");
        var temporary = Path.Combine(directory, $".{Guid.NewGuid():N}.tmp");
        try
        {
            await File.WriteAllBytesAsync(temporary, bytes, token);
            try { File.Move(temporary, destination, overwrite: false); }
            catch (IOException) when (File.Exists(destination))
            {
                if (!(await File.ReadAllBytesAsync(destination, token)).SequenceEqual(bytes))
                    throw new InvalidDataException("Existing report does not match its content digest");
            }
            return destination;
        }
        finally { if (File.Exists(temporary)) File.Delete(temporary); }
    }
}
