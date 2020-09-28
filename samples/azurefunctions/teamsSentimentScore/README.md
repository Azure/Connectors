# Twitter Sentiment Score Function App

This directory contains samples of Azure Function Apps that use Azure Text Analytics to calculate the sentiment score of various tweets from Twitter.

## Required connectors
- Twitter
- Text Analyitcs

## Run the sample
To get started, navigate to either the `csharp` or `typescript` directory. Then, generate connection strings for your Twitter connection and Text Analytics connection. In `local.settings.json`, add those connection strings as values to `TWITTER_CONNECTION` and `TEXT_ANALYTICS_CONNECTION`. The function app will now be able to reference these values as environment variables.

Open a new VS Code window from either the `csharp` or `typescript` folder and press `F5` to begin debugging.