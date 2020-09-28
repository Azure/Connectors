using System;
using System.Text;
using System.Collections.Generic;
using System.IO;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.WebJobs;
using Microsoft.Azure.WebJobs.Extensions.Http;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json;
using Azure.Connectors.AzureBlobStorage;

namespace Company.Function
{
    public static class AzureBlobPaging
    {
        [FunctionName("AzureBlobPaging")]
        public static async Task<IActionResult> Run(
            [HttpTrigger(AuthorizationLevel.Anonymous, "get", "post", Route = null)] HttpRequest req,
            ILogger log)
        {
            var azureblobConnectionString = System.Environment.GetEnvironmentVariable("AZUREBLOB_CONNECTION", EnvironmentVariableTarget.Process);
            var azureblobConnector = AzureBlobStorageConnector.Create(azureblobConnectionString);

            var nextPageMarker = "";
            var blobMetadataList = new List<Azure.Connectors.AzureBlobStorage.Models.BlobMetadata>();
            do
            {
                var blobMetadataPage = await azureblobConnector.FileTransferFolderData.ListRootFolderV2Async(
                    nextPageMarker: nextPageMarker);
                foreach(var blob in blobMetadataPage.Value)
                {
                    blobMetadataList.Add(blob);
                }
                nextPageMarker = blobMetadataPage.NextPageMarker;
            }
            while(!string.IsNullOrEmpty(nextPageMarker));

            StringBuilder myStringBuilder = new StringBuilder();

            foreach(var blob in blobMetadataList)
            {
                myStringBuilder.Append($"{blob.DisplayName} ");
            }

            log.LogInformation("C# HTTP trigger function processed a request.");

            string responseMessage = $"This HTTP triggered function executed successfully. List of folders are {myStringBuilder.ToString()}";

            return new OkObjectResult(responseMessage);
        }
    }
}
