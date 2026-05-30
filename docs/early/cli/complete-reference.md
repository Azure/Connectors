# `az connector-namespace` complete reference

Reference documentation for the `connector-namespace` Azure CLI extension. Covers installation, every command group, authentication, argument shapes, and every error message we know about. Each section is independent — jump to whichever topic you need.

> Verified against `connector-namespace 1.0.0b9`. Every snippet was executed before being pasted.

## Contents

- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Quick start](#quick-start)
- [Command tree](#command-tree)
- [Authentication](#authentication)
- [Argument shapes](#argument-shapes)
- [Output formats](#output-formats)
- [Update semantics](#update-semantics)
- [Tips & gotchas](#tips--gotchas)
- [Discovering Entra IDs](#discovering-entra-ids)
- [Filing an issue](#filing-an-issue)

---

## Prerequisites

- **Azure CLI ≥ 2.75.0** — verify with `az --version`. Older builds can't load the extension's argument aliases.
- **`az login`** to an Azure subscription where you have **Owner** or **Contributor**.
- **(Optional) Entra ID app registration** if you intend to use `OnBehalfOfUserWithApp` or `AppOnly` authentication modes — see [Authentication](#authentication).

[↑ Back to top](#contents)

---

## Installation

### Linux / macOS

```bash
curl -fsSL https://raw.githubusercontent.com/Azure/Connectors/main/docs/early/cli/install.sh | sh
```

### Windows (PowerShell)

```powershell
irm https://raw.githubusercontent.com/Azure/Connectors/main/docs/early/cli/install.ps1 | iex
```

### Version pinning

By default the installer uses [`https://aka.ms/connector-namespace-whl`](https://aka.ms/connector-namespace-whl) — a stable shortlink that always points at the latest published wheel. To pin a specific version, the installer instead resolves the matching GitHub Release asset URL:

```bash
# Linux / macOS
curl -fsSL https://raw.githubusercontent.com/Azure/Connectors/main/docs/early/cli/install.sh \
  | CONNECTOR_NAMESPACE_VERSION=1.0.0b9 sh
```

```powershell
# Windows
& ([scriptblock]::Create((irm https://raw.githubusercontent.com/Azure/Connectors/main/docs/early/cli/install.ps1))) -Version 1.0.0b9
```

### Direct install (no scripts)

```bash
# Always-latest
az extension add --upgrade --yes --source https://aka.ms/connector-namespace-whl

# Specific version
az extension add --upgrade --yes --source \
    https://github.com/Azure/Connectors/releases/download/v1.0.0b9/connector_namespace-1.0.0b9-py3-none-any.whl
```

### Uninstall

```bash
curl -fsSL https://raw.githubusercontent.com/Azure/Connectors/main/docs/early/cli/install.sh | sh -s -- --uninstall
```

```powershell
& ([scriptblock]::Create((irm https://raw.githubusercontent.com/Azure/Connectors/main/docs/early/cli/install.ps1))) -Uninstall
```

### Verify

```bash
az extension show --name connector-namespace --query "{name:name, version:version, preview:preview}" -o table
# Name                 Version   Preview
# -------------------  --------  ---------
# connector-namespace  1.0.0b9   True

az connector-namespace --help
```

### Wheel provenance

The wheel is built by the OneBranch [`python-official-connector`](https://msazure.visualstudio.com/One/_build?definitionId=462678) pipeline and published as a GitHub Release. Each release tag `vX.Y.ZbN` carries:

- `connector_namespace-X.Y.ZbN-py3-none-any.whl` — the wheel
- `SHA-256` of the wheel (verify against the release notes before installing in production)
- SPDX SBOM and build provenance manifest

[↑ Back to top](#contents)

---

## Quick start

```bash
az login
az account set --subscription <SUB_ID>

RG=myRG
NS=myConnectorNamespace
LOC=westus2

az group create -n $RG -l $LOC
az connector-namespace create -g $RG -n $NS --location $LOC

az connector-namespace connection create \
    -g $RG --namespace $NS -n office365Conn \
    --connector-name office365 --display-name "Office 365"

# … complete OAuth consent (see README Quick Start steps 4a/4b) …

az connector-namespace connection invoke \
    -g $RG --namespace $NS --connection-name office365Conn \
    --request method=GET path=/v1.0/me
```

Full annotated flow with cleanup is in the [README Quick Start](./README.md#quick-start).

[↑ Back to top](#contents)

---

## Command tree

45 commands across 9 sub-groups. All commands accept `--help` for per-command argument documentation; `az <command> --help` is always the freshest reference for flag names and shapes.

### Namespace (top-level)

| Command | Purpose |
|---|---|
| `az connector-namespace create` | Create a Connector Namespace. |
| `az connector-namespace show` | Get a Connector Namespace. |
| `az connector-namespace list` | List namespaces in the subscription / resource group. |
| `az connector-namespace update` | Update tags or `--api-hub-environment-id` (other fields are immutable — see [Update semantics](#update-semantics)). |
| `az connector-namespace delete` | Delete a namespace and **all** of its child resources. |
| `az connector-namespace list-api-key` | Issue a runtime API key for clients. **Data-plane.** |
| `az connector-namespace regenerate-access-key` | Rotate the primary or secondary access key. **Control-plane.** |

### Identity (on the namespace)

| Command | Purpose |
|---|---|
| `az connector-namespace identity assign` | Enable system-assigned and/or attach user-assigned identities. |
| `az connector-namespace identity remove` | Remove system-assigned and/or user-assigned identities. |
| `az connector-namespace identity show` | Show the namespace's managed-identity configuration. |

### Connection

| Command | Purpose |
|---|---|
| `az connector-namespace connection create` | Create a managed-connector connection. |
| `az connector-namespace connection show` | Get a connection. |
| `az connector-namespace connection list` | List connections in the namespace. |
| `az connector-namespace connection update` | Update a connection's tags / display name. |
| `az connector-namespace connection delete` | Delete a connection. |
| `az connector-namespace connection list-consent-links` | Step 1 of OAuth consent — returns a browser URL. |
| `az connector-namespace connection confirm-consent-code` | Step 2 of OAuth consent — exchange the redirect code for stored credentials. |
| `az connector-namespace connection list-connection-keys` | Read stored connection keys (e.g., API-key auth). Rare in practice. |
| `az connector-namespace connection invoke` | Forward an HTTP request through the connection — gateway injects auth. |

### Connection access-policy

| Command | Purpose |
|---|---|
| `az connector-namespace connection access-policy create` | Grant an Entra ID principal access to a connection. |
| `az connector-namespace connection access-policy show` | Get an access policy. |
| `az connector-namespace connection access-policy list` | List access policies on a connection. |
| `az connector-namespace connection access-policy update` | Update an access policy. |
| `az connector-namespace connection access-policy delete` | Revoke an access policy. |

### MCP Connector

| Command | Purpose |
|---|---|
| `az connector-namespace mcp-connector create` | Create an MCP connector. |
| `az connector-namespace mcp-connector show` | Get an MCP connector. |
| `az connector-namespace mcp-connector list` | List MCP connectors in the namespace. |
| `az connector-namespace mcp-connector update` | Update an MCP connector. |
| `az connector-namespace mcp-connector delete` | Delete an MCP connector. |

### MCP Connector access-policy

| Command | Purpose |
|---|---|
| `az connector-namespace mcp-connector access-policy create` | Grant an Entra ID principal access to an MCP connector. |
| `az connector-namespace mcp-connector access-policy show` | Get an access policy. |
| `az connector-namespace mcp-connector access-policy list` | List access policies on an MCP connector. |
| `az connector-namespace mcp-connector access-policy update` | Update an access policy. |
| `az connector-namespace mcp-connector access-policy delete` | Revoke an access policy. |

### Trigger

| Command | Purpose |
|---|---|
| `az connector-namespace trigger create` | Create a webhook-style trigger. |
| `az connector-namespace trigger show` | Get a trigger. |
| `az connector-namespace trigger list` | List triggers in the namespace. |
| `az connector-namespace trigger update` | Update a trigger. |
| `az connector-namespace trigger delete` | Delete a trigger. |
| `az connector-namespace trigger run list` | List trigger executions. |
| `az connector-namespace trigger run show` | Get one trigger execution. |
| `az connector-namespace trigger status show` | Get the trigger's subscription/lifecycle status. |

### Managed catalogs (read-only)

| Command | Purpose |
|---|---|
| `az connector-namespace connector list` | List managed connectors available in the namespace. |
| `az connector-namespace connector show` | Inspect one managed connector. |
| `az connector-namespace managed-mcp-operation list` | List MCP-aware operations a managed connector exposes. |

> Hosted-MCP-server image discovery is not exposed in the CLI for v1 — get valid `--hosted-mcp-server` ids from the [Connectors portal](https://connectors.azure.com).

[↑ Back to top](#contents)

---

## Authentication

The extension involves **four distinct credential concepts**. Mixing them up is the #1 source of errors.

| Concept | Plane | Owner | Lifetime | Used to … |
|---|---|---|---|---|
| **API key** (`list-api-key`) | Data | Client (agent) | Time-bound or `--never-expire` | Reach the gateway's MCP runtime endpoint. |
| **Access key** (`regenerate-access-key`) | Control | Admin / ARM | Static until rotated | Manage the namespace via ARM. |
| **Managed identity** (`identity`) | Both | The namespace itself | Lifetime of the namespace | Acquire downstream tokens (OBO / AppOnly). |
| **Connection credentials** (OAuth consent) | Data | The connection | Refreshed automatically | Authenticate to the upstream connector (e.g. Microsoft Graph). |

### When to use what

```
Caller is …
├─ An AI agent invoking MCP tools                                  → API key (data plane)
├─ A developer/admin running az commands                           → ARM (`az login`) + RBAC
├─ The gateway itself, acquiring downstream tokens for a hosted
│  MCP server or OBO flow                                          → Managed identity + FIC
└─ The user, completing an OAuth flow for a connection             → Browser consent (no key)
```

### Authentication-mode matrix for `mcp-connector create`

| `--authentication-mode` | Runs as | Required args | Common use |
|---|---|---|---|
| `NotSpecified` (default) | Connection owner | — | Quick start, single-tenant tools |
| `DeveloperConnection` | Connection owner | `--connectors '[{"connectionName":"…"}]'` | Shared developer credentials |
| `OnBehalfOfUser` | Calling user | `--connectors '[{"connectorName":"…"}]'` | Per-user OAuth, no shared creds |
| `OnBehalfOfUserWithApp` | Calling user, via FIC | `--resource-auth …` + admin app | Enterprise OBO with admin-managed app |
| `AppOnly` | Admin app | `--resource-auth …` | Service-to-service calls |

`--kind HostedMcpServer` **always** requires `OnBehalfOfUserWithApp` or `AppOnly` plus `--resource-auth`.

### `--resource-auth` shape

```bash
--resource-auth \
    target-resource=https://graph.microsoft.com \
    admin-app-registration.client-id=00000000-0000-0000-0000-000000000000 \
    identity.resource-id=/subscriptions/.../userAssignedIdentities/<name>
```

The gateway exchanges its identity's federated identity credential against the admin app registration for a token to `target-resource`.

### Access policies: connection vs MCP connector

The two access-policy command groups intentionally have different schemas:

| | Connection access-policy | MCP-connector access-policy |
|---|---|---|
| Principal shape | NESTED — `identity.object-id=… identity.tenant-id=… type=ActiveDirectory` | FLAT — `object-id=… tenant-id=…` |
| Principal type arg | Embedded in `--principal` as `type=ActiveDirectory` | Separate `--principal-type User\|Group` |
| Operation kind | Async (carries `provisioningState`) | Sync |
| Allowed type values | `ActiveDirectory` only | `User` or `Group` only |

If you confuse them you'll see the error `unrecognized value 'ActiveDirectory' from choices ['Group', 'User']` or `unrecognized value 'User' from choices ['ActiveDirectory']` — see [Tips & gotchas](#tips--gotchas).

### API key recipes

```bash
# Time-bound primary key scoped to one MCP connector (Linux / WSL syntax)
NOT_AFTER=$(date -u -d '90 days' +'%Y-%m-%dT%H:%M:%SZ')
# macOS / BSD: NOT_AFTER=$(date -u -v+90d +'%Y-%m-%dT%H:%M:%SZ')

az connector-namespace list-api-key -g $RG --namespace $NS \
    --key-type Primary --not-after $NOT_AFTER \
    --scope office365Mcp

# Never-expiring primary key, namespace-wide
az connector-namespace list-api-key -g $RG --namespace $NS \
    --key-type Primary --never-expire
```

Rotation: mint a new one before the old expires. The old key remains valid until its `notAfter` time (or forever if `--never-expire`).

### Access-key rotation (two-key pattern)

For ARM/RP-level admin only — clients **must not** see these.

```bash
# 1. Clients are on Primary. Rotate Secondary.
az connector-namespace regenerate-access-key -g $RG --namespace $NS --key-type Secondary

# 2. Move clients to Secondary.

# 3. Rotate Primary.
az connector-namespace regenerate-access-key -g $RG --namespace $NS --key-type Primary
```

[↑ Back to top](#contents)

---

## Argument shapes

Every nested argument accepts both JSON and shorthand. Prefer shorthand in bash to avoid quote-escaping.

### Reference table

| Arg | JSON | Shorthand |
|---|---|---|
| `--principal` (connection access-policy) | `'{"identity":{"objectId":"oid","tenantId":"tid"},"type":"ActiveDirectory"}'` | `identity.object-id=oid identity.tenant-id=tid type=ActiveDirectory` |
| `--principal` (mcp-connector access-policy) | `'{"objectId":"oid","tenantId":"tid"}'` | `object-id=oid tenant-id=tid` |
| `--hosted-mcp-server` | `'{"hostedMcpServerId":"my-mcp"}'` | `hosted-mcp-server-id=my-mcp` |
| `--resource-auth` | `'{"targetResource":"https://graph.microsoft.com","adminAppRegistration":{"clientId":"…"}}'` | `target-resource=https://graph.microsoft.com admin-app-registration.client-id=…` |
| `--request` (invoke) | `'{"method":"GET","path":"/v1.0/me"}'` | `method=GET path=/v1.0/me` |
| `--connection-details` (trigger) | `'{"connectionName":"m1","connectorName":"office365"}'` | `connectionName=m1 connectorName=office365` |
| `--notification-details` (trigger) | `'{"callbackUrl":"https://…"}'` | `callback-url=https://…` |
| `--connectors` (mcp-connector) | `'[{"connectionName":"office365Conn"}]'` | (use JSON; arrays don't shorthand well) |
| `--parameters` (list-consent-links) | `'[{"objectId":"...","tenantId":"...","parameterName":"token","redirectUrl":"..."}]'` | (use JSON) |
| `--scope` (list-api-key) | (plain string — the MCP server config name, e.g. `office365Mcp`) | n/a |
| `--tags` | `'{"env":"prod","team":"ai"}'` | `env=prod team=ai` |

### Enum values

| Arg | Allowed values |
|---|---|
| `--authentication-mode` (mcp-connector) | `NotSpecified`, `DeveloperConnection`, `OnBehalfOfUser`, `OnBehalfOfUserWithApp`, `AppOnly` |
| `--kind` (mcp-connector) | `NotSpecified`, `ManagedMcpServer`, `HostedMcpServer` |
| `--state` (mcp-connector, trigger) | `Enabled`, `Disabled` |
| `--key-type` (list-api-key, regenerate-access-key) | `Primary`, `Secondary` |
| `--principal-type` (mcp-connector access-policy) | `User`, `Group` (**not** `ActiveDirectory`) |
| `type=…` (in connection access-policy `--principal`) | `ActiveDirectory` (**not** `User`/`Group`) |

[↑ Back to top](#contents)

---

## Output formats

Every command honors `-o / --output`:

| Format | When to use |
|---|---|
| `json` (default) | Scripting, full fidelity |
| `jsonc` | JSON with colorized syntax for terminals |
| `table` | Human-readable; collapses nested fields |
| `tsv` | Pipe-friendly (e.g. `\| xargs -I {} az …`) |
| `yaml` / `yamlc` | YAML output / colorized YAML |
| `none` | Suppress output entirely (useful in scripts) |

Combine with `--query` (JMESPath) to extract specific fields:

```bash
# Get just the principal access key
az connector-namespace list-api-key -g $RG --namespace $NS --key-type Primary --never-expire \
    --query primaryAccessKey -o tsv

# Tabulate connections with name + provisioningState
az connector-namespace connection list -g $RG --namespace $NS \
    --query "[].{name:name, state:properties.provisioningState}" -o table
```

[↑ Back to top](#contents)

---

## Update semantics

| Command | Mutable fields |
|---|---|
| `connector-namespace update` | `--tags`, `--api-hub-environment-id` |
| `connection update` | `--tags`, `--display-name` |
| `mcp-connector update` | `--tags`, `--state` (`Enabled`/`Disabled`), and a handful of behavior knobs |
| `trigger update` | `--tags`, `--state`, `--notification-details` |
| Identity / access-policy | full PATCH semantics — most fields editable |

For everything else, **delete and recreate**. The extension intentionally narrows the update surface during preview to keep the contract small.

[↑ Back to top](#contents)

---

## Tips & gotchas

### `unrecognized arguments: --namespace`

You're on `azure-cli` < 2.75.0 — it can't load the extension's argument aliases.

```bash
az upgrade
# or fall back to the full name:
az connector-namespace create -g $RG --connector-namespace-name $NS --location $LOC
```

### `unrecognized value 'ActiveDirectory' from choices ['Group', 'User']`

You used the **connection-shape** `--principal` on an **mcp-connector access-policy** (or vice-versa). Their schemas differ on purpose:

```bash
# ✅ Connection access-policy (nested + type=ActiveDirectory)
--principal identity.object-id=<oid> identity.tenant-id=<tid> type=ActiveDirectory

# ✅ MCP-connector access-policy (flat + --principal-type User|Group)
--principal object-id=<oid> tenant-id=<tid>
--principal-type User
```

### `Model 'AAZObjectArg' has no field named 'connectorName'` (or `'connectionName'`)

You used the wrong key inside the `--connectors` list. Which key depends on `--authentication-mode`:

| Authentication mode | Use this key |
|---|---|
| Default / `DeveloperConnection` | `connectionName` |
| `OnBehalfOfUser` | `connectorName` (no specific connection — gateway creates per-user) |
| `OnBehalfOfUserWithApp` / `AppOnly` | `connectionName` |

### `argument value cannot be blank`

You tried `--tags ""` to clear all tags. The CLI rejects blank strings. Workarounds:

```bash
# Leave tags unchanged: omit --tags entirely.
az connector-namespace update -g $RG -n $NS --api-hub-environment-id <uuid>

# Replace tags with new ones (the only way to "shrink" the map):
az connector-namespace update -g $RG -n $NS --tags env=prod
```

There's no first-class "clear all tags" gesture today.

### `Failed to parse '--request' argument`

`connection invoke --request` needs at least `method` and `path`:

```bash
# ✅ Shorthand
--request method=GET path=/v1.0/me

# ✅ Full JSON
--request '{"method":"GET","path":"/v1.0/me"}'
```

Don't pass `--request` as a bare string or as a YAML file path without `@`.

### `--hosted-mcp-server-id not recognized`

`hostedMcpServerId` is nested **inside** `--hosted-mcp-server`, not a top-level arg:

```bash
# ✅
--hosted-mcp-server hosted-mcp-server-id=<id-from-portal>
```

Get valid ids from the [Connectors portal](https://connectors.azure.com) — hosted-MCP-server-image discovery is not exposed in the CLI for v1.

### `connection invoke` returns 401 even though the connection was created

OAuth consent isn't complete. After `connection create`:

1. `az connector-namespace connection list-consent-links` — get the browser URL
2. Browser: user authorizes the app and is redirected to `<redirectUrl>?code=<consentCode>`
3. `az connector-namespace connection confirm-consent-code` — exchange the code

Until step 3 completes, no operations on that connection will succeed.

### Agent's API key suddenly returns 401

The `notAfter` time elapsed. Time-bound keys expire silently — they return 401, not a more descriptive error:

```bash
# Mint a fresh key
az connector-namespace list-api-key -g $RG --namespace $NS \
    --key-type Primary --never-expire \
    --scope <your-mcp>
```

If you rotated the access key (`regenerate-access-key`), API keys issued before the rotation may also be invalidated.

### Where does the OAuth `code` come from?

It's the `code` query parameter on the URL the user is redirected to **after** authorizing in the browser:

If your redirect URL is `https://contoso.example/cb`, the browser ends up at  
`https://contoso.example/cb?code=44ebcb40e38b4d179b1a7d4c39904b22`  
after consent. The hex string after `code=` is what `confirm-consent-code --code` wants.

### `connector-namespace update` ignores my `--set properties.foo=bar`

By design — see [Update semantics](#update-semantics). Only `--tags` and `--api-hub-environment-id` are honored. To change any other field, delete and recreate the namespace.

[↑ Back to top](#contents)

---

## Discovering Entra IDs

Most access-policy commands need an Entra ID `objectId` and `tenantId`:

```bash
# Your own
az ad signed-in-user show --query id -o tsv          # your objectId
az account show --query tenantId -o tsv               # tenantId

# A teammate (by UPN)
az ad user show --id bob@contoso.com --query id -o tsv

# A group (by display name)
az ad group show --group "My Group Name" --query id -o tsv
```

[↑ Back to top](#contents)

---

## Filing an issue

If your problem isn't covered above, file an issue at <https://github.com/Azure/Connectors/issues> with:

1. Output of `az --version`
2. Output of `az extension show --name connector-namespace`
3. The full command you ran (redact secrets)
4. The full error message (run with `--debug` if helpful)

[↑ Back to top](#contents)

---

## See also

- [README](./README.md) — overview, install, quick start, capability-by-capability walkthrough
- [AGENTS.md](./AGENTS.md) — AI-agent integration guide (decision tree, refusal rules, asymmetry traps)
- [`examples/`](./examples/) — 6 runnable bash scripts for end-to-end scenarios
