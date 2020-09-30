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

To install a connector SDK from our private GitHub package repository, you must make some changes to your `package.json`. These steps are all due to limitations during private preview. See a complete example [here](https://github.com/Azure/Connectors/blob/preview/samples/azuredurablefunctions/bedTimeReminder/typescript/package.json).

#### 1. Add @azure dependencies to package.json
Add the following @azure packages to your package.json as dependencies. 

```json
"dependencies": {
  "@azure/identity": "^1.1.0",
  "@azure/ms-rest-js": "^2.0.8",
  "@azure/ms-rest-azure-js": "2.0.1"
}
```

#### 2. Install connector via `postinstall` script
Add a postinstall script that will install the connector package whenever you run `npm install` on your project ([learn about postinstall scripts here](https://docs.npmjs.com/misc/scripts)).

```json
"scripts": {
  "postinstall": "npm i @azure/microsoftteams-connector --registry https://npm.pkg.github.com/Azure --save-optional"
}
```

#### 3. Run `npm install`

### Usage
```typescript
import { createMicrosoftTeamsConnector } from "@azure/microsoftteams-connector"

const getTeams = async function (): Promise<void> {
    const teamsClient = await createMicrosoftTeamsConnector("<ConnectionStringFromVSCodeExtension>");
    const myTeams = await teamsClient.getAllTeams();
    console.log(myTeams);
}
```