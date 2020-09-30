import { AzureFunction, Context, HttpRequest } from "@azure/functions"
import { createMicrosoftTranslatorV2Connector } from "@azure/microsofttranslatorv2-connector"

const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
    context.log('HTTP trigger function processed a request.');
    const text = (req.query.text || (req.body && req.body.text));

    if(text == undefined || text == "") {
        context.res = {
            // status: 200, /* Defaults to 200 */
            body: "Pass a 'text' in the query string or in the request body for a personalized response."
        };
    } else {
        const translatorConnector = await createMicrosoftTranslatorV2Connector("Replace with MicrosoftTranslatorV2 Connection String");
        const translatedText = await translatorConnector.microsoftTranslator.translate("fr", { text: text});
        
        context.res = {
            // status: 200, /* Defaults to 200 */
            body: translatedText
        };
    }
};

export default httpTrigger;