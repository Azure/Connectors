using System.Collections.Generic;
using System.Net.Http;
using System.Threading.Tasks;
using Microsoft.Azure.WebJobs;
using Microsoft.Azure.WebJobs.Extensions.DurableTask;
using Microsoft.Azure.WebJobs.Extensions.Http;
using Microsoft.Extensions.Logging;
using Azure.Connectors.MicrosoftTranslatorV2;
using Azure.Connectors.MicrosoftTranslatorV2.Models;

namespace Company.Function
{
    public static class TranslatorOrchestration
    {
        [FunctionName("TranslatorOrchestration")]
        public static async Task<List<string>> RunOrchestrator(
            [OrchestrationTrigger] IDurableOrchestrationContext context)
        {
            var outputs = new List<string>();

            // Replace "hello" with the name of your Durable Activity Function.
            // Replace "es" (Spanish) with the language code you want to use for translation (e.g. "de" for German, "fr" for French, and "ru" for Russian)
            outputs.Add(await context.CallActivityAsync<string>("TranslatorOrchestration_Hello", new TranslationInfo("es", "Tokyo")));
            outputs.Add(await context.CallActivityAsync<string>("TranslatorOrchestration_Hello", new TranslationInfo("es", "Seattle")));
            outputs.Add(await context.CallActivityAsync<string>("TranslatorOrchestration_Hello", new TranslationInfo("es", "London")));

            // returns ["Hola Tokio", "Hola Seattle", "Hola Londres"]
            return outputs;
        }

        [FunctionName("TranslatorOrchestration_Hello")]
        public static async Task<string> SayHello([ActivityTrigger] TranslationInfo info, ILogger log)
        {
            MicrosoftTranslatorV2Connector translator = MicrosoftTranslatorV2Connector.Create("<Connector connection string>");
            string translatedText = await translator.MicrosoftTranslator.TranslateAsync(info.LanguageCode, new TextBody { Text = $"Hello {info.Name}"}); 

            log.LogInformation($"Saying hello to {info.Name}.");
            return translatedText;
        }

        [FunctionName("TranslatorOrchestration_HttpStart")]
        public static async Task<HttpResponseMessage> HttpStart(
            [HttpTrigger(AuthorizationLevel.Anonymous, "get", "post")] HttpRequestMessage req,
            [DurableClient] IDurableOrchestrationClient starter,
            ILogger log)
        {
            // Function input comes from the request content.
            string instanceId = await starter.StartNewAsync("TranslatorOrchestration", null);

            log.LogInformation($"Started orchestration with ID = '{instanceId}'.");

            return starter.CreateCheckStatusResponse(req, instanceId);
        }

        public readonly struct TranslationInfo{
            public TranslationInfo(string languageCode, string name){
                LanguageCode = languageCode;
                Name = name;
            }
            public string LanguageCode { get; }
            public string Name { get; }
        }
    }
}