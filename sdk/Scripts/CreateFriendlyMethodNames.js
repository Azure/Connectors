// This script is a helper to quickly create friendly swagger names
// Ignore trigger and deprecated API's
//
// First argument: File path to swagger
// Second argument (optional): File path to output swagger. Will overwrite if none.
//
// example:
// > node sdk/Scripts/CreateFriendlyMethodNames.js sdk/swaggers/ms-services/released/aci.json aci2.json

const readline = require('readline');
const util = require('util');
const fs = require('fs');

const JSON_SPACING = "  ";
const myArgs = process.argv.slice(2);
const swaggerFile = myArgs[0];
const outputSwaggerFile = myArgs[1];
const readFileAsync = util.promisify(fs.readFile);

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
        let confirm = await askQuestion(`Confirm '${ans}'? (y/n)`);
        if (confirm == "y") {
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

async function run() {
    try {
        // Prompts to make sure the user knows what they're doing
        if (outputSwaggerFile) {
            console.log(`Reading swagger from: '${swaggerFile}'`)
            console.log(`Writing swagger to: '${outputSwaggerFile}'`)
            await continueOrTerminate();
        } else {
            console.log(`IMPORTANT: this script will overwrite the existing contents of ${swaggerFile}`);
            await continueOrTerminate();
        }
        // Loop through API's and optionally rename operationId's
        const changes = {};
        const swaggerData = await readFileAsync(swaggerFile, 'utf8');
        const swagger = JSON.parse(swaggerData);
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
                    changes[action.operationId] = newName;
                    action["x-ms-client-name"] = newName;
                }
            }
        }

        // Confirm one last time with the user that everything looks good
        console.log("\n\nMaking the following changes:")
        for (let oldName in changes) {
            console.log(`\t${oldName} => ${changes[oldName]}`);
        }
        await continueOrTerminate();

        const output = outputSwaggerFile || swaggerFilel
        fs.writeFileSync(output, JSON.stringify(swagger, null, JSON_SPACING));
    } catch (err) {
        console.error(err)
    }
}

run();

