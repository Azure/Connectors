# Quickstart — first Connector Namespace in 5 minutes

This walkthrough creates a Connector Namespace, adds an Office 365
connection, completes OAuth consent, and exposes its operations as MCP
tools that AI agents can call.

## Prerequisites

- Azure CLI ≥ 2.75.0 — `az --version`
- An Azure subscription with **Owner** or **Contributor** rights
- (Optional) An Entra ID app registration for OBO/AppOnly auth (see
  [`authentication.md`](./authentication.md))

## 1 — Install the extension

```bash
az extension add --source https://connectorscli.blob.core.windows.net/pipeline/connector-1.0.0b1-py3-none-any.whl
```

> The wheel is hosted on a Microsoft-managed Azure Storage account
> behind JIT-controlled write access. Uploads are gated by an Azure
> DevOps pipeline approval — only release managers + security can
> publish a new version.

Verify:

```bash
az connector --help
```

## 2 — Pick a subscription + create a resource group

```bash
az account set --subscription <subscription-id>
az group create -n myRG -l westus2
```

## 3 — Create the Connector Namespace

```bash
az connector create -g myRG -n myConnectorNamespace --location westus2
```

Takes ~30 seconds. When it returns, you have an empty namespace.

```bash
az connector show -g myRG -n myConnectorNamespace -o table
```

## 4 — Add an Office 365 connection

```bash
az connector connection create \
    -g myRG --namespace myConnectorNamespace -n office365Conn \
    --connector-name office365 --display-name "Office 365"
```

The connection is created but **needs consent** before any operation
will succeed.

## 5 — Complete OAuth consent

Generate a consent URL:

```bash
az connector connection list-consent-links \
    -g myRG --namespace myConnectorNamespace --connection-name office365Conn \
    --parameters '[{
        "objectId": "<your-entra-object-id>",
        "tenantId": "<your-tenant-id>",
        "parameterName": "token",
        "redirectUrl": "https://contoso.example/callback"
    }]'
```

Open the `link` from the response in a browser. After you authorize,
the browser is redirected to your `redirectUrl?code=<consentCode>`.

Exchange the code:

```bash
az connector connection confirm-consent-code \
    -g myRG --namespace myConnectorNamespace --connection-name office365Conn \
    --code <consentCode-from-redirect-url> \
    --object-id <your-entra-object-id> \
    --tenant-id <your-tenant-id>
```

## 6 — Try the connection

```bash
az connector connection invoke \
    -g myRG --namespace myConnectorNamespace --connection-name office365Conn \
    --request method=GET path=/v1.0/me
```

You should get back your Microsoft Graph user profile.

## 7 — Expose it as an MCP connector for agents

```bash
az connector mcp-connector create \
    -g myRG --namespace myConnectorNamespace -n office365Mcp \
    --connectors '[{"connectionName":"office365Conn"}]'
```

## 8 — Mint a runtime API key clients can use

```bash
az connector list-api-key \
    -g myRG --namespace myConnectorNamespace \
    --key-type Primary --never-expire \
    --scope '{"mcpServerConfigName":"office365Mcp"}'
```

The returned `primaryAccessKey` is what your AI agent uses to call the
gateway's MCP endpoint.

---

## Next

- Authorize a teammate to use the connection — see
  [`cookbook.md` Recipe 3](./cookbook.md#recipe-3--grant-a-teammate-access-to-a-connection).
- Switch to per-user (OBO) auth — see
  [`cookbook.md` Recipe 5](./cookbook.md#recipe-5--on-behalf-of-user-obo-mcp-connector).
- Set up a webhook trigger — see
  [`cookbook.md` Recipe 8](./cookbook.md#recipe-8--webhook-trigger-on-new-email).
