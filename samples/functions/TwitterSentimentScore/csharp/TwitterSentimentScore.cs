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
using Microsoft.Azure.Connectors.Twitter;
using Microsoft.Azure.Connectors.CognitiveServicesTextAnalytics;
using Microsoft.Azure.Connectors.CognitiveServicesTextAnalytics.Models;

namespace Company.Function
{
    public static class TwitterSentimentScore
    {
        [FunctionName("TwitterSentimentScore")]
        public static async Task<IActionResult> Run(
            [HttpTrigger(AuthorizationLevel.Anonymous, "get", "post", Route = null)] HttpRequest req,
            ILogger log)
        {
           var twitter = TwitterConnector.CreateTwitterConnector("");
           var twitterTimeLine = await twitter.HomeTimelineAsync();

            var cognitiveTextAnalyticsService = CognitiveServicesTextAnalyticsConnector.CreateCognitiveServicesTextAnalyticsConnector("");
            var sentimentScore = await cognitiveTextAnalyticsService.Sentiment.DetectSentimentV2Async(new MultiLanguageInput { Language = "en", Text = twitterTimeLine.First().TweetText });

            return new OkObjectResult(sentimentScore);
        }   
    }
}
