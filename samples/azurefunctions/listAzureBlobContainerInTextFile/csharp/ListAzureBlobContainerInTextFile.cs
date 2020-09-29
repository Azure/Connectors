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
using Azure.Connectors.AzureBlobStorage;

namespace Company.Function
{
    public static class ListAzureBlobContainerInTextFile
    {
        [FunctionName("ListAzureBlobContainerInTextFile")]
        public static async Task<IActionResult> Run(
            [HttpTrigger(AuthorizationLevel.Anonymous, "get", "post", Route = null)] HttpRequest req,
            ILogger log)
        {
            // get connection string from app settings and create connector
            var azureblobConnectionString = System.Environment.GetEnvironmentVariable("AZUREBLOB_CONNECTION", EnvironmentVariableTarget.Process);
            var azureblobConnector = AzureBlobStorageConnector.Create(azureblobConnectionString);

            // compile list of blob containers in this storage account
            var blobContainerMetadataList = new List<Azure.Connectors.AzureBlobStorage.Models.BlobMetadata>();
            var blobContainerMetadatas = await azureblobConnector.FileTransferFolderData.ListRootFolderV2Async();
            string nextLink = blobContainerMetadatas.NextPageLink;
            do
            {
                foreach(var blobContainerMetadata in blobContainerMetadatas)
                {
                    blobContainerMetadataList.Add(blobContainerMetadata);
                }

                if(!string.IsNullOrEmpty(nextLink))
                {
                    blobContainerMetadatas = await azureblobConnector.FileTransferFolderData.ListRootFolderV2NextAsync(
                        nextPageLink: nextLink
                    );
                    nextLink = blobContainerMetadatas.NextPageLink;
                }
            }
            while(!string.IsNullOrEmpty(nextLink));

            // convert blob container names to a string
            StringBuilder myStringBuilder = new StringBuilder();
            foreach(var blob in blobContainerMetadataList)
            {
                myStringBuilder.Append($"{blob.DisplayName} ");
            }

            // create text file from string and create file in the resultsContainer container
            var containerListAsByteArray = System.Text.Encoding.ASCII.GetBytes(myStringBuilder.ToString());
            await azureblobConnector.AzureBlobFileData.CreateFileAsync(
                "resultscontainer/", 
                "listOfContainers.txt", 
                new MemoryStream(containerListAsByteArray), contentType: 
                "application/octet-stream");

            log.LogInformation("C# HTTP trigger function processed a request.");

            // display this string as a response as well
            string responseMessage = $"This HTTP triggered function executed successfully. List of folders are {myStringBuilder.ToString()}";

            return new OkObjectResult(responseMessage);
        }
    }
}
