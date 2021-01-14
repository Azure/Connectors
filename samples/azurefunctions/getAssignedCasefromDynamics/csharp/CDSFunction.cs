using System;
using System.IO;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.WebJobs;
using Microsoft.Azure.WebJobs.Extensions.Http;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json;
using Azure.Connectors.CommonDataService;
using System.Linq;

namespace CDS.StaffCase
{
    public static class CDSFunction
    {
        [FunctionName("CDSFunction")]
        public static async Task<IActionResult> Run(
            [HttpTrigger(AuthorizationLevel.Anonymous, "get", "post", Route = null)] HttpRequest req,
            ILogger log)
        {
            log.LogInformation("C# HTTP trigger function processed a request.");

            var cdsConnectionString = System.Environment.GetEnvironmentVariable("CDS_CONNECTION", EnvironmentVariableTarget.Process);

            string userId = req.Query["userId"];

            // CDS Connector
            var cdsConnector = CommonDataServiceConnector.Create(cdsConnectionString);

            // Get the organization
            var orgs = await cdsConnector.CrmDataSetV2.GetDataSetsV2Async();

            // Get the assigned case to the user (Field Service Engineer)
            var assignedCase = await cdsConnector.CrmTableDataV2.GetItemsV2Async(
                 dataset: orgs.Value.First().Name,
                 table: "incidents",
                 top: 1,
                 filter: $"_ownerid_value eq {userId} and statuscode eq 1",
                 expand: "ownerid($select=ownerid)"
             );

            // Get the Customer ID (Accounts) from the case assigned to that Field Service Engineer
            var customerId = assignedCase.Select(e => e.AdditionalProperties["_customerid_value"])?.FirstOrDefault();

            string responseMessage = (customerId) == null
                ? "No customer is assigned to you."
                : $"Customer ID {customerId} is fetched successfully.";

            return new OkObjectResult(responseMessage);
        }
    }
}
