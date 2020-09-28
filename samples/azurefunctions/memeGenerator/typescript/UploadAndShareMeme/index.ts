import { AzureFunction, Context, HttpRequest } from "@azure/functions"
import { createMicrosoftTeamsConnector } from "@azure/microsoftteams-connector"
import { createOneDriveConnector } from "@azure/onedrive-connector"
import { validateEnvironment } from "../common"
import * as MemeLib from 'nodejs-meme-generator'

const memeGenerator = new MemeLib({
    canvasOptions: { // optional
      canvasWidth: 500,
      canvasHeight: 500
    },
    fontOptions: { // optional
      fontSize: 20,
      fontFamily: 'impact',
      lineHeight: 2
    }
});

const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
    // Validate neede environment variables
    validateEnvironment("TEAMS_CONNECTION");
    validateEnvironment("TEAMS_TEAM_NAME");
    validateEnvironment("TEAMS_CHANNEL_NAME");
    validateEnvironment("ONEDRIVE_CONNECTION");

    // Get values with defaults
    const topText = req.query.topText || "MEME";
    const bottomText = req.query.bottomText || "GENERATOR";
    const url = req.query.url || "https://i.imgur.com/7FHoSIG.png";
    context.log(`Generating meme from image: '${url}'. Top text: '${topText}'. Bottom text: '${bottomText}'`);

    // Use meme generating library: https://www.npmjs.com/package/nodejs-meme-generator
    const data = await memeGenerator.generateMeme({
        topText: topText || 'MEME',
        bottomText: bottomText || 'GENERATOR',
        url: url || 'https://i.imgur.com/7FHoSIG.png'
    });

    // Upload meme to OneDrive for Business
    context.log(`Uploading generated file to OneDrive`);
    const onedriveClient = await createOneDriveConnector(process.env.ONEDRIVE_CONNECTION);
    const creationResponse = await onedriveClient.oneDriveFileData.createFile("GeneratedMemes", `${Date.now().toString()}.png`, data);
    // Get link to share
    const shareResponse = await onedriveClient.oneDriveFileData.createShareLinkByPath(creationResponse.path, "Direct");
    context.log(`Got link to share image: ${shareResponse.webUrl}`);
    
    // Get Team's team and channel name (matching environment variable)
    context.log(`Searching for Teams team '${process.env.TEAMS_TEAM_NAME}'`);
    const teamsClient = await createMicrosoftTeamsConnector(process.env.TEAMS_CONNECTION);
    const team = (await teamsClient.getAllTeams()).value.filter((team) => {
        return team.displayName == process.env.TEAMS_TEAM_NAME
    })[0];
    context.log(`Searching for Teams channel '${process.env.TEAMS_CHANNEL_NAME}'`);
    const channel = (await teamsClient.getChannelsForGroup(team.id)).value.filter((channel) => {
        return channel.displayName == process.env.TEAMS_CHANNEL_NAME
    })[0];

    // Post message to teams channel
    context.log(`Posting meme to channel`);
    await teamsClient.postMessageToChannelV3(team.id, channel.id, {
        body: {
            content: `<img src="${shareResponse.webUrl}"/>`,
            contentType: "html"
        }
    })

    context.res = {
        // status: 200, /* Defaults to 200 */
        body:  `<img src="data:image/png;base64,${data.toString('base64')}"/>`,
        headers: {
            "content-type": "text/html"
        }
    };

};

export default httpTrigger;