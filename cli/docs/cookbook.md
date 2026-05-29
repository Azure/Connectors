# Cookbook — end-to-end recipes

Each recipe is copy-paste-ready bash. The recipes assume:

```bash
RG=myRG
NS=myConnectorNamespace
LOC=westus2
TENANT=11111111-1111-1111-1111-111111111111
USER_OID=00000000-0000-0000-0000-000000000000   # the user you'll grant access to
```

Set those, then run any recipe top-to-bottom.

---

## Recipe 1 — Bootstrap: namespace + connection + MCP connector

```bash
# 1. Create the namespace
az connector-namespace create -g $RG -n $NS --location $LOC

# 2. Add a managed connection to Office 365
az connector-namespace connection create -g $RG --namespace $NS -n office365Conn \
    --connector-name office365 --display-name "Office 365"

# 3. (Complete OAuth consent — see Recipe 2)

# 4. Wrap the connection's operations as an MCP connector
az connector-namespace mcp-connector create -g $RG --namespace $NS -n office365Mcp \
    --connectors '[{"connectionName":"office365Conn"}]'

# 5. Verify
az connector-namespace mcp-connector show -g $RG --namespace $NS -n office365Mcp
```

---

## Recipe 2 — OAuth consent flow for a connection

After `connection create`, most managed connectors need OAuth consent
before any operation will run.

```bash
# Step 1: generate a consent URL
az connector-namespace connection list-consent-links \
    -g $RG --namespace $NS --connection-name office365Conn \
    --parameters '[{
        "objectId": "'$USER_OID'",
        "tenantId": "'$TENANT'",
        "parameterName": "token",
        "redirectUrl": "https://contoso.example/oauth/callback"
    }]'
# → Response contains a `link` URL. Open it in a browser.

# Step 2 (browser): the user authorizes the app.
# The browser is redirected to `redirectUrl?code=<consentCode>`.
# Copy the `code` query parameter.

# Step 3: exchange the consent code for stored credentials
az connector-namespace connection confirm-consent-code \
    -g $RG --namespace $NS --connection-name office365Conn \
    --code <consentCode-from-redirect-url> \
    --object-id $USER_OID \
    --tenant-id $TENANT
```

---

## Recipe 3 — Grant a teammate access to a connection

```bash
TEAMMATE_OID=22222222-2222-2222-2222-222222222222

az connector-namespace connection access-policy create \
    -g $RG --namespace $NS --connection-name office365Conn -n grant-bob \
    --principal '{
        "identity": {"objectId": "'$TEAMMATE_OID'", "tenantId": "'$TENANT'"},
        "type": "ActiveDirectory"
    }'
```

Shorthand (no JSON quoting):

```bash
az connector-namespace connection access-policy create \
    -g $RG --namespace $NS --connection-name office365Conn -n grant-bob \
    --principal identity.object-id=$TEAMMATE_OID identity.tenant-id=$TENANT type=ActiveDirectory
```

List + cleanup:

```bash
az connector-namespace connection access-policy list   -g $RG --namespace $NS --connection-name office365Conn
az connector-namespace connection access-policy delete -g $RG --namespace $NS --connection-name office365Conn -n grant-bob
```

---

## Recipe 4 — Grant a teammate access to an MCP connector

> ⚠️ **Schema differs from connection access-policy.** MCP uses flat
> `--principal` + separate `--principal-type` (`User` or `Group`).

```bash
az connector-namespace mcp-connector access-policy create \
    -g $RG --namespace $NS --mcp-connector-name office365Mcp -n grant-bob \
    --principal '{"objectId":"'$TEAMMATE_OID'","tenantId":"'$TENANT'"}' \
    --principal-type User
```

---

## Recipe 5 — On-behalf-of-user (OBO) MCP connector

Run all tool calls as the **calling user** — per-user dynamic API Hub
connections, no shared credentials. With OBO, `connectionName` on each
connector entry is optional; the gateway provisions a per-caller
connection automatically.

```bash
az connector-namespace mcp-connector create -g $RG --namespace $NS -n obo-mcp \
    --authentication-mode OnBehalfOfUser \
    --connectors '[{"connectorName":"sql"}]'
```

---

## Recipe 6 — Hosted MCP server (FIC + admin app registration)

The gateway provisions and runs an MCP server container for you. Requires
an entry from the catalog, an admin app registration for the federated
identity credential (FIC), and a target downstream resource.

```bash
# Discover available hosted-MCP-server ids
az connector-namespace managed-hosted-mcp-connector list -g $RG --namespace $NS -o table

ADMIN_APP=33333333-3333-3333-3333-333333333333   # client_id of admin app reg

az connector-namespace mcp-connector create -g $RG --namespace $NS -n hosted-mcp \
    --kind HostedMcpServer \
    --authentication-mode OnBehalfOfUserWithApp \
    --hosted-mcp-server hosted-mcp-server-id=my-hosted-mcp-id \
    --resource-auth target-resource=https://graph.microsoft.com \
                    admin-app-registration.client-id=$ADMIN_APP
```

Switch `--authentication-mode` to `AppOnly` for client-credentials flow
(no user token exchange).

---

## Recipe 7 — Invoke a connector operation through the gateway

`connection invoke` is a generic authenticated HTTP relay — useful for
debugging connections or calling operations not yet wrapped by an MCP
tool. **Do not set auth headers in `--request`**; the gateway injects
auth from the stored connection credentials.

```bash
# GET /v1.0/me on the Microsoft Graph connector
az connector-namespace connection invoke \
    -g $RG --namespace $NS --connection-name office365Conn \
    --request method=GET path=/v1.0/me

# POST with a JSON body + query parameter
az connector-namespace connection invoke \
    -g $RG --namespace $NS --connection-name office365Conn \
    --request '{
        "method":  "POST",
        "path":    "/v1.0/me/sendMail",
        "queries": {"$select": "id"},
        "body":    {"message": {"subject": "Hi"}}
    }'
```

---

## Recipe 8 — Webhook trigger on new email

```bash
az connector-namespace trigger create -g $RG --namespace $NS -n onNewEmail \
    --connection-details '{"connectionName":"office365Conn","connectorName":"office365"}' \
    --operation-name OnNewEmail \
    --notification-details '{"callbackUrl":"https://contoso.example/callbacks/email"}'

# Watch executions
az connector-namespace trigger run    list -g $RG --namespace $NS --trigger-name onNewEmail
az connector-namespace trigger status show -g $RG --namespace $NS --trigger-name onNewEmail -n primary
```

---

## Recipe 9 — Mint a runtime API key for clients

```bash
# 90-day primary key scoped to one MCP connector
NOT_AFTER=$(date -u -d '90 days' +'%Y-%m-%dT%H:%M:%SZ')

az connector-namespace list-api-key -g $RG --namespace $NS \
    --key-type Primary \
    --not-after $NOT_AFTER \
    --scope '{"mcpServerConfigName":"office365Mcp"}'

# Or a never-expiring key scoped to the whole namespace
az connector-namespace list-api-key -g $RG --namespace $NS \
    --key-type Primary --never-expire
```

See [`authentication.md`](./authentication.md) for when to use API
keys vs. access keys.

---

## Recipe 10 — Browse the managed catalogs

The namespace publishes three read-only catalogs that drive what
`mcp-connector create` accepts.

```bash
# All managed API connectors available for this namespace
az connector-namespace managed-api list -g $RG --namespace $NS -o table

# Inspect one
az connector-namespace managed-api show -g $RG --namespace $NS -n office365

# Hosted MCP server images (ids go into `--hosted-mcp-server`)
az connector-namespace managed-hosted-mcp-connector list -g $RG --namespace $NS -o table

# MCP-aware operations a managed connector exposes
az connector-namespace managed-mcp-operation list -g $RG --namespace $NS
```
