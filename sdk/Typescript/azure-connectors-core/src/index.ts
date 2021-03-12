import * as msRest from "@azure/ms-rest-js"; 
import { AzureServiceClientOptions } from "@azure/ms-rest-azure-js";
import { DefaultAzureCredential } from "@azure/identity" 
 
export const getConnectorArgs = async function (connectionString: string, userOptions?: AzureServiceClientOptions): Promise<[msRest.TokenCredentials, string, AzureServiceClientOptions]> {
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
    const baseUri = (endpoint.match(/(https:\/\/|http:\/\/).*(\.net|\.com)/g)|| [""])[0];
    
    /* Read and parse auth */
    const authPair = connectionPieces.find((segment) => { return segment[0].toLowerCase() == "auth"});
    const auth = authPair && authPair[0];
    const authValue = authPair && authPair[1];
    
    if (!(auth && authValue)) {
        throw new Error("Property 'auth' (or value) is missing from connection string");
    }
    
    let tokenCredential: msRest.TokenCredentials;
    // Get token credential by auth key
    if (authValue.toLowerCase() === "key") {
        const keyPair = connectionPieces.find((segment) => { return segment[0].toLowerCase() == "key"});
        const key = keyPair && keyPair[1];
        
        if (!key) {
            throw new Error("Property 'key' missing from connection string");
        }
        
        tokenCredential = new msRest.TokenCredentials(key, "Key");
    // Get token credential by default azure credential ("managed" scenario)
    } else if (authValue.toLowerCase() === "managed") {
        const creds = new DefaultAzureCredential();
        const accessToken = await creds.getToken("https://management.core.windows.net//.default"); 
        tokenCredential = new msRest.TokenCredentials((accessToken && accessToken.token) || "", "Bearer");
    // Other auth types not supported
    } else {
        throw new Error("Auth value is " + authValue + " instead of 'key' or 'managed'");
    }
    return [ tokenCredential, connectionId, Object.assign({ baseUri }, userOptions) ];
}
