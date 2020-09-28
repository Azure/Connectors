
### Connector Metadata

- List All Managed Connectors:

        az rest --method GET --uri https://management.azure.com/subscriptions/<SubscriptionId>/providers/Microsoft.Web/locations/<location>/managedApis?api-version=2018-07-01-preview

- Get Connector Properties:

        az rest --method GET --uri "https://management.azure.com/subscriptions/<SubscriptionId>/providers/Microsoft.Web/locations/<location>/managedApis/<connectorName>?api-version=2018-07-01-preview"

- Get Connector Swagger Specification:

        az rest --method GET --uri "https://management.azure.com/subscriptions/<SubscriptionId>/providers/Microsoft.Web/locations/<location>/managedApis/<connectorName>?api-version=2018-07-01-preview&export=true"

    Example:

        az rest --method GET --uri "https://management.azure.com/subscriptions/<SubscriptionId>/providers/Microsoft.Web/locations/westcentralus/managedApis/aci?api-version=2018-07-01-preview&export=true" >> aci.json