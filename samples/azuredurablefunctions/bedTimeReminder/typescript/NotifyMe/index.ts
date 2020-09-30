import { AzureFunction, Context } from "@azure/functions"
import { createMicrosoftTeamsConnector } from "@azure/microsoftteams-connector"
import { EarliestEvents, toLocalTime } from "../common"

const activityFunction: AzureFunction = async function (context: Context): Promise<void> {
    validateEnvironment("TEAMS_CONNECTION");
    validateEnvironment("TEAMS_TEAM");
    validateEnvironment("TEAMS_CHANNEL");
    const { earliestEvent, earliestAcceptedEvent }: EarliestEvents = context.bindings.events;
        // Post message to teams
        const teamsClient = await createMicrosoftTeamsConnector(process.env.TEAMS_CONNECTION);
        const team = (await teamsClient.getAllTeams()).value.filter((teams) => { return teams.displayName == process.env.TEAMS_TEAM})[0];
        const channel = (await teamsClient.getChannelsForGroup(team.id)).value.filter((channel) => { return channel.displayName == process.env.TEAMS_CHANNEL })[0];
        await teamsClient.postMessageToChannelV3(team.id, channel.id, {
            body: {
                content: `
                Your earliest meeting is in 10 hours at ${toLocalTime(earliestEvent.start).format('LT')}: <i>${earliestEvent.subject}</i>.
                <br>
                Your earliest <b>accepted</b> meeting is at ${toLocalTime(earliestAcceptedEvent.start).format('LT')}: <i>${earliestAcceptedEvent.subject}</i>.
                `,
                contentType: "html"
            },
            subject: `Go to sleep! (Schedule for ${toLocalTime(earliestEvent.start).format('dddd')})`
        })
};

const validateEnvironment = function (variableName) {
    if (!process.env[variableName]) {
        throw new Error(`The environment variable '${variableName}' is missing or empty. Add to local.settings.json or App Settings.`);
    }
}

export default activityFunction;
