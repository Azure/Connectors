import { AzureFunction, Context, HttpRequest } from "@azure/functions"
import { createTwitterConnector  } from "@azure/connectors-twitter"
import { createTextAnalyticsConnector  } from "@azure/connectors-textanalytics"
import { MultiLanguageInput  } from "@azure/connectors-textanalytics/src/models"

const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
    
    const twitter = await createTwitterConnector(process.env.TWITTER_CONNECTION);
    const homeTimeline = await twitter.homeTimeline();

    const textanalytics = await createTextAnalyticsConnector(process.env.TEXT_ANALYTICS_CONNECTION);
    const sentiScore = await textanalytics.sentiment.detectSentimentV2(
        <MultiLanguageInput>{ language: "en", text: homeTimeline[0].tweetText})


    context.res = {
        body: sentiScore
    };

};

export default httpTrigger;