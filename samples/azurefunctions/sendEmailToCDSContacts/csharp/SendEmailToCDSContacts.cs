using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.WebJobs;
using Microsoft.Azure.WebJobs.Extensions.Http;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;

// *******One-Time Setup*********
// Add Azure GitHub Organization as a source to nuget.config by following instructions below:
// Follow instructions here to genereate GitHub personal access token with "read:packages" permissions
// https://docs.github.com/en/github/authenticating-to-github/creating-a-personal-access-token
// Once you have the PAT handy, run command "dotnet nuget add source https://nuget.pkg.github.com/Azure/index.json --name AzureGPR --username --password <PAT> --store-password-in-clear-text"
// At this point you can start adding connectors packages by running "dotnet add package Azure.Connectors.CommonDataService --version 0.0.1-alpha" and "dotnet add package Azure.Connectors.Outlook --version 0.0.1-alpha"
// For complete list of nuget packages available see https://github.com/Azure/Connectors/packages?ecosystem=nuget
//*******************************

using Azure.Connectors.CommonDataService;
using Azure.Connectors.Outlook;

namespace Company.Function
{
    public static class SendEmailToCDSContacts
    {
        [FunctionName("SendEmailToCDSContacts")]
        public static async Task<IActionResult> Run(
            [HttpTrigger(AuthorizationLevel.Anonymous, "get", "post", Route = null)] HttpRequest req,
            ILogger log)
        {
            var outlookConnectionString = System.Environment.GetEnvironmentVariable("OUTLOOK_CONNECTION", EnvironmentVariableTarget.Process);
            var cdsConnectionString = System.Environment.GetEnvironmentVariable("CDS_CONNECTION", EnvironmentVariableTarget.Process);

            var outlookConnector = OutlookConnector.Create(outlookConnectionString);
            var cdsConnector = CommonDataServiceConnector.Create(cdsConnectionString);

            var contacts = await cdsConnector.CrmTableDataV2.GetItemsV2Async(
                dataset: "org3e35f5c1.crm10",
                table: "contacts"
            );

            foreach(var contact in contacts.Value)
            {
                if(contact.AdditionalProperties.ContainsKey("emailaddress1"))
                {
                    var firstName = (string)contact.AdditionalProperties["firstname"];
                    var lastName = (string)contact.AdditionalProperties["lastname"];
                    var emailAddress = (string)contact.AdditionalProperties["emailaddress1"];

                    // send everyone an email
                    var message = new Azure.Connectors.Outlook.Models.ClientSendHtmlMessage();
                    message.To = emailAddress;
                    message.Subject = "Hello";
                    message.Body = $"Hello {firstName} {lastName}";

                    await outlookConnector.Mail.SendEmailV2Async(message);
                }
            }

            log.LogInformation("C# HTTP trigger function processed a request.");

            string responseMessage = "This HTTP triggered function executed successfully.";

            return new OkObjectResult(responseMessage);
        }
    }
}
