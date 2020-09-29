# Azure Blob Paging Function App

This directory contains samples of Azure Function Apps that retrieves container names from Azure Blob Storage and creates a list of them in a file. This sample demostrates paging. 

## Required connectors
- AzureBlobStorage

## Run the sample
To get started, navigate to the `csharp` or . Then, generate connection strings for your Azure Blob Storage connection in `local.settings.json`, add those connection strings as values to `AZUREBLOB_CONNECTION`. The function app will now be able to reference these values as environment variables.

Open a new VS Code window from either the `csharp` and press `F5` to begin debugging.