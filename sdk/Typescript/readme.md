## <connector-name> Connector

This package contains an SDK for the <connector-name> Azure Connector. This SDK allows you to use [connector actions](https://docs.microsoft.com/connectors/<connector-config-name>/#actions) for <connector-name>.

### How to use

This SDK should be used with Azure Connectors. Azure Connectors makes connecting to hundreds of services a simple and consistent experience. To start using this SDK, check out instructions and samples on the [Azure Connectors repo](https://github.com/Azure/Connectors).

Example code:
```typescript
import { create<connector-name>Connector } from "@azure/connectors-<connector-name-lower>";
const connectionString = process.env["CONNECTOR_CONNECTION_STRING"];

module.exports = async function (context) {
    const connectorClient = await create<connector-name>Connector(connectionString);

    // Use connectorClient
};
```