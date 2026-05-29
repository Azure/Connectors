# Troubleshooting

Common errors with the `az connector-namespace` extension, in approximate order of
frequency.

---

## `unrecognized arguments: --namespace`

You're on an older `azure-cli` (< 2.75.0) that can't load the
extension's argument aliases. Upgrade:

```bash
az upgrade
```

Or fall back to the full name: `--connector-namespace-name <name>`.

---

## `unrecognized value 'ActiveDirectory' from choices ['Group', 'User']`

You used the **connection-shape** `--principal` on an **mcp-connector
access-policy** (or vice-versa). Their schemas differ on purpose.

✅ Connection access-policy:
```bash
--principal identity.object-id=<oid> identity.tenant-id=<tid> type=ActiveDirectory
```

✅ MCP Connector access-policy:
```bash
--principal object-id=<oid> tenant-id=<tid>
--principal-type User      # or Group
```

See [`authentication.md` § Access policies](./authentication.md#access-policies--who-can-use-this-connection--mcp-connector).

---

## `argument value cannot be blank`

You tried `--tags ""` to clear all tags. The CLI rejects blank string
arguments. Workarounds:

```bash
# To leave tags unchanged: omit --tags entirely
az connector-namespace update -g $RG -n $NS --api-hub-environment-id <uuid>

# To replace tags: pass new key=value pairs
az connector-namespace update -g $RG -n $NS --tags env=prod team=ai
```

There's no first-class "clear all tags" gesture in this extension.

---

## `Model 'AAZObjectArg' has no field named 'connectorName'`

You used `"connectorName"` instead of `"connectionName"` (or vice-versa)
inside the `--connectors` list. Which one depends on
`--authentication-mode`:

| Authentication mode | Use this key |
|---|---|
| Default / `DeveloperConnection` | `connectionName` |
| `OnBehalfOfUser` | `connectorName` (no specific connection — gateway creates per-user) |
| `OnBehalfOfUserWithApp` / `AppOnly` | `connectionName` |

---

## `Failed to parse '--request' argument`

`connection invoke --request` requires at least `method` and `path`.

✅ Shorthand:
```bash
--request method=GET path=/v1.0/me
```

✅ Full JSON:
```bash
--request '{"method":"GET","path":"/v1.0/me"}'
```

Don't pass `--request` as a bare string or YAML file path without `@`.

---

## `--hosted-mcp-server-id not recognized`

`hostedMcpServerId` is **nested under** `--hosted-mcp-server`, not a
top-level arg.

✅
```bash
--hosted-mcp-server hosted-mcp-server-id=<id-from-catalog>
```

Discover valid ids from the catalog:

```bash
az connector-namespace managed-hosted-mcp-connector list -g $RG --namespace $NS -o table
```

---

## My connection returns 401 from `connection invoke` even though I created it

You haven't completed the OAuth consent flow. After
`connection create`, you must:

1. `az connector-namespace connection list-consent-links` — get the browser URL
2. Browser: user clicks the URL and authorizes
3. `az connector-namespace connection confirm-consent-code` — exchange the code

Until step 3 completes, no operations will succeed. See
[`cookbook.md` Recipe 2](./cookbook.md#recipe-2--oauth-consent-flow-for-a-connection).

---

## My agent's API key suddenly stopped working

Check the `notAfter` time. Time-bound API keys expire silently — they
return 401, not a more descriptive error.

```bash
# Mint a fresh key
az connector-namespace list-api-key -g $RG --namespace $NS \
    --key-type Primary --never-expire \
    --scope '{"mcpServerConfigName":"<your-mcp>"}'
```

If you rotated the access key (`regenerate-access-key`), API keys
issued before the rotation may also be invalidated. See
[`authentication.md`](./authentication.md).

---

## OAuth consent: where does the `code` come from?

It's the `code` query parameter on the URL the user is redirected to
**after** authorizing in the browser. Example:

If your redirect URL is `https://contoso.example/cb`, the browser ends
up at `https://contoso.example/cb?code=44ebcb40e38b4d179b1a7d4c39904b22`
after consent. The hex string after `code=` is what
`confirm-consent-code --code` wants.

---

## `connector update` ignores my `--set properties.foo=bar`

By design. `connector update` only honors:
- `--tags`
- `--api-hub-environment-id`

Other fields are immutable after creation. To change a property, delete
and recreate the Connector Namespace.

---

## Where do I find my Entra ID `objectId` and `tenantId`?

```bash
# Your own
az ad signed-in-user show --query "{objectId:id}" -o tsv
az account show --query "{tenantId:tenantId}" -o tsv

# A teammate (by UPN)
az ad user show --id bob@contoso.com --query "{objectId:id}" -o tsv

# A group
az ad group show --group "My Group Name" --query "{objectId:id}" -o tsv
```

---

## Filing an issue

If your problem isn't above, file an issue at
<https://github.com/Azure/Connectors/issues> with:

1. Output of `az --version`
2. Output of `az extension show --name connector-namespace`
3. The full command you ran (redact secrets)
4. The full error message (run with `--debug` if helpful)
