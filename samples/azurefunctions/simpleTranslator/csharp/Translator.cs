using System;
using System.IO;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.WebJobs;
using Microsoft.Azure.WebJobs.Extensions.Http;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json;

using Azure.Connectors.MicrosoftTranslatorV2;
using Azure.Connectors.MicrosoftTranslatorV2.Models;

namespace SimpleTranslator
{
    public static class Translate
    {
        // Demonstrates use of MicrosoftTranslator Connector
        [FunctionName("Translate")]
        public static async Task<IActionResult> Run(
            [HttpTrigger(AuthorizationLevel.Anonymous, "get", "post", Route = null)] HttpRequest req,
            ILogger log)
        {
            log.LogInformation("C# HTTP trigger function processed a request.");

            string text = req.Query["text"];

            string requestBody = await new StreamReader(req.Body).ReadToEndAsync();
            dynamic data = JsonConvert.DeserializeObject(requestBody);
            text = text ?? data?.text;

            if (string.IsNullOrEmpty(text))
            {
                var message = "Pass a 'text'' in the query string or in the request body for a personalized response.";
                log.LogError(message);
                return new OkObjectResult(message);
            }
            else
            {
                // Replace with your own connection to MicrosoftTranslatorV2
                var translatorConnector = MicrosoftTranslatorV2Connector.Create("Replace with MicrosoftTranslatorV2 Connection String");
                var translatedToFrench = await translatorConnector.MicrosoftTranslator.TranslateAsync("fr", new TextBody { Text = text });

                return new OkObjectResult(translatedToFrench);
            }
        }
    }
}
