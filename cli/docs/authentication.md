# Authentication & Authorization

The Connector Namespaces extension has **four distinct credential
concepts**. Mixing them up is the #1 source of errors.

| Concept | Plane | Owner | Lifetime | Used to … |
|---|---|---|---|---|
| **API key** (`list-api-key`) | Data | Client (agent) | Time-bound or `--never-expire` | Reach the gateway's MCP runtime endpoint. |
| **Access key** (`regenerate-access-key`) | Control | Admin / ARM | Static until rotated | Manage the namespace via ARM. |
| **Managed identity** (`identity`) | Both | The namespace itself | Lifetime of the namespace | Acquire downstream tokens (OBO/AppOnly). |
| **Connection credentials** (OAuth consent) | Data | The connection | Refreshed automatically | Authenticate to the upstream connector (e.g. Microsoft Graph). |

---

## When to use what

```
Caller is …
├─ An AI agent invoking MCP tools          → API key (data-plane)
├─ A developer/admin running az commands   → ARM (`az login`) + RBAC
├─ The gateway itself, acquiring downstream tokens
│  for a hosted MCP server / OBO flow      → Managed identity + FIC
└─ The user, completing an OAuth flow
   for a connection                        → Browser consent (no key)
```

### API key (data plane)

Mint a runtime credential that agents/clients can use to call the
gateway's MCP endpoint.

```bash
# Whole-namespace, 90 days, primary
NOT_AFTER=$(date -u -d '90 days' +'%Y-%m-%dT%H:%M:%SZ')
az connector-namespace list-api-key -g $RG --namespace $NS \
    --key-type Primary --not-after $NOT_AFTER

# Or never-expire, scoped to one MCP connector
az connector-namespace list-api-key -g $RG --namespace $NS \
    --key-type Primary --never-expire \
    --scope '{"mcpServerConfigName":"office365Mcp"}'
```

Rotation: mint a new one before the old expires. The old key remains
valid until its `notAfter` time (or forever if `--never-expire`).

### Access key (control plane)

For ARM/RP-level admin only — clients **must not** see these.

```bash
# Rotate primary
az connector-namespace regenerate-access-key -g $RG --namespace $NS --key-type Primary

# Rotate secondary
az connector-namespace regenerate-access-key -g $RG --namespace $NS --key-type Secondary
```

Rotating invalidates existing tooling that authenticates with that key.
Use the two-key rotation pattern: clients on `Primary`, rotate
`Secondary`, switch clients to `Secondary`, rotate `Primary`.

### Managed identity (for the namespace itself)

The namespace can acquire downstream tokens (e.g., to call Microsoft
Graph from a hosted MCP server) using a **system-assigned** or
**user-assigned** identity.

```bash
# Enable system-assigned identity
az connector-namespace identity assign -g $RG -n $NS --system-assigned

# Add a user-assigned identity
az connector-namespace identity assign -g $RG -n $NS \
    --user-assigned /subscriptions/<sub>/resourceGroups/<rg>/providers/Microsoft.ManagedIdentity/userAssignedIdentities/<name>

# Inspect
az connector-namespace identity show -g $RG -n $NS

# Remove
az connector-namespace identity remove -g $RG -n $NS --system-assigned
```

### Connection credentials (OAuth)

Stored on the connection itself after the consent flow. Never
extracted as a raw token — the gateway injects them automatically on
`connection invoke` and MCP tool calls.

See [`cookbook.md` Recipe 2](./cookbook.md#recipe-2--oauth-consent-flow-for-a-connection).

---

## Authentication mode matrix for MCP Connectors

When creating an `mcp-connector`, `--authentication-mode` determines
who the upstream call runs as.

| Mode | Runs as | Required args | Common use |
|---|---|---|---|
| `NotSpecified` (default) | Connection owner | — | Quick start, single-tenant tools |
| `DeveloperConnection` | Connection owner | `--connectors '[{"connectionName":"…"}]'` | Shared developer credentials |
| `OnBehalfOfUser` | The calling user | `--connectors '[{"connectorName":"…"}]'` | Per-user OAuth, no shared creds |
| `OnBehalfOfUserWithApp` | The calling user, via FIC | `--resource-auth …` + admin app | Enterprise OBO with admin-managed app |
| `AppOnly` | The admin app | `--resource-auth …` | Service-to-service calls |

**Hosted MCP servers** (`--kind HostedMcpServer`) always require
`OnBehalfOfUserWithApp` or `AppOnly` plus `--resource-auth`.

### `--resource-auth` shape

```bash
--resource-auth \
    target-resource=https://graph.microsoft.com \
    admin-app-registration.client-id=00000000-0000-0000-0000-000000000000 \
    identity.resource-id=/subscriptions/.../userAssignedIdentities/<name>
```

The gateway exchanges its identity's federated identity credential
against the admin app registration for a token to `target-resource`.

---

## Access policies — who can use this connection / MCP connector

Once a Connection or MCP Connector exists, **only its creator** can
use it. Grant access to additional Entra ID principals with
`access-policy create`.

### Connection access-policy (nested principal, async)

```bash
az connector-namespace connection access-policy create \
    -g $RG --namespace $NS --connection-name $CONN -n grant-bob \
    --principal identity.object-id=$BOB_OID identity.tenant-id=$TENANT type=ActiveDirectory
```

| Field | Required | Notes |
|---|---|---|
| `identity.object-id` | ✅ | Entra ID object ID (user or group) |
| `identity.tenant-id` | ✅ | Tenant ID |
| `type` | ✅ | Must be `ActiveDirectory` |

### MCP Connector access-policy (flat principal, sync)

```bash
az connector-namespace mcp-connector access-policy create \
    -g $RG --namespace $NS --mcp-connector-name $MCP -n grant-bob \
    --principal object-id=$BOB_OID tenant-id=$TENANT \
    --principal-type User
```

| Field | Required | Notes |
|---|---|---|
| `--principal object-id` | ✅ | Entra ID object ID |
| `--principal tenant-id` | ✅ | Tenant ID |
| `--principal-type` | ✅ | `User` or `Group` (**not** `ActiveDirectory`) |

> The schemas intentionally differ — `connection access-policy` is
> async (carries a `provisioningState`), `mcp-connector access-policy`
> is synchronous.

---

## Related

- [`cookbook.md` Recipes 2-6, 9](./cookbook.md) — practical flows
- [`troubleshooting.md`](./troubleshooting.md) — common auth errors
