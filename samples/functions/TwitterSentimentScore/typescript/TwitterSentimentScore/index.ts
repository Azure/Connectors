import { AzureFunction, Context, HttpRequest } from "@azure/functions"
import { createTwitterConnector  } from "@easyapis/easyapis-twitter"
import { createCognitiveServicesTextAnalyticsConnector  } from "@easyapis/easyapis-cognitiveservicestextanalytics"
import { MultiLanguageInput  } from "@easyapis/easyapis-cognitiveservicestextanalytics/src/models"

const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
    
    const twitter = await createTwitterConnector("");
    const homeTimeline = await twitter.homeTimeline();

    const cognitveTextAnalyticsService = await createCognitiveServicesTextAnalyticsConnector("");
    const sentiScore = await cognitveTextAnalyticsService.sentiment.detectSentimentV2(
        <MultiLanguageInput>{ language: "en", text: homeTimeline[0].tweetText})


    context.res = {
        body: sentiScore
    };

};

export default httpTrigger;