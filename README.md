# Azure Connectors Early Access

**Please email your feedback/questions/suggestions @ "antr-easyapis@microsoft.com"**

### Pre-Requisites

Please send an email to **"antr-easyapis@microsoft.com"** requesting early access along with your Azure SubscriptionId. 
    

### IMPORTANT
-  The feature is only enabled in "westcentralus". Create the resource group that holds the API connections in "westcentralus".
-  Be extremely careful to not leak the API Connection secrets.
    - Try use test accounts where possible. 


### Azure Connectors VSCode Extension
-  Install Azure Connectors VSCode extension by downloading vsix from [here](https://azureconnectors.blob.core.windows.net/vscode/vscode-azureConnectors-0.1.0-alpha.vsix?sp=r&st=2020-07-22T00:33:37Z&se=2020-11-01T08:33:37Z&spr=https&sv=2019-12-12&sr=b&sig=cceKbkCIGKrpQoX3T48zjsw5FM24CuZEvk60RV4aA6s%3D)

    -  See [instructions](https://code.visualstudio.com/docs/editor/extension-gallery#_install-from-a-vsix) to install vsix for vscode.

-  Supported Features:
    1. Create API Connections for all the logic apps supported [Connectors](https://docs.microsoft.com/en-us/connectors/connector-reference/connector-reference-logicapps-connectors).
    2. Authorize API Connection
        1. OAuth consent flows for connectors like dropbox, twitter, office365 etc
        2. Specify secrets for connectors like azure storage. 
    3. Generate connection string(secret) to clipboard. Used to invoke API COnnections.
    4. Navigate to API Connections in Azure Portal. 
    5. Delete API Connection.

![Azure Connectors Extension](docs/resources/extension.gif)

### 'azure-connectors' NPM Package


    npm install azure-connectors


Currently supports over 40 widely used connectors. 

Example for Node (TypeScript)
```typescript
import { TwitterConnector } from 'azure-connectors'; 
.......
.......

// Assuming you have via vscode extension
//     Created twitter connection.
//     Authorized the connection.
//     Acquired the connection secret string.
// Installed the azure-connectors npm package.

const twitter: TwitterConnector = new TwitterConnector("<ConnectionString>");

const homeTimeline = await twitter.homeTimeline();
console.log(homeTimelineResponse[0].TweetText);

```

Example for Browser (JavaScript)
```javascript
import { TwitterConnector } from 'azure-connectors'; 
.......
.......

// Assuming you have via vscode extension
//     Created twitter connection.
//     Authorized the connection.
//     Acquired the connection secret string.
// Installed the azure-connectors npm package.

const twitter = new TwitterConnector("<ConnectionString>");

twitter.homeTimeline()
.then(homeTimeline => {
    console.log(homeTimelineResponse[0].TweetText);
})
.catch(error => {
    console.log(error);
});
```

### Samples

Check out the [**samples**](https://github.com/Azure/Azure-Connectors/tree/private-preview) folder on how to leverage azure-connectors npm package in Azure Functions. 




