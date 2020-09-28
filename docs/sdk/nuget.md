## Nuget Package(s)

### One-Time Machine Setup
A one-time setup must be performed to store the Azure GitHub nuget package registry as source
- [Create GitHub Personal Access Token(PAT)](https://docs.github.com/en/github/authenticating-to-github/creating-a-personal-access-token)
    - enable **read:packages** permission
- Locally run command 
    > dotnet nuget add source https://nuget.pkg.github.com/Azure/index.json --name AzureGPR --username **<GitHubUserName>** --password **<GitHubPAT>** --store-password-in-clear-text

### Install package
install single connector

> dotnet add package Azure.Connectors.MicrosoftTeams --version 0.0.2-alpha

> dotnet add package Azure.Connectors.TextAnalytics --version 0.0.2-alpha

### Usage
```csharp
using Azure.Connectors.MicrosoftTeams;
using Azure.Connectors.TextAnalytics;

var teamsConnector = MicrosoftTeamsConnector.Create("");
var teams = await teamsConnector.GetAllTeamsAsync();
var team = teams.Value.FirstOrDefault(t => t.DisplayName.Equals("My Group Name"));
var channels = await teamsConnector.GetChannelsForGroupAsync(team.Id);
var channel = channels.Value.FirstOrDefault(c => c.DisplayName.Equals("Channel Name"));

var messages = await teamsConnector.GetMessagesFromChannelAsync(team.Id, channel.Id);
var lastMessage = messages.Value.First();

var cognitiveTextAnalyticsService = TextAnalyticsConnector.Create("");
var sentimentScore = await cognitiveTextAnalyticsService.Sentiment.DetectSentimentV2Async(new MultiLanguageInput { Language = "en", Text = lastMessage.Body.Content });
Console.WriteLine(sentimentScore)

```