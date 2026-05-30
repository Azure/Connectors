# AI Agent Guide — `az connector-namespace`

This file tells AI assistants (Copilot, Claude, Cursor, Aider, etc.) how
to drive the **`az connector-namespace`** Azure CLI extension efficiently. It
follows the [AGENTS.md](https://agents.md/) convention.

If you're a human, read [`README.md`](./README.md) instead — it has the
same content in a friendlier shape.

---

## What this extension manages

`Microsoft.Web/connectorGateways` resources (**Connector Namespaces**)
and their children: API Connections, MCP Connectors, Triggers, and
Entra ID Access Policies. 45 commands, organized under
`az connector-namespace ...`. Full command tree in [`complete-reference.md`](./complete-reference.md#command-tree).

---

## Decision tree: pick the right command

```
User wants to …
├─ Set up a new namespace                       → az connector-namespace create
├─ Add a managed-connector connection           → az connector-namespace connection create
├─ Authenticate the connection (OAuth)          → az connector-namespace connection list-consent-links
│                                                 (browser step)
│                                                 az connector-namespace connection confirm-consent-code
├─ Authorize another user on the connection     → az connector-namespace connection access-policy create
├─ Expose connector ops as MCP tools            → az connector-namespace mcp-connector create
├─ Run all calls as the calling user (OBO)      → az connector-namespace mcp-connector create
│                                                 --authentication-mode OnBehalfOfUser
├─ Use a hosted MCP server image                → az connector-namespace mcp-connector create --kind HostedMcpServer
├─ Authorize a user on the MCP connector        → az connector-namespace mcp-connector access-policy create
├─ Set up a webhook trigger                     → az connector-namespace trigger create
├─ Call a connector operation directly          → az connector-namespace connection invoke
├─ Issue runtime API key for clients            → az connector-namespace list-api-key      (data plane)
├─ Rotate the ARM-level admin key               → az connector-namespace regenerate-access-key (control plane)
└─ Browse what's available                      → az connector-namespace connector list
                                                  az connector-namespace managed-mcp-operation list

   Hosted MCP server image discovery is not yet exposed in the CLI for
   v1. Get valid `--hosted-mcp-server` ids from the
   https://connectors.azure.com portal.
```

---

## Rules of engagement

### Always

- **Ask the user first** for `subscription`, `resource group`, `location`,
  and `Connector Namespace name` before generating any `create`/`delete`
  commands. Never invent these.
- **Use `--namespace`** (the short alias) — every command accepts it as
  a synonym for `--connector-namespace-name`.
- **Quote JSON args** with single quotes on POSIX shells and use escaped
  double quotes on Windows cmd; or prefer the **shorthand syntax**
  `key.subkey=value` (no quoting). Both are accepted.
- **Set `az account set --subscription <id>`** before any command that
  hits ARM.
- **Prefer `az connector-namespace <group> show -o json | jq`** over parsing raw
  ARM IDs.

### Never

- **Never set Authorization headers on `connection invoke`** —
  `--request headers={"Authorization": "..."}` is silently overwritten
  by the gateway. Stored connection credentials are injected automatically.
- **Never use `--tags ""` to clear tags.** It fails the linter and the
  CLI rejects blank strings. Omit `--tags` entirely to preserve existing,
  or send new keys to overwrite.
- **Never set `provisioningState`, `systemData`, or `etag`** on
  create/update bodies — they're read-only.
- **Never use `--type` on `connection create`** — custom connectors
  aren't supported by this extension. Use only managed-connector names
  (e.g., `office365`, `sql`).
- **Never call `regenerate-access-key` to issue a runtime key.** That's
  for control-plane admin only. Use `list-api-key` for client-facing
  keys.

### Sometimes

- **`connector-namespace update` (namespace-level) is mostly tag-only.**
  Only `--tags` and `--api-hub-environment-id` are honored on the
  namespace resource. To change other namespace fields, delete +
  recreate.
- **`mcp-connector create` arg combos are not validated client-side.**
  Validate combos yourself (see [§Authentication-mode matrix](#authentication-mode-matrix)).

---

## Authentication-mode matrix for `mcp-connector create`

| `--authentication-mode` | Required args | Optional behavior |
|---|---|---|
| `NotSpecified` (default) | none | Treats connector ops as standard MCP tools. |
| `DeveloperConnection` | `--connectors '[{"connectionName":"…"}]'` | All tool calls use this shared connection's credentials. |
| `OnBehalfOfUser` | `--connectors '[{"name":"…"}]'` (managed connector id like `sql`/`office365` — **not** `connectionName`; there's no specific connection in OBO mode, the gateway provisions per-user) | Per-user dynamic API Hub connections, calling user's identity. |
| `OnBehalfOfUserWithApp` | `--connectors '[{"connectionName":"…"}]'` + `--resource-auth target-resource=… admin-app-registration.client-id=…` | FIC-backed OBO via an admin app registration. |
| `AppOnly` | `--connectors '[{"connectionName":"…"}]'` + `--resource-auth …` | Client-credentials flow against the admin app. User token used for caller ACL only. |

**`--kind HostedMcpServer`** *always* requires:
- `--hosted-mcp-server hosted-mcp-server-id=<id-from-catalog>`
- `--authentication-mode OnBehalfOfUserWithApp` or `AppOnly`
- `--resource-auth …`

Catalog of valid `hosted-mcp-server-id` values is not yet exposed in the
CLI for v1 — get ids from the [Connectors portal](https://connectors.azure.com)
or service team.

---

## Argument-shape cheat sheet

### Nested JSON (use shorthand to avoid quoting)

| Arg | JSON | Shorthand equivalent |
|---|---|---|
| `--principal` (connection access-policy) | `'{"identity":{"objectId":"oid","tenantId":"tid"},"type":"ActiveDirectory"}'` | `identity.object-id=oid identity.tenant-id=tid type=ActiveDirectory` |
| `--principal` (mcp-connector access-policy) | `'{"objectId":"oid","tenantId":"tid"}'` | `object-id=oid tenant-id=tid` |
| `--hosted-mcp-server` | `'{"hostedMcpServerId":"my-mcp"}'` | `hosted-mcp-server-id=my-mcp` |
| `--resource-auth` | `'{"targetResource":"https://graph.microsoft.com","adminAppRegistration":{"clientId":"…"}}'` | `target-resource=https://graph.microsoft.com admin-app-registration.client-id=…` |
| `--request` (invoke) | `'{"method":"GET","path":"/v1.0/me"}'` | `method=GET path=/v1.0/me` |
| `--connection-details` (trigger) | `'{"connectionName":"m1","connectorName":"office365"}'` | `connectionName=m1 connectorName=office365` |
| `--notification-details` (trigger) | `'{"callbackUrl":"https://…"}'` | `callback-url=https://…` |

### Enum values

| Arg | Allowed values |
|---|---|
| `--authentication-mode` (mcp-connector) | `NotSpecified`, `DeveloperConnection`, `OnBehalfOfUser`, `OnBehalfOfUserWithApp`, `AppOnly` |
| `--kind` (mcp-connector) | `NotSpecified`, `ManagedMcpServer`, `HostedMcpServer` |
| `--state` (mcp-connector, trigger) | `Enabled`, `Disabled` |
| `--key-type` (list-api-key, regenerate-access-key) | `Primary`, `Secondary` |
| `--principal-type` (mcp-connector access-policy) | `User`, `Group` (note: **not** `ActiveDirectory`) |
| `type` inside `--principal` (connection access-policy) | `ActiveDirectory` (the only valid value) |

---

## Asymmetry traps

These cross-command differences are easy to miss:

| Connection access-policy | MCP connector access-policy |
|---|---|
| `--principal` is nested: `identity.{objectId,tenantId} + type` | `--principal` is flat: `{objectId, tenantId}` + separate `--principal-type` |
| `type = ActiveDirectory` | `--principal-type` = `User` or `Group` |
| Provisioning is **async** (has `provisioningState`) | Provisioning is **synchronous** |

Use the right shape for the right resource — getting it wrong yields an
error like `unrecognized value 'ActiveDirectory' from choices ['Group', 'User']`.

---

## Common error → fix

| Error contains | Probable cause | Fix |
|---|---|---|
| `unrecognized value 'ActiveDirectory' from choices ['Group', 'User']` | Used connection-shape on mcp-connector access-policy | Use `--principal-type User` |
| `option_length_too_long ... --connector-namespace-name` | aaz-only export missed the alias on a new command | Use `--namespace` (always works) |
| `argument value cannot be blank` on `--tags` | Passed `--tags ""` | Omit `--tags` to preserve existing |
| `Model 'AAZObjectArg' has no field named 'connector_name'` | Used `connectorName` instead of `name` or `connectionName` in `--connectors` | For OBO use `name=<connector-id>` (e.g. `sql`); for shared/AppOnly use `connectionName=<existing-connection>` |
| `Failed to parse '--request' argument` | Missing `method` or `path` | At minimum: `method=GET path=/<route>` |
| `Argument option 'name' duplicated` | Hit on a freshly generated extension | Report — swagger has a path-param naming collision |
| `--hosted-mcp-server-id not recognized` | It's nested, not top-level | `--hosted-mcp-server hosted-mcp-server-id=<id>` |

---

## Performance tips for agents

- **One round-trip is faster than five.** Combine `--query` JMESPath
  expressions to extract just what you need: `az connector-namespace show ... --query "{id:id, key:properties.primaryAccessKey}"`.
- **`-o tsv` for scripts**, `-o json` for follow-up parsing,
  `-o table` for human display only.
- **Bind variables before calling.** Save `connectionId=$(az connector-namespace connection show ... --query id -o tsv)`, then reuse.
- **Cache the catalog.** `az connector-namespace connector list` rarely
  changes — pull once per session.

---

## Tasks an agent should refuse (and ask the human)

- Generating subscription IDs, tenant IDs, or object IDs. Always ask
  the user; never invent UUIDs.
- Rotating access keys without explicit confirmation
  (`regenerate-access-key` invalidates existing clients).
- Deleting Connector Namespaces or MCP connectors (cascades).
- Authorizing principals other than what the user named.

---

## Where to look next

- [`README.md`](./README.md) — human-facing landing (install, quickstart, deep dive)
- [`complete-reference.md`](./complete-reference.md) — full command reference, authentication, argument shapes, tips & gotchas
- [`examples/`](./examples/) — runnable bash scripts for end-to-end scenarios
