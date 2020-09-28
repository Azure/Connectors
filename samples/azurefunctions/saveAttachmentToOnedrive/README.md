# Save Attachment To OneDrive Function App

This directory contains samples of Azure Function Apps that saves the email attachment to OneDrive

## Required connectors
- OneDrive
- Outlook

## Run the sample
To get started, navigate to the `csharp` or . Then, generate connection strings for your Outlook and OneDrive connection in `local.settings.json`, add those connection strings as values to `OUTLOOK_CONNECTION` and `ONEDRIVE_CONNECTION`. The function app will now be able to reference these values as environment variables.

Open a new VS Code window from either the `csharp` and press `F5` to begin debugging.