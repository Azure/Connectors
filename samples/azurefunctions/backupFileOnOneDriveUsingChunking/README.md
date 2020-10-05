# Backup File on OneDrive using Chunking Function App

This directory contains samples of Azure Function Apps that downloads a large file and uploads to a different directory using chunking

## Required connectors
- OneDrive

## Run the sample
To get started, navigate to the `csharp` or . Then, generate connection strings for your OneDrive connection in `local.settings.json`, add those connection strings as values to `ONEDRIVE_CONNECTION`. Please also repalce "Documents/largefile.zip" to the large file of your liking in your onedrive.
The function app will now be able to reference these values as environment variables.

Open a new VS Code window from either the `csharp` and press `F5` to begin debugging.