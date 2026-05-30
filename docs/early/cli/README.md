# Azure CLI extension for Connector Namespaces (Early Access)

> **Preview** — The `az connector-namespace` extension is in beta preview. Command names, arguments, and behaviors may change before general availability.

> Looking for a full reference of every command, flag, authentication mode, and error message? See the [**complete CLI reference**](./complete-reference.md).

Manage **`Microsoft.Web/connectorGateways`** (Connector Namespaces) and their children from the Azure CLI — connections, MCP connectors, triggers, identities, access policies, and read-only catalog views.

## Prerequisites

- [Azure CLI](https://learn.microsoft.com/cli/azure/install-azure-cli) ≥ 2.75.0 — verify with `az --version`
- `az login` to an Azure subscription where you have **Owner** or **Contributor**
- (Optional) An Entra ID app registration if you plan to use `OnBehalfOfUserWithApp` or `AppOnly` auth — see [Authentication modes](#authentication-modes)

## Installation

### Linux / macOS

```bash
curl -fsSL https://raw.githubusercontent.com/Azure/Connectors/main/docs/early/cli/install.sh | sh
```

Pin a specific version:

```bash
curl -fsSL https://raw.githubusercontent.com/Azure/Connectors/main/docs/early/cli/install.sh \
  | CONNECTOR_NAMESPACE_VERSION=1.0.0b9 sh
```

### Windows (PowerShell)

```powershell
irm https://raw.githubusercontent.com/Azure/Connectors/main/docs/early/cli/install.ps1 | iex
```

Pin a specific version:

```powershell
& ([scriptblock]::Create((irm https://raw.githubusercontent.com/Azure/Connectors/main/docs/early/cli/install.ps1))) -Version 1.0.0b9
```

### Uninstall

```bash
# Linux / macOS
curl -fsSL https://raw.githubusercontent.com/Azure/Connectors/main/docs/early/cli/install.sh | sh -s -- --uninstall
```

```powershell
# Windows
& ([scriptblock]::Create((irm https://raw.githubusercontent.com/Azure/Connectors/main/docs/early/cli/install.ps1))) -Uninstall
```

### Verify the install

```bash
az extension show --name connector-namespace --query "{name:name, version:version, preview:preview}" -o table
az connector-namespace --help
```

### Direct install (no scripts)

If you don't want to run a remote script, install the wheel directly from the canonical short URL:

```bash
az extension add --upgrade --yes --source https://aka.ms/connector-namespace-whl
```

`https://aka.ms/connector-namespace-whl` always points at the latest published wheel. For a specific version, use the GitHub Release asset URL directly:

```bash
az extension add --upgrade --yes --source \
    https://github.com/Azure/Connectors/releases/download/v<VERSION>/connector_namespace-<VERSION>-py3-none-any.whl
```

---

## Quick Start

This walkthrough creates a Connector Namespace, adds an Office 365 connection, completes OAuth consent, exposes its operations as MCP tools, and mints an API key — copy-paste-able end to end.

```bash
# 0. Log in
az login
az account set --subscription <SUB_ID>

RG=myRG
NS=myConnectorNamespace
LOC=westus2

# 1. Create the resource group
az group create -n $RG -l $LOC

# 2. Create the Connector Namespace
az connector-namespace create -g $RG -n $NS --location $LOC

# 3. Add a managed connection to Office 365
az connector-namespace connection create \
    -g $RG --namespace $NS -n office365Conn \
    --connector-name office365 --display-name "Office 365"

# 4. Complete OAuth consent
TENANT=$(az account show --query tenantId -o tsv)
USER_OID=$(az ad signed-in-user show --query id -o tsv)

#    4a) Get the browser URL
az connector-namespace connection list-consent-links \
    -g $RG --namespace $NS --connection-name office365Conn \
    --parameters '[{
        "objectId": "'$USER_OID'",
        "tenantId": "'$TENANT'",
        "parameterName": "token",
        "redirectUrl": "https://contoso.example/oauth/callback"
    }]'
# → Response carries a `link` URL. Open it in a browser; authorize;
#   copy the `?code=…` query parameter from the redirect URL.

#    4b) Exchange the code for stored credentials
az connector-namespace connection confirm-consent-code \
    -g $RG --namespace $NS --connection-name office365Conn \
    --code <consentCode-from-redirect-url> \
    --object-id $USER_OID --tenant-id $TENANT

# 5. Try the connection
az connector-namespace connection invoke \
    -g $RG --namespace $NS --connection-name office365Conn \
    --request method=GET path=/v1.0/me

# 6. Wrap the connection as an MCP connector for agents
az connector-namespace mcp-connector create \
    -g $RG --namespace $NS -n office365Mcp \
    --connectors '[{"connectionName":"office365Conn"}]'

# 7. Mint a runtime API key for clients
az connector-namespace list-api-key -g $RG --namespace $NS \
    --key-type Primary --never-expire \
    --scope office365Mcp
# → Use the returned primaryAccessKey from your agent to call the gateway's MCP endpoint.

# 8. Clean up
az connector-namespace delete -g $RG -n $NS
```

That's it — zero to functional MCP-enabled connector namespace in under 5 minutes. Read on for the full capability tour.

---

## Deep Dive

- [Namespace lifecycle](#namespace-lifecycle)
- [Identity](#identity)
- [Connections](#connections)
- [OAuth consent flow](#oauth-consent-flow)
- [MCP connectors](#mcp-connectors)
- [Hosted MCP servers](#hosted-mcp-servers)
- [Access policies](#access-policies)
- [Triggers](#triggers)
- [API keys & access keys](#api-keys--access-keys)
- [Managed catalogs](#managed-catalogs)
- [Authentication modes](#authentication-modes)

### Namespace lifecycle

```bash
# Create
az connector-namespace create -g $RG -n $NS --location $LOC

# Create with tags + an API Hub environment id
az connector-namespace create -g $RG -n $NS --location $LOC \
    --tags env=prod team=ai \
    --api-hub-environment-id <uuid>

# Show / list / delete
az connector-namespace show   -g $RG -n $NS
az connector-namespace list   -g $RG
az connector-namespace delete -g $RG -n $NS

# Update is intentionally tag-only — see Reference > Update semantics
az connector-namespace update -g $RG -n $NS --tags env=prod
```

### Identity

The namespace can hold a system-assigned and/or user-assigned identity, used by the gateway to acquire downstream tokens (FIC / OBO).

```bash
# Enable system-assigned identity
az connector-namespace identity assign -g $RG -n $NS --system-assigned

# Add a user-assigned identity
az connector-namespace identity assign -g $RG -n $NS \
    --user-assigned /subscriptions/<sub>/resourceGroups/<rg>/providers/Microsoft.ManagedIdentity/userAssignedIdentities/<name>

# Show / remove
az connector-namespace identity show   -g $RG -n $NS
az connector-namespace identity remove -g $RG -n $NS --system-assigned
```

### Connections

```bash
# Create a managed-connector connection (e.g., Office 365)
az connector-namespace connection create \
    -g $RG --namespace $NS -n office365Conn \
    --connector-name office365 --display-name "Office 365"

# Show / list / update / delete
az connector-namespace connection show   -g $RG --namespace $NS -n office365Conn
az connector-namespace connection list   -g $RG --namespace $NS
az connector-namespace connection update -g $RG --namespace $NS -n office365Conn --tags env=prod
az connector-namespace connection delete -g $RG --namespace $NS -n office365Conn

# Generic authenticated HTTP relay (gateway injects auth from stored creds)
az connector-namespace connection invoke \
    -g $RG --namespace $NS --connection-name office365Conn \
    --request method=GET path=/v1.0/me

# POST with a body
az connector-namespace connection invoke \
    -g $RG --namespace $NS --connection-name office365Conn \
    --request '{"method":"POST","path":"/v1.0/me/sendMail","body":{"message":{"subject":"Hi"}}}'

# Read stored connection keys (rarely needed — the gateway uses them transparently)
az connector-namespace connection list-connection-keys \
    -g $RG --namespace $NS --connection-name office365Conn
```

> **Do not put `Authorization` headers in `--request`** — the gateway injects auth from the stored connection credentials.

### OAuth consent flow

Most managed connectors need OAuth consent before any operation will succeed.

```bash
# Step 1: generate a consent URL (browser-bound)
az connector-namespace connection list-consent-links \
    -g $RG --namespace $NS --connection-name office365Conn \
    --parameters '[{
        "objectId": "'$USER_OID'",
        "tenantId": "'$TENANT'",
        "parameterName": "token",
        "redirectUrl": "https://contoso.example/oauth/callback"
    }]'

# Step 2 (browser): the user authorizes the app and is redirected to
#   `<redirectUrl>?code=<consentCode>`. Copy the `code` query parameter.

# Step 3: exchange the code for stored credentials
az connector-namespace connection confirm-consent-code \
    -g $RG --namespace $NS --connection-name office365Conn \
    --code <consentCode-from-redirect-url> \
    --object-id $USER_OID --tenant-id $TENANT
```

### MCP connectors

Expose a connection's operations as Model Context Protocol tools that AI agents can call.

```bash
# Default: developer-connection mode (one shared credential)
az connector-namespace mcp-connector create \
    -g $RG --namespace $NS -n office365Mcp \
    --connectors '[{"connectionName":"office365Conn"}]'

# On-behalf-of-user (no shared creds — gateway provisions per-caller connections)
az connector-namespace mcp-connector create \
    -g $RG --namespace $NS -n obo-mcp \
    --authentication-mode OnBehalfOfUser \
    --connectors '[{"connectorName":"sql"}]'

# Show / list / update / delete
az connector-namespace mcp-connector show   -g $RG --namespace $NS -n office365Mcp
az connector-namespace mcp-connector list   -g $RG --namespace $NS
az connector-namespace mcp-connector update -g $RG --namespace $NS -n office365Mcp --state Enabled
az connector-namespace mcp-connector delete -g $RG --namespace $NS -n office365Mcp
```

> For OBO mode use the **`connectorName`** key (not `connectionName`) inside each `--connectors` entry — the gateway provisions a per-user connection automatically.

### Hosted MCP servers

The gateway provisions and runs an MCP server container for you. Requires a hosted-MCP-server image id, an admin app registration for the federated identity credential (FIC), and a target downstream resource.

```bash
# Discover valid `--hosted-mcp-server` ids from the
#   https://connectors.azure.com portal (not exposed in the CLI for v1).

ADMIN_APP=<entra-app-client-id-of-admin-app-reg>

az connector-namespace mcp-connector create \
    -g $RG --namespace $NS -n hosted-mcp \
    --kind HostedMcpServer \
    --authentication-mode OnBehalfOfUserWithApp \
    --hosted-mcp-server hosted-mcp-server-id=<id-from-portal> \
    --resource-auth target-resource=https://graph.microsoft.com \
                    admin-app-registration.client-id=$ADMIN_APP
```

Use `--authentication-mode AppOnly` for client-credentials flow (no user-token exchange).

### Access policies

Once a Connection or MCP Connector exists, **only its creator** can use it. Grant access to additional Entra ID principals with `access-policy create`. The schemas intentionally differ between the two:

```bash
# Connection access-policy — NESTED principal (async; carries provisioningState)
TENANT=$(az account show --query tenantId -o tsv)
BOB_OID=<teammate-entra-object-id>

az connector-namespace connection access-policy create \
    -g $RG --namespace $NS --connection-name office365Conn -n grant-bob \
    --principal identity.object-id=$BOB_OID identity.tenant-id=$TENANT type=ActiveDirectory

# MCP Connector access-policy — FLAT principal + separate --principal-type (sync)
az connector-namespace mcp-connector access-policy create \
    -g $RG --namespace $NS --mcp-connector-name office365Mcp -n grant-bob \
    --principal object-id=$BOB_OID tenant-id=$TENANT \
    --principal-type User
```

| | Connection access-policy | MCP-connector access-policy |
|---|---|---|
| Principal shape | `identity.object-id=… identity.tenant-id=… type=ActiveDirectory` | `object-id=… tenant-id=…` |
| Principal type arg | embedded as `type=ActiveDirectory` | separate `--principal-type User\|Group` |
| Operation | Async (returns provisioningState) | Sync |

List + delete are uniform across both:

```bash
az connector-namespace connection access-policy   list    -g $RG --namespace $NS --connection-name office365Conn
az connector-namespace mcp-connector access-policy delete -g $RG --namespace $NS --mcp-connector-name office365Mcp -n grant-bob
```

### Triggers

Webhook-style event sources that call a callback URL when an upstream event fires (e.g., new email).

```bash
# Create
az connector-namespace trigger create \
    -g $RG --namespace $NS -n onNewEmail \
    --connection-details '{"connectionName":"office365Conn","connectorName":"office365"}' \
    --operation-name OnNewEmail \
    --notification-details '{"callbackUrl":"https://contoso.example/callbacks/email"}'

# List, show, update, delete
az connector-namespace trigger list   -g $RG --namespace $NS
az connector-namespace trigger show   -g $RG --namespace $NS -n onNewEmail
az connector-namespace trigger update -g $RG --namespace $NS -n onNewEmail --state Enabled
az connector-namespace trigger delete -g $RG --namespace $NS -n onNewEmail

# Observe executions
az connector-namespace trigger run    list -g $RG --namespace $NS --trigger-name onNewEmail
az connector-namespace trigger run    show -g $RG --namespace $NS --trigger-name onNewEmail -n <run-id>
az connector-namespace trigger status show -g $RG --namespace $NS --trigger-name onNewEmail -n primary
```

### API keys & access keys

Two distinct credentials:

| Command | Plane | Owner | Use |
|---|---|---|---|
| `list-api-key` | Data | Client / agent | Reach the gateway's MCP runtime endpoint |
| `regenerate-access-key` | Control | Admin / ARM | Rotate the namespace's static admin key |

```bash
# Time-bound primary API key scoped to one MCP connector (Linux/WSL syntax)
NOT_AFTER=$(date -u -d '90 days' +'%Y-%m-%dT%H:%M:%SZ')
# macOS / BSD: NOT_AFTER=$(date -u -v+90d +'%Y-%m-%dT%H:%M:%SZ')

az connector-namespace list-api-key -g $RG --namespace $NS \
    --key-type Primary --not-after $NOT_AFTER \
    --scope office365Mcp

# Or a never-expiring key (whole namespace scope)
az connector-namespace list-api-key -g $RG --namespace $NS \
    --key-type Primary --never-expire

# Rotate the static admin access key (control-plane; clients must not see these)
az connector-namespace regenerate-access-key -g $RG --namespace $NS --key-type Primary
```

### Managed catalogs

Three read-only catalogs drive what `mcp-connector create` accepts. Only `connector` and `managed-mcp-operation` are exposed in the CLI for v1; hosted-MCP-server discovery is portal-only.

```bash
# Managed API connectors available in this namespace
az connector-namespace connector list -g $RG --namespace $NS -o table
az connector-namespace connector show -g $RG --namespace $NS -n office365

# MCP-aware operations a managed connector exposes
az connector-namespace managed-mcp-operation list -g $RG --namespace $NS
```

### Authentication modes

When creating an `mcp-connector`, `--authentication-mode` determines who the upstream call runs as.

| Mode | Runs as | Required args | Common use |
|---|---|---|---|
| `NotSpecified` (default) | Connection owner | — | Quick start, single-tenant tools |
| `DeveloperConnection` | Connection owner | `--connectors '[{"connectionName":"…"}]'` | Shared developer credentials |
| `OnBehalfOfUser` | Calling user | `--connectors '[{"connectorName":"…"}]'` | Per-user OAuth, no shared creds |
| `OnBehalfOfUserWithApp` | Calling user, via FIC | `--resource-auth …` + admin app | Enterprise OBO with admin-managed app |
| `AppOnly` | Admin app | `--resource-auth …` | Service-to-service calls |

`--kind HostedMcpServer` **always** requires `OnBehalfOfUserWithApp` or `AppOnly` plus `--resource-auth`.

```bash
# --resource-auth shape
--resource-auth \
    target-resource=https://graph.microsoft.com \
    admin-app-registration.client-id=$ADMIN_APP \
    identity.resource-id=/subscriptions/.../userAssignedIdentities/<name>
```

The gateway exchanges its identity's federated credential against the admin app for a token to `target-resource`.

---

## Reference

### Command tree (45 commands across 9 groups)

| Group | Commands |
|---|---|
| `az connector-namespace` | create · show · list · update · delete · list-api-key · regenerate-access-key |
| `az connector-namespace identity` | assign · remove · show |
| `az connector-namespace connection` | create · show · list · update · delete · invoke · list-connection-keys · list-consent-links · confirm-consent-code |
| `az connector-namespace connection access-policy` | create · show · list · update · delete |
| `az connector-namespace mcp-connector` | create · show · list · update · delete |
| `az connector-namespace mcp-connector access-policy` | create · show · list · update · delete |
| `az connector-namespace trigger` (+ `run`, `status`) | create · show · list · update · delete · run list · run show · status show |
| `az connector-namespace connector` (catalog, read-only) | list · show |
| `az connector-namespace managed-mcp-operation` (catalog) | list |

Full per-command argument reference in [`complete-reference.md`](./complete-reference.md).

### Universal arguments

| Argument | Alias(es) | Description |
|---|---|---|
| `--resource-group` | `-g` | Resource group name |
| `--connector-namespace-name` | `--namespace`, `-n` (on top-level only) | The Connector Namespace name. Prefer `--namespace` — shorter and identical. |
| `--connection-name` | (on connection-scoped commands) | The Connection name |
| `--mcp-connector-name` | `-n` (on `mcp-connector` commands) | The MCP Connector name |
| `--access-policy-name` | `-n` (on access-policy commands) | The access-policy name |
| `--trigger-name` | `-n` (on `trigger` commands) | The trigger name |
| `--output` | `-o` | `json` (default), `jsonc`, `table`, `tsv`, `yaml`, `yamlc`, `none` |
| `--query` | — | JMESPath query — extract specific fields |
| `--subscription` | — | Override the active subscription |

### JSON vs shorthand

Every nested arg accepts both shapes. Shorthand avoids quote-escaping in bash:

| Arg | JSON | Shorthand |
|---|---|---|
| `--principal` (connection access-policy) | `'{"identity":{"objectId":"oid","tenantId":"tid"},"type":"ActiveDirectory"}'` | `identity.object-id=oid identity.tenant-id=tid type=ActiveDirectory` |
| `--principal` (mcp-connector access-policy) | `'{"objectId":"oid","tenantId":"tid"}'` | `object-id=oid tenant-id=tid` |
| `--hosted-mcp-server` | `'{"hostedMcpServerId":"id"}'` | `hosted-mcp-server-id=id` |
| `--resource-auth` | `'{"targetResource":"...","adminAppRegistration":{"clientId":"..."}}'` | `target-resource=... admin-app-registration.client-id=...` |
| `--request` (invoke) | `'{"method":"GET","path":"/v1.0/me"}'` | `method=GET path=/v1.0/me` |
| `--connection-details` (trigger) | `'{"connectionName":"m1","connectorName":"office365"}'` | `connectionName=m1 connectorName=office365` |

### Update semantics

`connector-namespace update` and `connection update` are deliberately narrow:

- **Namespace `update`** — only `--tags` and `--api-hub-environment-id` are honored. All other fields are immutable after creation; to change one, delete + recreate.
- **Connection `update`** — only `--tags` and `--display-name` are honored.

### Common error → fix

| Error | Likely cause | Fix |
|---|---|---|
| `unrecognized arguments: --namespace` | `azure-cli` < 2.75.0 | `az upgrade` or use `--connector-namespace-name <name>` |
| `unrecognized value 'ActiveDirectory' from choices ['Group','User']` | Used connection-shape `--principal` on mcp-connector access-policy (or vice-versa) | Use the correct shape — see [Access policies](#access-policies) |
| `Model 'AAZObjectArg' has no field named 'connectorName'` | Wrong key for the auth mode | `connectionName` for Default/Developer/AppOnly; `connectorName` only for `OnBehalfOfUser` |
| `--hosted-mcp-server-id not recognized` | Tried it as a top-level arg | Nest it: `--hosted-mcp-server hosted-mcp-server-id=<id>` |
| `connection invoke` returns 401 | OAuth consent flow not completed | Run the 3 steps in [OAuth consent flow](#oauth-consent-flow) |
| Agent's API key suddenly returns 401 | Time-bound key expired (silent) | Mint a fresh key — see [API keys & access keys](#api-keys--access-keys) |

Full list in [`complete-reference.md` § Tips & gotchas](./complete-reference.md#tips--gotchas).

### Filing an issue

<https://github.com/Azure/Connectors/issues>. Include `az --version`, `az extension show --name connector-namespace`, the full command (redact secrets), and the full error (run with `--debug` if helpful).

---

## See also

- [`complete-reference.md`](./complete-reference.md) — every command, flag, env var, and error in one place
- [`AGENTS.md`](./AGENTS.md) — AI-agent integration guide (decision tree, refusal rules, asymmetry traps)
- [`examples/`](./examples/) — 6 runnable bash scripts for end-to-end scenarios
