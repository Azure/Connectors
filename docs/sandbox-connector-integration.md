# Gateway Connections — Integrating Connectors with ACA Sandboxes

Gateway connections wire Connector Namespace resources (API connections and MCP
server configs) into Azure Container Apps (ACA) sandbox groups and sandboxes.
Once wired, sandbox code can call external services — Office 365, Teams,
SharePoint, GitHub, and more — with plain HTTP requests. The platform handles
authentication transparently.

## How it works

1. A **Connector Namespace** holds connections — stored OAuth credentials for
   external services — and optional MCP server configs.
2. Connections and MCP server configs are wired to a **sandbox group** via its
   `gatewayConnections[]` property.
3. Each **sandbox** references the same gateway connections at creation time.
4. The platform generates `/connections/connections.json` inside the sandbox
   with the connection names and runtime URLs.
5. The **egress proxy** intercepts outbound calls to runtime URL hosts and
   injects `Authorization: Bearer` tokens automatically using the sandbox
   group's managed identity.

Gateway connection calls work **even with `defaultAction=Deny`** — the egress
proxy mediates them independently of egress policy rules.

---

## Setting up gateway connections

### Connection types

| Type | `resourceId` contains | Runtime URL field | Purpose |
|------|----------------------|-------------------|---------|
| **API connection** | `/connections/` | `connectionRuntimeUrl` | Sandbox code calls connector REST operations directly |
| **MCP server config** | `/mcpserverconfigs/` | `mcpRuntimeUrl` | Exposes connector operations as MCP tools |

### Wiring checklist

| Step | Resource | What to do |
|------|----------|------------|
| 1 | Connection | Create + consent OAuth → status `Connected` |
| 2 | Connection ACL: `gateway-acl` | Grant gateway MI access (for event subscriptions) |
| 3 | Connection ACL: `sandbox-acl` | Grant sandbox-group MI access (for token minting) |
| 4 | Sandbox group | Enable SystemAssigned MI; PATCH `gatewayConnections[]` with `{resourceId, connectionRuntimeUrl, authentication}` |
| 5 | Sandbox | Create with `gatewayConnections: [{resourceId}]` in the data-plane PUT body |

Steps 2 and 3 can run in parallel. The sandbox group PATCH must use GET-merge-PATCH to avoid clobbering existing entries.

### Sandbox group `gatewayConnections[]` entry shape

For API connections:
```json
{
  "resourceId": "/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Web/connectorGateways/{gw}/connections/{conn}",
  "connectionRuntimeUrl": "https://{host}/apim/{connector}/{id}",
  "authentication": { "type": "SystemAssignedManagedIdentity" }
}
```

For MCP server configs:
```json
{
  "resourceId": "/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Web/connectorGateways/{gw}/mcpserverconfigs/{name}",
  "mcpRuntimeUrl": "https://{host}/.../mcp",
  "authentication": { "type": "SystemAssignedManagedIdentity" }
}
```

### CLI alternative (ACA CLI)

```bash
# Add a gateway connection (creates ACLs automatically)
aca sandboxgroup connector add \
  --group {sg} \
  --connection-id {arm-resource-id} \
  --authorization system

# List configured connections
aca sandboxgroup connector list --group {sg}

# Create sandbox with gateway connections
aca sandbox create --disk copilot \
  --connection-id {resource-id-1} {resource-id-2}
```

### Validation rules

- Maximum **10** gateway connections per sandbox.
- All connections must reference the **same** connector gateway.
- All connections must use the **same** authentication type.
- `SystemAssignedManagedIdentity` requires the sandbox group to have a system-assigned MI.
- Gateway connections on sandboxes are **immutable** — set at creation, cannot be changed.
- MCP server config connections are only supported with `copilot` or `claude` disk images, private disk images, or snapshots.

→ Full wiring details: [gateway-connections.md](../plugin/skills/aca-sandboxes/references/gateway-connections.md)
→ Connection CRUD: [connections.md](../plugin/skills/connectors/references/connections.md)
→ OAuth consent: [consent.md](../plugin/skills/aca-sandboxes/references/consent.md)

---

## Consumption: using connections from inside a sandbox

### `/connections/connections.json`

The platform automatically generates `/connections/connections.json` inside every sandbox that has gateway connections wired. This file maps connection names to their runtime URLs:

```json
{
  "connections": {
    "Teams-web-vet": {
      "type": "http",
      "url": "https://91a8e1cf...azure-apihub.net/apim/teams/fc52d411..."
    },
    "outlook-conn": {
      "type": "http",
      "url": "https://91a8e1cf...azure-apihub.net/apim/office365/971c415a..."
    }
  }
}
```

### Reading and calling connections

```bash
# Get a connection URL by name
URL=$(jq -r '.connections["Teams-web-vet"].url' /connections/connections.json)

# Make an API call — authentication is automatic via egress proxy
curl -s "$URL/beta/me/joinedTeams"
```

From Python:

```python
import json, requests

with open("/connections/connections.json") as f:
    connections = json.load(f)["connections"]

teams_url = connections["Teams-web-vet"]["url"]

# No auth header needed — egress proxy injects Bearer automatically
response = requests.get(f"{teams_url}/beta/me/joinedTeams")
teams = response.json()["value"]
```

### How the egress proxy handles auth

When sandbox code makes an outbound HTTPS request whose host matches a declared `gatewayConnections[]` runtime URL:

1. The egress proxy intercepts the connection (independent of egress policy rules)
2. It mints a Bearer token using the sandbox-group's SystemAssigned MI
3. It adds `Authorization: Bearer <token>` to the outbound request
4. The connector authorizes the call, exchanges the token for stored OAuth credentials, and forwards to the downstream API

This works **even with `defaultAction=Deny`** — gateway connection calls bypass egress host-allow rules entirely.

---

## Operation discovery from inside a sandbox

### Swagger via metadata URL

Derive the metadata URL from the connection URL by replacing `/apim/` with `/metadata/` and appending `?export=true`:

```bash
# Connection URL:  https://host/apim/teams/connectionId
# Metadata URL:    https://host/metadata/teams/connectionId?export=true

URL=$(jq -r '.connections["Teams-web-vet"].url' /connections/connections.json)
METADATA_URL=$(echo "$URL" | sed 's|/apim/|/metadata/|')
curl -s "$METADATA_URL?export=true" | jq '.paths | keys'
```

This returns the Swagger 2.0 spec with available operations, parameters, and `x-ms-dynamic-*` extensions. The response is raw Swagger at the top level — access paths directly via `data["paths"]`.

### Operation listing via ARM (outside sandbox)

For a lightweight operation summary (before sandbox creation), use the ARM catalog:

```bash
az rest --method GET \
  --url ".../managedApis/{connector}/apiOperations?api-version=2016-06-01" \
  --query "value[].{name:name, summary:properties.summary, trigger:properties.trigger}" -o table
```

### Mapping Swagger operations to runtime URL calls

| Swagger field | Where it goes |
|---------------|---------------|
| `path` (strip `/{connectionId}` prefix) | Append to the connection URL |
| `in: path` parameters | Substitute into URL path |
| `in: query` parameters | Append as `?key=value` |
| `in: body` parameters | Send as JSON request body |
| `in: header` parameters | Add as HTTP header (but **not** `Authorization`) |

---

## Access policies

Two access policies are required on each connection for gateway connection wiring:

| Policy name | Principal | Purpose |
|-------------|-----------|---------|
| `gateway-acl` | Gateway (connector namespace) MI | Allows the gateway to subscribe to connector events |
| `sandbox-acl` | Sandbox-group MI | Allows the egress proxy to mint Bearer tokens for runtime URL calls |

Both use the same schema — `principal.type = "ActiveDirectory"` with the
principal's `objectId` and `tenantId`.

---

## Troubleshooting

| Symptom | Likely cause |
|---------|-------------|
| Runtime URL returns `401` / "AuthorizationToken required" | `gatewayConnections[]` entry missing on sandbox group or per-sandbox |
| Runtime URL returns `403` | `sandbox-acl` missing on connection, or managed identity not yet propagated (wait 30s) |
| Connection status not `Connected` | OAuth consent incomplete or expired |
| `connections.json` empty or missing | Sandbox created without `gatewayConnections` in the data-plane PUT body |
| DNS error or connection refused from sandbox | Connection not in per-sandbox `gatewayConnections`, or sandbox not running |

---

## Quick reference

```bash
# --- ARM endpoints ---

# Connector namespace
# https://management.azure.com/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Web/connectorGateways
# api-version=2026-05-01-preview

# Sandbox group
# https://management.azure.com/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.App/sandboxGroups
# api-version=2026-02-01-preview

# Sandbox data plane (regional)
# https://management.{region}.azuredevcompute.io/subscriptions/{sub}/resourceGroups/{rg}/sandboxGroups/{sg}/sandboxes

# List connections on a namespace
az rest --method GET --url ".../connectorGateways/{ns}/connections?api-version=2026-05-01-preview"

# Get sandbox group gatewayConnections
az rest --method GET --url ".../sandboxGroups/{sg}?api-version=2026-02-01-preview" \
  --query "properties.gatewayConnections"

# --- From inside a sandbox ---

# View available gateway connections
cat /connections/connections.json

# Get a connection URL
jq -r '.connections["name"].url' /connections/connections.json

# Discover operations (metadata swagger)
curl -s "$(jq -r '.connections["name"].url' /connections/connections.json | sed 's|/apim/|/metadata/|')?export=true"

# Call a connector operation (auth is automatic)
curl -s "$(jq -r '.connections["name"].url' /connections/connections.json)/beta/me/joinedTeams"
```
