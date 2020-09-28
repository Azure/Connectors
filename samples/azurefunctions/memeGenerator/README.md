# Meme Generating and Posting Function App

This directory contains two Azure Functions that use Microsoft Teams and OneDrive to create memes using two meme-generating Node.js libraries and then post them to Teams.

> ⚠️ The `UploadAndShareMeme` function uses a library that only works on macOS and requires Node.js version >= v10.14.1 ⚠️

## Required connectors
- Microsoft Teams
- OneDrive

## Run the sample
To get started, navigate to the `typescript` directory. Then, generate connection strings for your Teams connection and OneDrive connection. In `local.settings.json`, add those connection strings as values to `<API_CONNECTION_CONNECTION_STRING>`. The function app will now be able to reference these values as environment variables.

You should also replace the values for `TEAMS_TEAM` and `TEAMS_CHANNEL` to match a Teams team name and channel name that you have.

Open a new VS Code window from the `typescript` folder and press `F5` to begin debugging.
