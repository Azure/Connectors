using System;
using System.IO;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.WebJobs;
using Microsoft.Azure.WebJobs.Extensions.Http;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json;
using System.Text;  

// *******One-Time Setup*********
// Add Azure GitHub Organization as a source to nuget.config by following instructions below:
// Follow instructions here to genereate GitHub personal access token with "read:packages" permissions
// https://docs.github.com/en/github/authenticating-to-github/creating-a-personal-access-token
// Once you have the PAT handy, run command "dotnet nuget add source https://nuget.pkg.github.com/Azure/index.json --name AzureGPR --username --password <PAT> --store-password-in-clear-text"
// At this point you can start adding connectors packages by running "dotnet add package Azure.Connectors.CommonDataService --version 0.0.1-alpha" and "dotnet add package Azure.Connectors.Outlook --version 0.0.1-alpha"
// For complete list of nuget packages available see https://github.com/Azure/Connectors/packages?ecosystem=nuget
//*******************************

using Azure.Connectors.OneDrive;
using Azure.Connectors.Outlook;

namespace Company.Function
{
    public static class SaveAttachmentToOneDrive
    {
        [FunctionName("SaveAttachmentToOneDrive")]
        public static async Task<IActionResult> Run(
            [HttpTrigger(AuthorizationLevel.Anonymous, "get", "post", Route = null)] HttpRequest req,
            ILogger log)
        {
            var outlookConnectionString = System.Environment.GetEnvironmentVariable("OUTLOOK_CONNECTION", EnvironmentVariableTarget.Process);
            var oneDriveConnectionString = System.Environment.GetEnvironmentVariable("ONEDRIVE_CONNECTION", EnvironmentVariableTarget.Process);

            var outlookConnector = OutlookConnector.Create(outlookConnectionString);
            var oneDriveConnector = OneDriveConnector.Create(oneDriveConnectionString);

            var emails = await outlookConnector.Mail.GetEmailsV2Async(
                fetchOnlyUnread: true,
                fetchOnlyWithAttachment: true,
                includeAttachments: true);
            
            foreach(var email in emails.Value)
            {
                foreach(var attachment in email.Attachments)
                {
                    var bytes = attachment.ContentBytes;
                    Stream stream = new MemoryStream(bytes);

                    await oneDriveConnector.OneDriveFileData.CreateFileAsync("emailAttachments/", attachment.Name, stream);
                }
            }

            log.LogInformation("C# HTTP trigger function processed a request.");

            string responseMessage = "This HTTP triggered function executed successfully.";

            return new OkObjectResult(responseMessage);
        }
    }
}
