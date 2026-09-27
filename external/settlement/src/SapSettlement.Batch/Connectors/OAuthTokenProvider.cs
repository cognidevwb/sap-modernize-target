using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;

namespace SapSettlement.Connectors;

public sealed class OAuthTokenProvider(HttpClient client, Uri endpoint, string clientId, string clientSecret) : IDisposable
{
    private readonly SemaphoreSlim mutex = new(1, 1);
    private string? cached;
    private DateTimeOffset expiresAt;
    public async Task<string> GetAsync(CancellationToken token)
    {
        if (endpoint.Scheme != "https" || !string.IsNullOrEmpty(endpoint.UserInfo)
            || !string.IsNullOrEmpty(endpoint.Query) || !string.IsNullOrEmpty(endpoint.Fragment))
            throw new ArgumentException("OAuth token endpoint must be HTTPS without embedded credentials");
        if (string.IsNullOrWhiteSpace(clientId) || string.IsNullOrWhiteSpace(clientSecret))
            throw new ArgumentException("OAuth client credentials are required");
        await mutex.WaitAsync(token);
        try
        {
            if (cached is not null && expiresAt > DateTimeOffset.UtcNow.AddSeconds(30)) return cached;
            using var request = new HttpRequestMessage(HttpMethod.Post, endpoint);
            request.Headers.Authorization = new AuthenticationHeaderValue("Basic",
                Convert.ToBase64String(Encoding.UTF8.GetBytes($"{Uri.EscapeDataString(clientId)}:{Uri.EscapeDataString(clientSecret)}")));
            request.Content = new FormUrlEncodedContent(new Dictionary<string, string> { ["grant_type"] = "client_credentials" });
            using var response = await client.SendAsync(request, token);
            response.EnsureSuccessStatusCode();
            var bytes = await response.Content.ReadAsByteArrayAsync(token);
            if (bytes.Length > 100000) throw new InvalidDataException("OAuth response exceeds limit");
            using var document = JsonDocument.Parse(bytes);
            var body = document.RootElement;
            var result = body.GetProperty("access_token").GetString();
            if (string.IsNullOrWhiteSpace(result) || !string.Equals(body.GetProperty("token_type").GetString(), "Bearer", StringComparison.OrdinalIgnoreCase))
                throw new InvalidDataException("OAuth response does not contain a bearer token");
            var seconds = body.GetProperty("expires_in").GetInt32();
            if (seconds <= 30 || seconds > 86400) throw new InvalidDataException("OAuth token lifetime is outside the supported range");
            cached = result; expiresAt = DateTimeOffset.UtcNow.AddSeconds(seconds);
            return result;
        }
        finally { mutex.Release(); }
    }
    public void Dispose() => mutex.Dispose();
}
