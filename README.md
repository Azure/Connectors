# Azure Connectors Early Access

**Please email your feedback/questions/suggestions @ "antr-easyapis@microsoft.com"**

### Pre-Requisites

Please send an email to **"antr-easyapis@microsoft.com"** requesting early access along with your Azure SubscriptionId. 
    

### IMPORTANT
-  The feature is only enabled in **"brazilsouth"**. Create the resource group that holds the API connections in "brazilsouth".
-  Be extremely careful to not leak the API Connection secrets.
    - Try use test accounts where possible. 


### Azure API Connections VSCode Extension
-  Install Azure Connectors VSCode extension by downloading vsix from [here](https://azureconnectors.blob.core.windows.net/vscode/vscode-azureAPIConnections-0.0.3-alpha.vsix?sp=r&st=2020-09-04T18:45:53Z&se=2021-07-05T02:45:53Z&spr=https&sv=2019-12-12&sr=b&sig=GdYTlqBqL73UN9LOTwZuqUCRh20FcJ9cf5HdCY587No%3D)

    -  See [instructions](https://code.visualstudio.com/docs/editor/extension-gallery#_install-from-a-vsix) to install vsix for vscode.

-  Supported Features:
    1. Create API Connections for all the logic apps supported [Connectors](https://docs.microsoft.com/en-us/connectors/connector-reference/connector-reference-logicapps-connectors).
    2. Authorize API Connection
        1. OAuth consent flows for connectors like dropbox, twitter, office365 etc
        2. Specify secrets for connectors like azure storage. 
    3. Generate connection string(secret) to clipboard. Used to invoke API COnnections.
    4. Navigate to API Connections in Azure Portal. 
    5. Assign webapp/functionapp managed identity access to connection.
    6. Delete API Connection.
    7. Locally invoke connections using connectionkeys or managed identity.

![Azure Connectors Extension](docs/resources/extension.gif)

### NPM Package(s)

install all connectors

    npm install @easyapis/easyapis-all

install single connector

    npm install @easyapis/easyapis-twitter


### Nuget Package(s)

install all connectors

    dotnet add package EasyApis.All --version 0.0.3-alpha

install single connector

    dotnet add package EasyApis.Twitter --version 0.0.3-alpha

### Samples

Check out the [**samples**](https://github.com/Azure/Azure-Connectors/tree/private-preview) folder on how to leverage npm and nugets packages in Azure Functions. 




