using System;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Web.Http;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.WebJobs;
using Microsoft.Azure.WebJobs.Extensions.Http;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging; 
using System.Collections.Generic;
using Microsoft.Rest;
using System.Threading;

// *******One-Time Setup*********
// Add Azure GitHub Organization as a source to nuget.config by following instructions below:
// Follow instructions here to genereate GitHub personal access token with "read:packages" permissions
// https://docs.github.com/en/github/authenticating-to-github/creating-a-personal-access-token
// Once you have the PAT handy, run command "dotnet nuget add source https://nuget.pkg.github.com/Azure/index.json --name AzureGPR --username <GitHubUserName> --password <PAT> --store-password-in-clear-text"
// At this point you can start adding connectors packages by running "dotnet add package Azure.Connectors.OneDrive --version 0.0.4-alpha"
// For complete list of nuget packages available see https://github.com/Azure/Connectors/packages?ecosystem=nuget
//*******************************

using Azure.Connectors.OneDrive;

namespace Company.Function
{
    public static class BackupFileOnOneDriveUsingChunking
    {
        [FunctionName("BackupFileOnOneDriveUsingChunking")]
        public static async Task<IActionResult> Run(
            [HttpTrigger(AuthorizationLevel.Anonymous, "get", "post", Route = null)] HttpRequest req,
            ILogger log)
        {
            // get OneDrive connection string from app setting and set up connector
            var oneDriveConnectionString = System.Environment.GetEnvironmentVariable("ONEDRIVE_CONNECTION", EnvironmentVariableTarget.Process);
            var oneDriveConnector = OneDriveConnector.Create(oneDriveConnectionString);

            // get reference to large file and download it, for download in chunks see https://docs.microsoft.com/en-us/azure/logic-apps/logic-apps-handle-large-messages#download-content-in-chunks for more info
            var bigFileMetadata = await oneDriveConnector.OneDriveFileData.GetFileMetadataByPathAsync("Documents/largefile.zip");
            var bigFile = await oneDriveConnector.OneDriveFileData.GetFileContentAsync(bigFileMetadata.Id);

            var chunkingSuggestion = await GetChunkingSuggestion(oneDriveConnector, "DocumentsBackup/", "largefile.zip", bigFileMetadata.Size.ToString());
            var chunkSize = chunkingSuggestion.Item1;
            var location = chunkingSuggestion.Item2;
            // depending on the upload speed, you may want to change the chunk size and not use the one suggested
            chunkSize = "1000000";

            try
            {
                await ConvertToChunks(bigFile, (int)bigFileMetadata.Size, int.Parse(chunkSize), oneDriveConnector.HttpClient, oneDriveConnector.Credentials, location);
            }
            catch(Exception exception)
            {
                var resultObject = new ObjectResult(exception.ToString());
                resultObject.StatusCode = (int)HttpStatusCode.InternalServerError;
                return resultObject;
            }

            log.LogInformation("C# HTTP trigger function processed a request.");

            string responseMessage =  "This HTTP triggered function executed and upload has completed successfully";

            return new OkObjectResult(responseMessage);
        }

        private static async Task<Tuple<string, string>> GetChunkingSuggestion(OneDriveConnector oneDriveConnector, string folderPath, string fileName, string fileSize)
        {
            // make initial call to find chunk size, see https://docs.microsoft.com/en-us/azure/logic-apps/logic-apps-handle-large-messages#upload-content-in-chunks for info
            var customHeaders = new Dictionary<string, List<string>>();
            var chunkingHeader = new List<string>();
            chunkingHeader.Add("chunked");
            customHeaders.Add("x-ms-transfer-mode", chunkingHeader);

            var contentLengthHeader = new List<string>();
            contentLengthHeader.Add(fileSize);
            customHeaders.Add("x-ms-content-length", contentLengthHeader);

            // pass in empty body and the correct headers to get chunking suggestions from service
            var response = await oneDriveConnector.OneDriveFileData.CreateFileWithHttpMessagesAsync(
                folderPath: folderPath, 
                name: fileName, 
                body: new System.IO.MemoryStream(System.Text.Encoding.UTF8.GetBytes("")),
                customHeaders: customHeaders);

            // from response, find the recommended chunk size and location to make subsequent patch calls
            var chunkSize = response.Response.Headers.GetValues("x-ms-chunk-size").First();
            var location = response.Response.Headers.GetValues("Location").First();

            return new Tuple<string, string>(chunkSize, location);
        }

        private static async Task ConvertToChunks(Stream fileStream, int fileSize, int chunkSize, HttpClient httpClient, ServiceClientCredentials credentials, string location)  
        {   
            // note: not all connectors support chunking, this is only enable on the connector side. Usually the swagger will denote his by having "chunkTransfer": true in "x-ms-capabilities". 
            // currently, we have azureblob, azuredatalake, azurefile, ftp, onedrive, onedriveforbussiness, sftpwithssh and sharepoint online as of writing.

            int totalChunks = (int)Math.Ceiling((double)fileSize / chunkSize);  
            // Loop through the whole stream and send it chunk by chunk;  
            for (int i = 0; i < totalChunks; i++)  
            {  
                int startIndex = i * chunkSize;  
                int endIndex = (int)(startIndex + chunkSize > fileSize ?   fileSize : startIndex + chunkSize);  
                int length = endIndex - startIndex;  
            
                byte[] bytes = new byte[length];  
                fileStream.Read(bytes, 0, bytes.Length);  

                // send patch request
                var httpRequest = new HttpRequestMessage();
                httpRequest.Method = new HttpMethod("PATCH");
                httpRequest.RequestUri = new System.Uri(location);

                httpRequest.Content = new StreamContent(new MemoryStream(bytes));

                httpRequest.Content.Headers.ContentRange = new System.Net.Http.Headers.ContentRangeHeaderValue(startIndex, endIndex-1, fileSize);
                httpRequest.Content.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue("application/octet-stream");
                httpRequest.Content.Headers.ContentLength = bytes.Length;

                // set up credentials for the http request
                await credentials.ProcessHttpRequestAsync(httpRequest, default(CancellationToken));

                var response = await httpClient.SendAsync(httpRequest);

                if(!response.IsSuccessStatusCode)
                {
                    throw new Exception($"response failed with status code {response.StatusCode} with error {response.Content.ReadAsAsync<HttpError>().Result.Message}");
                }
            }  
        }       
    }
}
