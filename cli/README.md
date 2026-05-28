# Connector Namespaces — Azure CLI Extension

> Manage **`Microsoft.Web/connectorGateways`** Connector Namespaces and
> their children from the Azure CLI.

The wheel in [`dist/`](./dist/) is the official preview release of the
`az connector` extension. See [`docs/`](./docs/) for usage, and
[`examples/`](./examples/) for copy-runnable scripts.

> ⚠️ **Preview.** Command names, arguments, and behaviors may change
> before general availability.

---

## Install

```bash
az extension add --source \
    https://github.com/Azure/Connectors/raw/main/cli/dist/connector-1.0.0b1-py3-none-any.whl
```

Or grab the wheel locally:

```bash
az extension add --source ./cli/dist/connector-1.0.0b1-py3-none-any.whl
```

Verify:

```bash
az extension show --name connector --query "{name:name, version:version, preview:preview}" -o table
az connector --help
```

Uninstall when done:

```bash
az extension remove --name connector
```

---

## What can I do?

| Goal | Where to look |
|---|---|
| **Get started in 5 minutes** | [`docs/quickstart.md`](./docs/quickstart.md) |
| **Learn the command tree** | [`docs/commands.md`](./docs/commands.md) |
| **Copy-paste a recipe** | [`docs/cookbook.md`](./docs/cookbook.md) — 10 end-to-end recipes |
| **Authenticate / authorize callers** | [`docs/authentication.md`](./docs/authentication.md) |
| **Debug an error message** | [`docs/troubleshooting.md`](./docs/troubleshooting.md) |
| **Run a complete scenario as a script** | [`examples/`](./examples/) |
| **AI assistant integration** | [`AGENTS.md`](./AGENTS.md) |

---

## Quick tour

```bash
RG=myRG
NS=myConnectorNamespace
LOC=westus2

# Create a Connector Namespace
az connector create -g $RG -n $NS --location $LOC

# Add an Office 365 connection
az connector connection create -g $RG --namespace $NS -n office365Conn \
    --connector-name office365 --display-name "Office 365"

# Complete OAuth consent (see docs/cookbook.md Recipe 2)

# Wrap operations as an MCP connector
az connector mcp-connector create -g $RG --namespace $NS -n office365Mcp \
    --connectors '[{"connectionName":"office365Conn"}]'

# Mint a runtime API key
az connector list-api-key -g $RG --namespace $NS --key-type Primary --never-expire
```

---

## Concepts

| Concept | What it is |
|---|---|
| **Connector Namespace** | Top-level `Microsoft.Web/connectorGateways` resource. Owns connections, MCP connectors, triggers, and auth keys. |
| **Connection** | A configured managed-connector instance (Office 365, SQL, …) with stored OAuth credentials. |
| **MCP Connector** | Exposes a connector's operations as Model Context Protocol tools for AI agents. |
| **Access Policy** | Authorizes one Entra ID principal (user or group) on a Connection or MCP Connector. |
| **Trigger** | Webhook-style event source that calls a callback URL. |
| **API Key** | Short-lived runtime credential clients use to reach the gateway's MCP endpoint. |
| **Access Key** | Static control-plane credential for ARM-level admin. |

---

## Reporting issues

File issues at <https://github.com/Azure/Connectors/issues> and tag with
**`area: cli`**.

For security issues, see the repo's [`SECURITY.md`](../SECURITY.md).
