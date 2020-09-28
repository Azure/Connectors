# Bed Time Reminder Durable Function App

This directory contains samples of Azure Functions that use Microsoft Teams and Office 365 Outlook to view my upcoming events and post a notification to Teams 10 hours before my earliest meeting every day (using an Azure Functions Durable Orchestration).

## Required connectors
- Microsoft Teams
- Office 365 Outlook

## Run the sample
To get started, navigate to the `typescript` directory. Then, generate connection strings for your Teams connection and Office 365 Outlook connection. In `local.settings.json`, add those connection strings as values to `<API_CONNECTION_CONNECTION_STRING>`. The function app will now be able to reference these values as environment variables.

Next, replace `<AZURE_STORAGE_CONNECTION_STRING>` with a valid connection string to an Azure Storage account. This is required to use Durable Functions.

You should also replace the values for `TEAMS_TEAM` and `TEAMS_CHANNEL` to match a Teams team name and channel name that you have.

Open a new VS Code window from the `typescript` folder and press `F5` to begin debugging.