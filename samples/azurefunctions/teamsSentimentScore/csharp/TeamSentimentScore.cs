using System;
using System.IO;
using System.Linq;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.WebJobs;
using Microsoft.Azure.WebJobs.Extensions.Http;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json;

// *******One-Time Setup*********
// Add Azure GitHub Organization as a source to nuget.config by following instructions below:
// Follow instructions here to genereate GitHub personal access token (PAT) with "read:packages" permissions
// https://docs.github.com/en/github/authenticating-to-github/creating-a-personal-access-token
// Once you have the PAT handy, run command "dotnet nuget add source https://nuget.pkg.github.com/Azure/index.json --name AzureGPR --username --password <PAT> --store-password-in-clear-text"
// At this point you can start adding connectors packages by running "dotnet add package Azure.Connectors.MicrosoftTeams --version 0.0.1-alpha"
// For complete list of nuget packages available see https://github.com/Azure/Connectors/packages?ecosystem=nuget
//*******************************

using Azure.Connectors.MicrosoftTeams;
using Azure.Connectors.TextAnalytics;
using Azure.Connectors.TextAnalytics.Models;

using Microsoft.Rest.TransientFaultHandling;
using Microsoft.Rest.Azure;

namespace Company.Function
{
    public static class TeamSentimentScore
    {
        [FunctionName("TeamsSentimentScore")]
        public static async Task<IActionResult> Run(
            [HttpTrigger(AuthorizationLevel.Anonymous, "get", "post", Route = null)] HttpRequest req,
            ILogger log)
        {
            // Replace with your connection string for MicrosoftTeams
            var teamsConnector = MicrosoftTeamsConnector.Create("endpoint=https://97c6f8d1f86b613f.16.common.logic-df.azure-apihub.net/apim/teams/4b7602b5639c4327b6b54155e2b9056c;auth=managed");

            // Add resiliency to outbound calls
            // For retry policy documentation see 
            // https://docs.microsoft.com/en-us/dotnet/api/microsoft.rest.transientfaulthandling?view=azure-dotnet
            var retryStrategy = new FixedIntervalRetryStrategy(Int32.MaxValue, TimeSpan.FromTicks(1));
            var retryPolicy = new RetryPolicy(new HttpStatusCodeErrorDetectionStrategy(), retryStrategy);
            teamsConnector.SetRetryPolicy(retryPolicy);

            var teams = await teamsConnector.GetAllTeamsAsync();
            var team = teams.Value.FirstOrDefault(t => t.DisplayName.Equals("Azure Connectors Test"));
            var channels = await teamsConnector.GetChannelsForGroupAsync(team.Id);
            var channel = channels.Value.FirstOrDefault(c => c.DisplayName.Equals("General"));

            string lastMessage = string.Empty;
            try {
                var messages = await teamsConnector.GetMessagesFromChannelAsync(team.Id, channel.Id);
                lastMessage = messages.First().Body.Content;

                // Paging - Some of the operations might need paging 
                // Example in the above case
                //    if(messages.NextPageLink != null)
                //      var  moreMessages = await teamsConnector.GetMessagesFromChannelNextAsync(messages.NextPageLink);
            } catch(CloudException cloudException) {
               // provide below information when reporting runtime issues 
               // "x-ms-client-request-id", RequestUri and Method
               var requestUri = cloudException.Request.RequestUri.ToString();
               var clientRequestId = cloudException.Request.Headers["x-ms-client-request-id"].First();

               var statusCode = cloudException.Response.StatusCode.ToString();
               var reasonPhrase = cloudException.Response.ReasonPhrase;
               log.LogError("RequestUri '{0}' ClientRequestId '{1}' StatusCode '{2}' ReasonPhrase '{3}'", 
                    requestUri, clientRequestId, statusCode, reasonPhrase);

               throw cloudException;
            }
           
            // Replace with your connection string for TextAnalytics
            var cognitiveTextAnalyticsService = TextAnalyticsConnector.Create("endpoint=https://97c6f8d1f86b613f.16.common.logic-df.azure-apihub.net/apim/cognitiveservicestextanalytics/2e86dc92995f4dca8ca4e6c685c26847;auth=managed");
            cognitiveTextAnalyticsService.SetRetryPolicy(new RetryPolicy<HttpStatusCodeErrorDetectionStrategy>(3));

            var sentimentScore = await cognitiveTextAnalyticsService.Sentiment.DetectSentimentV2Async(new MultiLanguageInput { Language = "en", Text = lastMessage });

            return new OkObjectResult(sentimentScore);
        }
    }
}
