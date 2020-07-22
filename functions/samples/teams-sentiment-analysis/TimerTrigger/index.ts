import { AzureFunction, Context } from "@azure/functions"
import { MicrosoftTeamsConnector, DropboxConnector, OutlookConnector, TextAnalyticsConnector } from "azure-connectors"
import { MultiLanguageInput, SentimentResult } from "azure-connectors/dist/src/cognitiveservicestextanalytics/Models"
import { GetMessagesFromChannelResponse } from "azure-connectors/dist/src/teams/Responses"
import { ClientSendMessage } from "azure-connectors/dist/src/outlook/Models"


const timerTrigger: AzureFunction = async function (context: Context, myTimer: any): Promise<void> {

    // Construct the connector objects we need, using the connection string provided by the Azure Connectors VSCode extension
    const teamsConnector = new MicrosoftTeamsConnector(process.env["MicrosoftTeamsConnection"])
    const dropboxConnector = new DropboxConnector(process.env["DropboxConnection"])
    const outlookConnector = new OutlookConnector(process.env["OutlookConnection"])
    const textAnalyticsConnector = new TextAnalyticsConnector(process.env["TextAnalyticsConnection"])

    // Use the SDK to find the IDs of the teams group and channel to read from
    const teams = await teamsConnector.getAllTeams()
    const teamId = teams.value.find(team => team.displayName === "azure connectors test").id
    const channels = await teamsConnector.getChannelsForGroup(teamId)
    const channelId = channels.value.find(channel => channel.displayName === "test").id

    // Check for new messages in the chat, using dropbox to store the chat history
    const newMessages: string = await getNewMessages(teamsConnector, dropboxConnector, teamId, channelId)

    if (newMessages !== "") {
        // Detect the sentiment of the new messages (happy, angry, or neutral)
        const languageInput: MultiLanguageInput = {
            text: newMessages,
            language: "en"
        }
        const sentiment: SentimentResult = await textAnalyticsConnector.detectSentiment(languageInput)
        // Create new messages mood based on the sentiment score
        let newMessagesMood = "neutral"
        if (sentiment.score > 0.7) {
            newMessagesMood = "happy"
        } else if (sentiment.score < 0.3) {
            newMessagesMood = "angry"
        }
        // Send an email to notify the observer of the mood of the latest messages
        const emailMessage: ClientSendMessage = {
            to: "t-luludl@microsoft.com",
            subject: `people are ${newMessagesMood}`,
            body: newMessages
        }
        await outlookConnector.sendEmail(emailMessage)
    }
};

const getFullChatHistory = async function (teamsConnector: MicrosoftTeamsConnector, groupId: string, channelId: string): Promise<string> {
    const teamsMessages: GetMessagesFromChannelResponse = await teamsConnector.getMessagesFromChannel(groupId, channelId)
    let fullChatHistory = ""
    teamsMessages.value.forEach((message) => {
        const text: string = (<any>message).body.content
        fullChatHistory += ` ${text} `
    })
    return Promise.resolve(fullChatHistory)
}

const getStoredMessages = async function (dropboxConnector: DropboxConnector): Promise<string> {
    const getFileContentResponse = await dropboxConnector.getFileContent("azure-connectors-proof-of-concept.txt", true)
    const currentFileContent = getFileContentResponse._response.bodyAsText.replace(/\"/g, "")
    return Promise.resolve(currentFileContent)
}

const getNewMessages = async function (teamsConnector: MicrosoftTeamsConnector, dropboxConnector: DropboxConnector, groupId: string, channelId: string): Promise<string> {
    const allMessages: string = await getFullChatHistory(teamsConnector, groupId, channelId)
    const storedMessages: string = await getStoredMessages(dropboxConnector)
    const newMessages: string = allMessages.replace(storedMessages, "")
    await dropboxConnector.updateFile(allMessages, "azure-connectors-proof-of-concept.txt")
    return newMessages;
}

export default timerTrigger;
