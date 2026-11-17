using System.Net;
using System.Text;
using System.Text.Json;
using Microsoft.Kiota.Abstractions.Authentication;
using Microsoft.Kiota.Http.HttpClientLibrary;
using Microsoft.Kiota.Serialization.Json;
using StockSense.WebBff;
using StockSense.WebBff.Models;

using var http = new HttpClient(new SyntheticSession());
using var adapter = new HttpClientRequestAdapter(new AnonymousAuthenticationProvider(), httpClient: http);
adapter.BaseUrl = "https://synthetic.invalid";
var client = new BrowserApiClient(adapter);
var result = await client.Api.V1.Session.GetAsync();
if (result?.SubjectId != "fixture-user" || result.Retailers?.Count != 0)
    throw new InvalidDataException("Generated client did not deserialize session fixture");

using var writer = new JsonSerializationWriter();
writer.WriteObjectValue(null, new ManualReviewRequest { ExpectedInventoryVersion = "inv-2", ExpectedSupplierTermsVersion = "terms-1" });
using var document = JsonDocument.Parse(writer.GetSerializedContent());
if (document.RootElement.GetProperty("expectedInventoryVersion").GetString() != "inv-2" ||
    document.RootElement.GetProperty("expectedSupplierTermsVersion").GetString() != "terms-1")
    throw new InvalidDataException("Generated request serialization changed");
Console.WriteLine("Session request, response deserialization and review payload serialization passed.");

sealed class SyntheticSession : HttpMessageHandler
{
    protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken token)
    {
        if (request.Method != HttpMethod.Get || request.RequestUri?.AbsoluteUri != "https://synthetic.invalid/api/v1/session" ||
            !request.Headers.Accept.Any(value => value.MediaType == "application/json"))
            throw new InvalidDataException("Unexpected generated request");
        return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK) {
            Content = new StringContent("""{"subjectId":"fixture-user","retailers":[]}""", Encoding.UTF8, "application/json")
        });
    }
}
