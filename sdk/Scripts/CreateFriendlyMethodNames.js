// This script is a helper to quickly create friendly swagger names
// Ignore trigger and deprecated API's
//
// # Arguments
// First argument: change mode.
//   - 'config': create a custom autorest config file with rename-operation
//   - 'swagger': create/update a swagger file with 'x-ms-client-name' field
// Second argument: File path to swagger
// Third argument (optional): File path to the output autorest config or swagger. Use default value if not specified, which is
//   - 'config': sdk/autorest/customConfigs/${friendlyName}
//   - 'swagger': {same as second argument (overwrite the existing one)}

// # Example:
// > node sdk/Scripts/CreateFriendlyMethodNames.js config sdk/swaggers/ms-services/released/aci.json
// > node sdk/Scripts/CreateFriendlyMethodNames.js swagger sdk/swaggers/ms-services/released/aci.json aci2.json

// # General Rules for renaming
// 1. Append the following preferred verbs in the front if applicable. If another significant verb is present, keep it.
//      | Method Verb | Applicable cases |
//      | ----------- | ---------------- |
//      | Create      | Creating a new resource |
//      | Get         | Fetching data or metadata |
//      | Update      | Modifying an existing resource |
//      | Delete      | Removing / deleting an existing resource |
// 
//      e.g. ContactDeleteItem_V2 => DeleteContact_V2
//      e.g. ReplyToV3 => ReplyToEmail_V3 (more "significant" verb is present)
//
// 2. Patch => Update.
//      e.g. ContactPatchItem_V2 => UpdateContact_V2
// 3. Version comes at the end with an underscore.
//      e.g. V4CalendarGetItems => GetCalendarEvents_V4.
// 4. Remove "Item" or replace it with more specific entity
//      e.g. ContactGetItems_V2 => GetContacts_V2
// 5. Derive a clearer name from the operation summary and description when possible
//      e.g. CalendarGetTable => GetCalendarMetadata
//      e.g. ContactGetItems_V2 => GetContacts_V2

const readline = require('readline');
const util = require('util');
const fs = require('fs');
const { exit } = require('process');

const JSON_SPACING = "  ";
const CONFIG_MODE = "config";
const SWAGGER_MODE = "swagger";
const myArgs = process.argv.slice(2);
const changeMode = myArgs[0] && myArgs[0].toLowerCase();
const swaggerFile = myArgs[1] && myArgs[1].toLowerCase();
const outputFile = myArgs[2] && myArgs[2].toLowerCase();
const readFileAsync = util.promisify(fs.readFile);

const customConfigTemplate = "\
# {connectorName\} Custom Config\r\n\
\r\n\
> see https://aka.ms/autorest\r\n\
\r\n\
## Configuration\r\n\
\r\n\
```yaml\r\n\
# https://github.com/Azure/autorest/blob/master/Samples/openapi-v2/3h-try-require/readme.md\r\n\
require: ../readme.md\r\n\
\r\n\
# Add your own config below\r\n\
directive:\r\n\
{directives\}\r\n\
```\
"

function askQuestion(query) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    return new Promise(resolve => rl.question(query, answer => {
        rl.close();
        resolve(answer);
    }))
}

async function getName() {
    let ans = await askQuestion("Please enter a friendly name or press enter to skip...\n");
    if (ans) {
        let confirm = await askQuestion(`Confirm '${ans}'? ("y" or enter to accept)`);
        if (confirm == "y" || confirm == "") {
            return ans;
        } else {
            console.log("Trying again...");
            return await getName();
        }
    }
}

async function continueOrTerminate() {
    const ans = await askQuestion("Continue? (y/n)");
    if (ans != "y") {
        console.log("Terminating program...");
        process.exit();
    }
}

async function getRenameMappingFromUser(swagger) {
    try {
        // Loop through API's and optionally rename operationId's
        const renameMapping = {};
        for (let path in swagger.paths) {
            for (let method in swagger.paths[path]) {
                // Exclude non-method
                if (['x-ms-notification-content'].includes(method)) {
                    continue;
                }

                if (action["x-ms-visibility"] == "internal") {
                    // TODO: do not skip if referenced by one of the dynamic properties e.g. x-ms-dynamic-values
                    continue;
                }
                
                let action = swagger.paths[path][method];
                if (action["x-ms-trigger"] || action.deprecated) {
                    continue;
                }
                console.log("=====================");
                console.log(`Operation ID: \t\t${action.operationId}`);
                console.log(`Path: \t\t\t${method.toUpperCase()} ${path}`);
                console.log(`Visibility: \t\t${action["x-ms-visibility"]}`);
                console.log(`Summary: \t\t${action.summary}`);
                console.log(`Description: \t\t${action.description}`);
                console.log(`URL: \t\t\t${action.externalDocs && action.externalDocs.url}`);
                console.log(`x-ms-client-name: \t${action["x-ms-client-name"]}`);
                let newName = await getName();
                if (newName) {
                    renameMapping[action.operationId] = newName;
                }
            }
        }

        // Confirm one last time with the user that everything looks good
        console.warn("\nMaking the following changes:")
        for (let oldName in renameMapping) {
            console.log(`\t${oldName} => ${renameMapping[oldName]}`);
        }
        await continueOrTerminate();
        return renameMapping;
    } catch (err) {
        console.error(err)
    }
}

async function createNewSwagger(swagger, renameMapping, outputSwaggerFile) {
    for (let path in swagger.paths) {
        for (let method in swagger.paths[path]) {
            let action = swagger.paths[path][method];
            if (action["x-ms-trigger"] || action.deprecated) {
                continue;
            }
            if (action.operationId in renameMapping) {
                action["x-ms-client-name"] = renameMapping[action.operationId];
            }
        }
    }

    fs.writeFileSync(outputSwaggerFile, JSON.stringify(swagger, null, JSON_SPACING));
}

async function createNewCustomConfig(renameMapping, connectorName, outputConfigFile) {
    let directives = "";
    for (let oldName in renameMapping) {
        directives += `  - rename-operation-extended:\r\n      from: ${oldName}\r\n      to: ${renameMapping[oldName]}\r\n`;
    }

    var customConfig = customConfigTemplate.replace("{connectorName}", connectorName).replace("{directives}", directives);
    fs.writeFileSync(outputConfigFile, customConfig);
}

async function run() {
    // Verify change mode input
    if (changeMode != CONFIG_MODE && changeMode != SWAGGER_MODE) {
        console.error(`changeMode has to be either ${CONFIG_MODE} or '${SWAGGER_MODE}: current=${changeMode}`);
        exit(1);
    } 

    // Read swagger
    console.log(`Reading swagger from: '${swaggerFile}'`)
    const swaggerData = await readFileAsync(swaggerFile, 'utf8');
    const swagger = JSON.parse(swaggerData);

    if (changeMode == CONFIG_MODE) {
        var filename = swaggerFile.split("/").pop();
        var connectorName = filename.substring(0, filename.indexOf("."));
        if (connectorName) {
            console.log(`Using this friendly name for the config file: ${connectorName}`);
        } else {
            console.error("could not get friendly connector name from the swaggerFilePath");
            exit(1);
        }

        let outputConfigFile = outputFile;
        if (!outputFile) {
            outputConfigFile = `sdk/autorest/customConfigs/${connectorName}.md`;
        } 
        console.log(`Writing a custom config file to: '${outputConfigFile}'`)
        await continueOrTerminate();

        const renameMapping = await getRenameMappingFromUser(swagger);
        createNewCustomConfig(renameMapping, connectorName, outputConfigFile)
    }
    if (changeMode == SWAGGER_MODE) {
        // Prompts to make sure the user knows what they're doing
        if (outputFile) {
            console.log(`Writing a swagger to: '${outputFile}'`)
            await continueOrTerminate();
        } else {
            console.warn(`IMPORTANT: this script will overwrite the existing contents of ${swaggerFile}`);
            await continueOrTerminate();
        }

        const renameMapping = await getRenameMappingFromUser(swagger);
        createNewSwagger(swagger, renameMapping, outputFile || swaggerFile)
    }
}

run();