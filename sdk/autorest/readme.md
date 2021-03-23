#AutoRest configuration

> see https://aka.ms/autorest

```yaml
version: V2
pass-thru: "schema-validator-swagger"
azure-arm: true
```

```yaml
declare-directive:
  # rename operationId at any level
  rename-operation-extended: >-
    [{
      from: 'swagger-document',
      where: `$..[?(@["operationId"] == ${JSON.stringify($.from)})]`,
      transform: `$.operationId = ${JSON.stringify($.to)}`
    }]
directive:
  #############################
  # Remove underscore from operationId's
  # (Removes grouping from autorest)
  #############################
  - from: swagger-document
    where: $..[?(@.operationId)]
    transform: >-
      $.operationId = $.operationId.replace("_", "");
  #############################
  # Remove irrelevant operations (trigger, deprecated, or internal and not referenced)
  #############################
  # Remove trigger and deprecated
  - from: swagger-document
    where: $.paths.*.*
    transform: >-
      /* Remove trigger types */
      if ($["x-ms-trigger"] || $.deprecated) {
        return;
      }
  # Note operations used for dynamic inputs (to not remove)
  - from: swagger-document
    where: $
    transform: >-
      let dynamicInputOperations = {};
      let allParameters = [];
      /* Get parameters from operation definitions */
      for (const pathName in $.paths) {
        for (const methodName in $.paths[pathName]) {
          const action = $.paths[pathName][methodName];
          for (const parameter of action.parameters) {
            allParameters.push(parameter);
          }
        }
      }
      /* Get parameters from definitions */
      for (const definitionName in $.definitions) {
        allParameters.push($.definitions[definitionName]);
      }
      /* Get parameters from parameters */
      for (const parameterName in $.parameters) {
        allParameters.push($.parameters[parameterName]);
      }
      /* Find all dynamic params and update description */
      for (const parameter of allParameters) {
        let operationId;
        let parameterName;
        const v2Dynamic = (parameter["x-ms-dynamic-list"] || parameter["x-ms-dynamic-properties"]);
        const v1Dynamic = (parameter["x-ms-dynamic-values"] || parameter["x-ms-dynamic-schema"]);
        if (v2Dynamic) {
          operationId = v2Dynamic.operationId;
          parameterName = v2Dynamic.itemValuePath;
        } else if (v1Dynamic) {
          operationId = v1Dynamic.operationId;
          parameterName = v1Dynamic["value-path"];
        }
        if (operationId && parameterName) {
          dynamicInputOperations[operationId] = { 
            parameter,
            parameterName
          };
        }
      }
      /* Iterate again to alter x-ms-visibility on operations themselves */
      for (const pathName in $.paths) {
        for (const methodName in $.paths[pathName]) {
          const action = $.paths[pathName][methodName];
          let dynamicInput = dynamicInputOperations[action.operationId];
          if (dynamicInput && dynamicInput.parameter) {
            action["x-ms-visibility"] = action["x-ms-visibility"] + "-dynamic";
            /* Use x-ms-client-name if it's there */
            let modifiedOperationId = action["x-ms-client-name"] || action.operationId;
            /* Change description */
            dynamicInput.parameter.description = (dynamicInput.parameter.description || "") + `\nYou can get this value by calling '${modifiedOperationId}' and using the '${dynamicInput.parameterName}' value.`;
          }
        }
      }
  # Remove internal (non-dynamic) visibility
  - from: swagger-document
    where: $.paths.*.*
    transform: >-
      if ($["x-ms-visibility"] === "internal") {
        return;
      }
  # Use "x-ms-client-name" instead of "operationId" if it's there.
  # Note that references to "operationId" for dynamic values has been fixed above.
  - from: swagger-document
    where: $..[?(@.operationId)]
    transform: >-
      $.operationId = $["x-ms-client-name"] || $.operationId;
  #############################
  # Make connectionId and x-ms-api-version only global params
  #############################
  # Make sure connectionId is a global, unduplicated parameter
  - from: swagger-document
    where: $
    transform: >-
      if ($.parameters == undefined ) {
        $["parameters"] = {"ConnectionIdParameter": { "name": "connectionId", "description": "Unique identifier of the connection instance", "in": "path", "required": true, "type": "string" }}
      } else {
        $.parameters["ConnectionIdParameter"] = { "name": "connectionId", "description": "Unique identifier of the connection instance", "in": "path", "required": true, "type": "string" }
      }
  - from: swagger-document
    where: $.paths.*.*.parameters[?(@.name === "connectionId")]
    transform: >-
      return { "$ref": "#/parameters/ConnectionIdParameter" }
  # Make sure x-ms-api-version is a global, unduplicated parameter
  - from: swagger-document
    where: $.paths.*.*.parameters[?(@.name === "x-ms-api-version")]
    transform: >-
      return { "$ref": "#/parameters/ApiVersionParameter" }
  # Remove references except connection id and api version
  - from: swagger-document
    where: $
    transform: >-
      for (const path in $.paths) {
        const pathObject = $.paths[path];
        for (const method in pathObject) {
          const methodObject = pathObject[method];
          for (const parameter in methodObject.parameters) {
            let parameterDefinition = methodObject.parameters[parameter];
            let ref = parameterDefinition && parameterDefinition["$ref"]
            if (ref) {
              if (ref.indexOf("#/parameters/") >= 0) {
                let parameterName = ref.split("#/parameters/")[1];
                if (parameterName != "ApiVersionParameter" && parameterName != "ConnectionIdParameter") {
                  methodObject.parameters[parameter] = $.parameters[parameterName]
                }
              }
            }
          }
        }
      }
      /* Clear from global */
      const parameterCopy = Object.assign({}, $.parameters);
      $.parameters = {
        "ApiVersionParameter": parameterCopy.ApiVersionParameter,
        "ConnectionIdParameter": parameterCopy.ConnectionIdParameter,
      }
  #############################
  # Give parameters friendly names
  #############################
  # Make sure schemas for parameters and responses are in "definitions"
  # If this doesn't happen, resulting model object name is too long
  - from: swagger-document
    where: $
    transform: >-
      for (const path in $.paths) {
        const pathObject = $.paths[path];
        for (const method in pathObject) {
          const methodObject = pathObject[method];
          const operationId = methodObject.operationId;
          /* Schemas in responses */
          for (const responseStatus in methodObject.responses) {
            const responseDefinition = methodObject.responses[responseStatus];
            /* Response schema is not a definition */
            if (responseDefinition && responseDefinition.schema && !responseDefinition.schema["$ref"]) {
              const responseDescription = responseDefinition.description.charAt(0).toUpperCase() + responseDefinition.description.slice(1);
              const definitionName = `${operationId}${ responseDescription }Result`;
              if ($.definitions == undefined ) {
                $.definitions = {};
              }
              if ($.definitions[definitionName]) {
                throw "Duplicate definition name " + definitionName;
              }
              $.definitions[definitionName] = Object.assign({}, responseDefinition.schema);
              responseDefinition.schema = {
                "$ref": "#/definitions/" + definitionName
              }
            }
          }
          /* Schemas in definitions */
          for (const parameter in methodObject.parameters) {
            const parameterDefinition = methodObject.parameters[parameter];
            /* Parameter schema is not a definition */
            if (parameterDefinition && parameterDefinition.schema && !parameterDefinition.schema["$ref"]) {
              const parameterName = parameterDefinition.name.charAt(0).toUpperCase() + parameterDefinition.name.slice(1);
              const parameterDefinitionName = `${ operationId }${ parameterName}`;
              if ($.definitions == undefined ) {
                $.definitions = {};
              }
              if ($.definitions[parameterDefinitionName]) {
                throw "Duplicate parameter definition name " + parameterDefinitionName;
              }
              $.definitions[parameterDefinitionName] = Object.assign({}, parameterDefinition.schema);
              parameterDefinition.schema = {
                "$ref": "#/definitions/" + parameterDefinitionName
              }
            }
          }
        }
      }
  #############################
  # Make binary string input truly binary
  # (Note: this is a workaround for behavior in autorest)
  #############################
  # Replace binary format type that will correctly generate binary type
  - from: swagger-document
    where: $..[?(@.format === "binary" && @.type === "string")]
    transform: >-
      return Object.assign($, { "format": "file", "type": "object" })
  #############################
  # Improve descriptions for operations and parameters
  #############################
  # Link to external docs
  - from: swagger-document
    where: $.paths.*.*
    transform: >-
      if ($.externalDocs && $.externalDocs.url) {
        $.description = ($.description || "") + `\nSee docs: ${$.externalDocs.url}`;
      }
  # Add examples to description
  - from: swagger-document
    where: $..[?(@["x-ms-test-value"])]
    transform: >-
      return Object.assign($, { "description": `${$.description} (Example: ${JSON.stringify($["x-ms-test-value"])})` })
```

```yaml $(csharp-only)
csharp:
 license-header: MICROSOFT_MIT_NO_VERSION
 sync-methods: none
 add-credentials: true
 output-folder: $(output-folder)/csharp
 directive:
  # 1. Update constructor to accept connection string
  - from: source-file-csharp
    where: $
    transform: >-
      const connectorClassDeclarationRegex = /protected \w*Connector\(System.Uri baseUri/g;
      if ($.search(connectorClassDeclarationRegex) >= 0) {
        const classDeclaration = $.match(connectorClassDeclarationRegex)[0];
        const connectorName = classDeclaration.match(/ \w*Connector/g)[0].replace(" ", "");
        const doubleQuote = '"';
        const newImports = `
            \\tusing System;\\n
            \\tusing System.Linq;\\n
            \\tusing System.Text.RegularExpressions;\\n
            \\tusing global::Azure.Identity;\\n
            \\tusing global::Azure.Core;\\n
        `;
        const connectorFactory = `
        \\t\\tpublic static ${connectorName} Create(string connectionString, params DelegatingHandler[] handlers)\\n
        \\t\\t{\\n
            \\t\\t\\tvar credentials = GetCredentials(connectionString);\\n
            \\t\\t\\tvar client = new ${connectorName}(credentials, handlers);\\n
            \\t\\t\\tvar baseUri = GetBaseUri(connectionString);\\n
            \\t\\t\\tclient.ConnectionId = GetConnectionId(connectionString);\\n
            \\t\\t\\tclient.BaseUri = new Uri(baseUri);\\n
            \\t\\t\\treturn client;\\n
        \\t\\t}\\n
        \\t\\tpublic static ${connectorName} Create(string connectionString, HttpClientHandler rootHandler, params DelegatingHandler[] handlers)\\n
        \\t\\t{\\n
            \\t\\t\\tvar credentials = GetCredentials(connectionString);\\n
            \\t\\t\\tvar client = new ${connectorName}(credentials, rootHandler, handlers);\\n
            \\t\\t\\tvar baseUri = GetBaseUri(connectionString);\\n
            \\t\\t\\tclient.ConnectionId = GetConnectionId(connectionString);\\n
            \\t\\t\\tclient.BaseUri = new Uri(baseUri);\\n
            \\t\\t\\treturn client;\\n
        \\t\\t}
        \\n
        \\t\\tpublic static ${connectorName} Create(string connectionString, HttpClient httpClient, bool disposeHttpClient)\\n
        \\t\\t{\\n
            \\t\\t\\tvar credentials = GetCredentials(connectionString);\\n
            \\t\\t\\tvar client = new ${connectorName}(credentials, httpClient, disposeHttpClient);\\n
            \\t\\t\\tvar baseUri = GetBaseUri(connectionString);\\n
            \\t\\t\\tclient.ConnectionId = GetConnectionId(connectionString);\\n
            \\t\\t\\tclient.BaseUri = new Uri(baseUri);\\n
            \\t\\t\\treturn client;\\n
        \\t\\t}
        `;
        const getCredentialsFactory = `
        \\t\\tprivate static ServiceClientCredentials GetCredentials(string connectionString)\\n
        \\t\\t{\\n
            \\t\\t\\tvar connectionPieces = connectionString.Split(';').Select(x => x.Split('='));\\n
            \\t\\t\\tvar authPair = connectionPieces.Where(x => x[0].ToLower() == \\u0022auth\\u0022).FirstOrDefault();\\n
            \\t\\t\\tstring authValue = null;\\n
            \\t\\t\\tif(authPair != null && authPair[1] != null)\\n
            \\t\\t\\t{\\n
                \\t\\t\\t\\tauthValue = authPair[1];\\n
            \\t\\t\\t}\\n
            \\t\\t\\tif(string.IsNullOrEmpty(authValue))\\n
            \\t\\t\\t{\\n
                \\t\\t\\t\\tthrow new Exception(\\u0022Property 'auth' (or value) is missing from connection string\\u0022);\\n
            \\t\\t\\t}\\n
            \\t\\t\\tTokenCredentials credentials = null;\\n
            \\t\\t\\tif(authValue.ToLower() == \\u0022key\\u0022)\\n
            \\t\\t\\t{\\n
               \\t\\t\\t\\t var keyPair = connectionPieces.Where(x => x[0].ToLower() == \\u0022key\\u0022).FirstOrDefault();\\n
                \\t\\t\\t\\tstring key = null;\\n
                \\t\\t\\t\\tif(keyPair != null)\\n
                \\t\\t\\t\\t{\\n
                    \\t\\t\\t\\t\\tkey = keyPair[1];\\n
                \\t\\t\\t\\t}\\n
                \\t\\t\\t\\tif(string.IsNullOrEmpty(key))\\n
                \\t\\t\\t\\t{\\n
                    \\t\\t\\t\\t\\tthrow new Exception(\\u0022Property 'key' missing from connection string\\u0022);\\n
                \\t\\t\\t\\t}\\n
                \\t\\t\\t\\tcredentials = new TokenCredentials(key, \\u0022Key\\u0022);\\n
            \\t\\t\\t}\\n
            \\t\\t\\telse if(authValue.ToLower() == \\u0022managed\\u0022)\\n
            \\t\\t\\t{\\n
                \\t\\t\\t\\tvar creds = new DefaultAzureCredential();\\n
                \\t\\t\\t\\tvar accessToken = creds.GetToken(\\n
                        \\t\\t\\t\\t\\tnew TokenRequestContext(\\n
                            \\t\\t\\t\\t\\tnew[] { \\u0022https://management.core.windows.net//.default\\u0022 }));\\n
                \\t\\t\\t\\tcredentials = new TokenCredentials(accessToken.Token, \\u0022Bearer\\u0022);\\n
            \\t\\t\\t}\\n
            \\t\\t\\telse\\n
            \\t\\t\\t{\\n
                \\t\\t\\t\\tthrow new Exception(\\u0022Auth value is \\u0022 + authValue + \\u0022 instead of 'key' or 'managed'\\u0022);\\n
            \\t\\t\\t}\\n
            \\t\\t\\treturn credentials;\\n
        \\t\\t}\\n\\n
       \\t\\t private static string GetEndpointFromConnectionString(string connectionString)\\n
        \\t\\t{\\n
            \\t\\t\\tvar connectionPieces = connectionString.Split(';').Select(x => x.Split('='));\\n
            \\t\\t\\tvar endpointPair = connectionPieces.Where(x => x[0].ToLower() == \\u0022endpoint\\u0022).FirstOrDefault();\\n
            \\t\\t\\tstring endpoint = null;\\n
            \\t\\t\\tif(endpointPair != null && endpointPair[1] != null)\\n
            \\t\\t\\t{\\n
                \\t\\t\\t\\tendpoint = endpointPair[1];\\n
            \\t\\t\\t}\\n
            \\t\\t\\tif(string.IsNullOrEmpty(endpoint))\\n
            \\t\\t\\t{\\n
                \\t\\t\\t\\tthrow new Exception(\\u0022Property 'endpoint' is missing from connection string\\u0022);\\n
            \\t\\t\\t}\\n
            \\t\\t\\treturn endpoint;\\n
        \\t\\t}\\n\\n
        \\t\\tprivate static string GetConnectionId(string connectionString)\\n
        \\t\\t{\\n
            \\t\\t\\tvar endpoint = GetEndpointFromConnectionString(connectionString);\\n
            \\t\\t\\tMatch match = Regex.Match(endpoint, @\\u0022[https:\/\/|http:\/\/].*[\.net|\.com]\/apim\/\\u005Cw*\/(\\u005Cw*)\\u0022,\\n
                \\t\\t\\t\\tRegexOptions.IgnoreCase);\\n
            \\t\\t\\tif (match.Success)\\n
            \\t\\t\\t{\\n
                \\t\\t\\t\\treturn match.Groups[1].Value;\\n
            \\t\\t\\t}\\n
            \\t\\t\\telse\\n
            \\t\\t\\t{\\n
                \\t\\t\\t\\tthrow new Exception(\\u0022endpoint in connection string is malformed\\u0022);\\n
            \\t\\t\\t}\\n
        \\t\\t}\\n\\n
        \\t\\tprivate static string GetBaseUri(string connectionString)\\n
        \\t\\t{\\n
            \\t\\t\\tvar endpoint = GetEndpointFromConnectionString(connectionString);\\n
            \\t\\t\\tMatch match = Regex.Match(endpoint, @\\u0022(https:\/\/|http:\/\/).*(\.net|\.com)\/apim\/\\u005Cw*\\u0022,\\n
                \\t\\t\\t\\tRegexOptions.IgnoreCase);\\n
            \\t\\t\\tif (match.Success)\\n
            \\t\\t\\t{\\n
                \\t\\t\\t\\treturn match.Value;\\n
            \\t\\t\\t}\\n
            \\t\\t\\telse\\n
            \\t\\t\\t{\\n
                \\t\\t\\t\\tthrow new Exception(\\u0022endpoint in connection string is malformed\\u0022);\\n
            \\t\\t\\t}\\n
        \\t\\t}\\n
        `;
        $ = $.replace(`using System.Net.Http;`, `using System.Net.Http;\n${newImports}`);
        $ = $.replace(`partial void CustomInitialize();`, `partial void CustomInitialize();\n${getCredentialsFactory}`);
        $ = $.replace(`partial void CustomInitialize();`, `partial void CustomInitialize();\n\n${connectorFactory}`);
        return $;
      } else {
        return $;
      }
```

```yaml $(typescript-only)
typescript:
 add-credentials: true
 generate-metadata: true
 output-folder: $(output-folder)/typescript
 directive:
  # 1. Update constructor to accept connection string
  # 2. Make context parameters private
  - from: source-file-typescript
    where: $
    transform: >-
      const connectorClassDeclarationRegex = /(class ).*(Connector extends ).*(ConnectorContext \{)/g;
      const connectorContextDeclarationRegex = /(export class ).*(ConnectorContext extends ).*(msRestAzure.AzureServiceClient \{)/g;
      /* Target connector class file and modify constructor */
      if ($.search(connectorClassDeclarationRegex) >= 0) {
        const constructorRegex = /(constructor\(credentials: msRest.ServiceClientCredentials, connectionId: string, options\?: Models.).*(ConnectorOptions\) {\n.   super\(credentials, connectionId, options\);)/g;
        const classDeclaration = $.match(connectorClassDeclarationRegex)[0];
        const connectorName = classDeclaration.match(/ \w*Connector /g)[0].replace(" ", "");
        const newImports = `import { DefaultAzureCredential } from "@azure/identity"`;
        const options = $.match(/(options\?: Models).*(Options)/g)[0];
        const connectorFactory = `
      let _connectorClient: ${connectorName} | undefined;\n
      export const create${connectorName} = async function(connectionString: string, ${options}): Promise<${connectorName}> {
        const creds = await getCredentials(connectionString);
        if (!_connectorClient) {
          _connectorClient = new ${connectorName}(...creds);
        } 
        return _connectorClient;
      }
        `;
        const getCredentialsFunction = `
      const getCredentials = async function (connectionString: string, userOptions?: any): Promise<[msRest.TokenCredentials, string, any]> {
        if (!connectionString) {
          throw new Error("Input 'connectionString' is missing");
        }
        /* Read and parse endpoint */
        const connectionPieces = connectionString.split(";").map((segment) => { return segment.split("=") });
        const endpointPair = connectionPieces.find((segment) => { return segment[0].toLowerCase() == "endpoint"});
        const endpoint = endpointPair && endpointPair[1];
        if (!endpoint) {
          throw new Error("Property 'endpoint' is missing from connection string");
        }
        const endpointComponents = endpoint.split("/").filter((value: string) => { return value; });
        const connectionId = endpointComponents[endpointComponents.length - 1];
        const baseUri = (endpoint.match(/(https:\\/\\/|http:\\/\\/).*(\\.net|\\.com)/g)|| [""])[0];
        /* Read and parse auth */
        const authPair = connectionPieces.find((segment) => { return segment[0].toLowerCase() == "auth"});
        const auth = authPair && authPair[0];
        const authValue = authPair && authPair[1];
        if (!(auth && authValue)) {
          throw new Error("Property 'auth' (or value) is missing from connection string");
        }
        let tokenCredential: msRest.TokenCredentials;
        if (authValue.toLowerCase() === "key") {
          const keyPair = connectionPieces.find((segment) => { return segment[0].toLowerCase() == "key"});
          const key = keyPair && keyPair[1];
          if (!key) {
            throw new Error("Property 'key' missing from connection string");
          }
          tokenCredential = new msRest.TokenCredentials(key, "Key");
        } else if (authValue.toLowerCase() === "managed") {
          const creds = new DefaultAzureCredential();
          const accessToken = await creds.getToken("https://management.core.windows.net//.default"); 
          tokenCredential = new msRest.TokenCredentials((accessToken && accessToken.token) || "", "Bearer");
        } else {
          throw new Error("Auth value is " + authValue + " instead of 'key' or 'managed'");
        }
        return [ tokenCredential, connectionId, Object.assign({ baseUri }, userOptions) ];
      }
        `;
        const finalClassDeclaration = `${newImports} \n ${getCredentialsFunction} \n ${connectorFactory}`;
        $ = $.replace(`import * as msRest from "@azure/ms-rest-js";`, `import * as msRest from "@azure/ms-rest-js"; \n${finalClassDeclaration}`);
        return $;
      /* Target connector context class file and make properties private */
      } else if ($.search(connectorContextDeclarationRegex) >= 0) {
          const declarationRegex = /\w*\??: (\w|\.|\d)*;/g;
          const properties = $.match(declarationRegex);
          for (let property of properties) {
            $ = $.replace(property, `private ${property}`);
          }
          return $;
      } else {
        return $;
      }
  - from: source-file-typescript
    where: $
    transform: >-
      const connectorClassDeclarationRegex = /(class ).*(Connector extends ).*(ConnectorContext \{)/g;
      /* Target connector class file and modify constructor */
      if ($.search(connectorClassDeclarationRegex) >= 0) {
        const classDeclaration = $.match(connectorClassDeclarationRegex)[0];
        const connectorName = classDeclaration.match(/ \w*Connector/g)[0].replace(" ", "");
        $ = $.replace(`extends ${connectorName}Context {`, `{ \\n  _client: ${connectorName}Context;`);
        $ = $.replace("super", `this._client = new ${connectorName}Context`);
        $ = $.split("(this)").join("(this._client)");
        return $;
      }
  - from: source-file-typescript
    where: $
    transform: >-
      const connectorClassRegex = /const connectionPieces = connectionString\.split\(/g;
      if ($.search(connectorClassRegex) >= 0) {
        const matches = $.match(/this.\w*\(/g);
        for (const m of matches) {
          const r = m.replace("this.", "this._client.");
          $ = $.replace(m, r)
        }
      }
      return $;
```