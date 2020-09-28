import { AzureFunction, Context, HttpRequest } from "@azure/functions"
import { createMicrosoftTeamsConnector } from "@azure/microsoftteams-connector"
import { validateEnvironment } from "../common"
import * as meme from "themememaker"

const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
    // Validate neede environment variables
    validateEnvironment("TEAMS_CONNECTION");
    validateEnvironment("TEAMS_TEAM_NAME");
    validateEnvironment("TEAMS_CHANNEL_NAME");
    
    // Get values with defaults
    const topText = req.query.topText || "I see...";
    const bottomText = req.query.bottomText || "Memes";
    const memeName = req.query.memeName || "buzz";
    context.log(`Generating meme: '${memeName}'. Top text: '${topText}'. Bottom text: '${bottomText}'`)
    
    // Use meme generating library: https://www.npmjs.com/package/themememaker
    const data = await meme.make(memeName, topText, bottomText);
    
    // Get Team's team and channel name (matching environment variable)
    context.log(`Searching for Teams team '${process.env.TEAMS_TEAM_NAME}'`);
    const teamsClient = await createMicrosoftTeamsConnector(process.env.TEAMS_CONNECTION);
    const team = (await teamsClient.getAllTeams()).value.filter((team => {
        return team.displayName == process.env.TEAMS_TEAM_NAME
    }))[0];
    context.log(`Searching for Teams channel '${process.env.TEAMS_CHANNEL_NAME}'`);
    const channel = (await teamsClient.getChannelsForGroup(team.id)).value.filter((channel => {
        return channel.displayName == process.env.TEAMS_CHANNEL_NAME
    }))[0];

    // Post meme to Teams
    context.log(`Posting meme to channel`);
    teamsClient.postMessageToChannelV3(team.id, channel.id, {
        body: {
            content: `<img src="${data.response}"/>`,
            contentType: "html"
        }
    })
    
    // Return meme in HTTP response
    context.res = {
        // status: 200, /* Defaults to 200 */
        body:  `<img src="${data.response}"/>`,
        headers: {
            "content-type": "text/html"
        }
    };
};

export default httpTrigger;