## NPM Instructions

### One-Time Machine Setup
A one-time setup must be performed to store the Azure GitHub npm package registry as source.

1. [Create GitHub Personal Access Token(PAT)](https://docs.github.com/en/github/authenticating-to-github/creating-a-personal-access-token)
    - enable **read:packages** and **repo** permission
2. Authenticate by logging in to npm using the `npm login` command. When prompted, enter your GitHub username for `Username`, your personal access token for `Password`, and your public email address for `Email`:
```
$ npm login --registry=https://npm.pkg.github.com
Username: <USERNAME>
Password: <TOKEN>
Email: <PUBLIC-EMAIL-ADDRESS>
```

### Install package

First, create an `.npmrc` file in the same directory as your `package.json`. This file should contain the following contents:
```
registry=https://npm.pkg.github.com/Azure
```

Then, install connector:

> npm install @azure/microsoftteams-connector

### Usage
```typescript
import { createMicrosoftTeamsConnector } from "@azure/microsoftteams-connector"

const getTeams = async function (): Promise<void> {
    const teamsClient = await createMicrosoftTeamsConnector("<ConnectionStringFromVSCodeExtension>");
    const myTeams = await teamsClient.getAllTeams();
    console.log(myTeams);
}
```