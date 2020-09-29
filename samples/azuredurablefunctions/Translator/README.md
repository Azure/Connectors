# Translator Durable Function App

This directory contains samples of Azure Functions that use Translator to translate (using an Azure Functions Durable Orchestration).

## Required connectors
- TranslatorV2

## Run the sample
To get started, navigate to the `csharp` directory. Then, generate connection strings for your Translator connection connection. In `local.settings.json`, add those connection strings as values to `<API_CONNECTION_CONNECTION_STRING>`. The function app will now be able to reference these values as environment variables.

Next, replace `<AZURE_STORAGE_CONNECTION_STRING>` with a valid connection string to an Azure Storage account. This is required to use Durable Functions.

Open a new VS Code window from the `csharp` folder and press `F5` to begin debugging.