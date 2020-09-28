# Send Email To CDS Contacts Function App

This directory contains samples of Azure Function Apps that uses contacts from CDS to send emails to

## Required connectors
- CommonDataService
- Outlook

## Run the sample
To get started, navigate to the `csharp` or . Then, generate connection strings for your Outlook connection and CommonDataService connection. In `local.settings.json`, add those connection strings as values to `OUTLOOK_CONNECTION` and `CDS_CONNECTION`. The function app will now be able to reference these values as environment variables.

Open a new VS Code window from either the `csharp` and press `F5` to begin debugging.