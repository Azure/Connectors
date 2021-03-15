// This script is a helper to quickly create friendly swagger names
// Ignore trigger and deprecated API's
//
// First argument: change mode.
//   - 'config': create a custom autorest config file with rename-operation
//   - 'swagger': create/update a swagger file with 'x-ms-client-name' field
// Second argument: File path to swagger
// Third argument (optional): File path to the output autorest config or swagger. 
// Use default value if not specified, which is
//   - 'config': sdk/autorest/customConfigs/${friendlyName}
//   - 'swagger': {same as second argument (overwrite the existing one)}

// example:
// > node sdk/Scripts/CreateFriendlyMethodNames.js config sdk/swaggers/ms-services/released/aci.json sdk\autorest\customConfigs\aci.md
// > node sdk/Scripts/CreateFriendlyMethodNames.js swagger sdk/swaggers/ms-services/released/aci.json aci2.json

const readline = require('readline');
const util = require('util');
const fs = require('fs');
const { exit } = require('process');

const JSON_SPACING = "  ";
const myArgs = process.argv.slice(2);
const changeMode = myArgs[0];
const swaggerFile = myArgs[1];
const outputFile = myArgs[2];
const readFileAsync = util.promisify(fs.readFile);

const customConfigTemplate = "\
# {friendlyConnectorName\} Custom Config\r\n\
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
directives:\r\n\
{directives\}\r\n\
```\r\n\
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

async function getNewNamesFromUser(swagger) {
    try {
        // Loop through API's and optionally rename operationId's
        const newNames = {};
        for (let path in swagger.paths) {
            for (let method in swagger.paths[path]) {
                let action = swagger.paths[path][method];
                if (action["x-ms-trigger"] || action.deprecated) {
                    continue;
                }
                console.log("=====================");
                console.log(`Operation ID: \t\t${action.operationId}`);
                console.log(`Visibility: \t\t${action["x-ms-visibility"]}`);
                console.log(`Summary: \t\t${action.summary}`);
                console.log(`Description: \t\t${action.description}`);
                console.log(`URL: \t\t\t${action.externalDocs.url}`);
                console.log(`x-ms-client-name: \t${action["x-ms-client-name"]}`);
                let newName = await getName();
                if (newName) {
                    newNames[action.operationId] = newName;
                }
            }
        }

        // Confirm one last time with the user that everything looks good
        console.warn("\nMaking the following changes:")
        for (let oldName in newNames) {
            console.log(`\t${oldName} => ${newNames[oldName]}`);
        }
        await continueOrTerminate();
        return newNames;
    } catch (err) {
        console.error(err)
    }
}

async function createNewSwagger(swagger, newNames, outputSwaggerFile) {
    for (let path in swagger.paths) {
        for (let method in swagger.paths[path]) {
            let action = swagger.paths[path][method];
            if (action["x-ms-trigger"] || action.deprecated) {
                continue;
            }
            if (action.operationId in newNames) {
                action["x-ms-client-name"] = newNames[action.operationId];
            }
        }
    }

    fs.writeFileSync(outputSwaggerFile, JSON.stringify(swagger, null, JSON_SPACING));
}

async function createNewCustomConfig(newNames, friendlyConnectorName, outputConfigFile) {
    let directives = "";
    for (let oldName in newNames) {
        directives += `\t- rename-operation-extended:\r\n\t\tfrom: ${oldName}\r\n\t\tto: ${newNames[oldName]}`;
    }

    var customConfig = customConfigTemplate.replace("{friendlyConnectorName}", friendlyConnectorName).replace("{directives}", directives);
    fs.writeFileSync(outputConfigFile, customConfig);
}

async function run() {
    // Verify change mode input
    if (changeMode != "config" && changeMode != "swagger") {
        console.error(`changeMode has to be either 'config' or 'swagger': current=${changeMode}`);
        exit(1);
    } 

    // Read swagger
    console.log(`Reading swagger from: '${swaggerFile}'`)
    const swaggerData = await readFileAsync(swaggerFile, 'utf8');
    const swagger = JSON.parse(swaggerData);

    if (changeMode == "config") {
        var filename = swaggerFile.split("/").pop();
        var friendlyConnectorName = filename.substring(0, filename.indexOf("."));
        if (friendlyConnectorName) {
            console.log(`Using this friendly name for the config file: ${friendlyConnectorName}`);
        } else {
            console.error("could not get friendly connector name from the swaggerFilePath");
            exit(1);
        }

        const newNames = await getNewNamesFromUser(swagger);
        let outputConfigFile = outputFile;
        if (!outputFile) {
            outputConfigFile = `sdk/autorest/customConfigs/${friendlyConnectorName}.md`;
        } 
        console.log(`Writing a custom config file to: '${outputConfigFile}'`)
        createNewCustomConfig(newNames, friendlyConnectorName, outputConfigFile)
    }
    if (changeMode == "swagger") {
        // Prompts to make sure the user knows what they're doing
        if (outputFile) {
            console.log(`Writing a swagger to: '${outputFile}'`)
            await continueOrTerminate();
        } else {
            console.warn(`IMPORTANT: this script will overwrite the existing contents of ${swaggerFile}`);
            await continueOrTerminate();
        }

        const newNames = await getNewNamesFromUser(swagger);
        createNewSwagger(swagger, newNames, outputFile || swaggerFile)
    }
}

run();