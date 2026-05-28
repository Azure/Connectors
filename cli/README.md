# Connector Namespaces — Azure CLI Extension

> Manage **`Microsoft.Web/connectorGateways`** Connector Namespaces and
> their children from the Azure CLI.

This directory ships the **preview release** of the `az connector`
extension as documentation, runnable examples, and an AI-agent guide.
The wheel itself is hosted on Microsoft-managed Azure Storage — see
[Install](#install) below.

> ⚠️ **Preview release — pre-GA, unsigned.** Command names, arguments,
> and behaviors may change before general availability. This wheel was
> uploaded manually to enable early customer testing while the
> automated signing + publishing pipeline is being commissioned. Use
> for testing and feedback only; **do not depend on this URL or wheel
> in production scripts yet**.

---

## Install

```bash
az extension add --source https://connectorscli.blob.core.windows.net/manual/connector-1.0.0b1-py3-none-any.whl
```

Verify install:

```bash
az extension show --name connector --query "{name:name, version:version, preview:preview}" -o table
az connector --help
```

Uninstall:

```bash
az extension remove --name connector
```

## Wheel provenance & integrity

Verify the downloaded wheel matches the published artifact before
installing in any environment you care about.

### Published artifact metadata (v1.0.0b1)

| Field | Value |
|---|---|
| URL | `https://connectorscli.blob.core.windows.net/manual/connector-1.0.0b1-py3-none-any.whl` |
| Size | **153,001 bytes** |
| SHA-256 | `3156afc17848594eddf20962f616ebae8ae3aaafe2004061b9eb13078726d2f4` |
| MD5 (hex) | `a668dee284bfeee009b53b2eb8783d6f` |
| MD5 (base64, matches blob `Content-MD5`) | `pmje4oS/7uAJtTsuuHg9bw==` |
| ETag | `0x8DEBD04C1B992E8` |
| Last-Modified | `Thu, 28 May 2026 22:02:06 GMT` |
| Content-Type | `application/octet-stream` |
| Blob type | `BlockBlob` |
| Source repo | <https://github.com/Azure/azure-cli-extensions> |
| Source path | `src/connector/` |
| Built with | `azdev extension build connector` (aaz-dev-tools generated) |
| Signing | ❌ Not signed (preview-only — see [Signing roadmap](#signing-roadmap)) |

### Verify SHA-256 locally

After downloading the wheel, compare its SHA-256 with the value above:

```bash
# Linux / macOS
curl -O https://connectorscli.blob.core.windows.net/manual/connector-1.0.0b1-py3-none-any.whl
sha256sum connector-1.0.0b1-py3-none-any.whl
# Expect: 3156afc17848594eddf20962f616ebae8ae3aaafe2004061b9eb13078726d2f4
```

```powershell
# Windows PowerShell
Invoke-WebRequest https://connectorscli.blob.core.windows.net/manual/connector-1.0.0b1-py3-none-any.whl -OutFile .\connector-1.0.0b1-py3-none-any.whl
Get-FileHash -Algorithm SHA256 .\connector-1.0.0b1-py3-none-any.whl
# Expect:  3156AFC17848594EDDF20962F616EBAE8AE3AAAFE2004061B9EB13078726D2F4
```

### Verify ETag / Content-MD5 server-side

The Azure Storage HEAD response carries `ETag` and `Content-MD5`. If
the values above don't match what the storage account returns, the
blob has been overwritten:

```bash
curl --head https://connectorscli.blob.core.windows.net/manual/connector-1.0.0b1-py3-none-any.whl
# Look for:
#   ETag: 0x8DEBD04C1B992E8
#   Content-MD5: pmje4oS/7uAJtTsuuHg9bw==
#   Content-Length: 153001
```

### Signing roadmap

The preview wheel is not code-signed. Signed wheels will be published
once the release pipeline lands:

- **Build:** Wheel is built locally via `azdev extension build` from
  `Azure/azure-cli-extensions`, then committed to an internal release
  repo for review.
- **Sign:** An Azure DevOps pipeline calls the OneBranch
  `external_distribution` signing service (same profile used for
  Microsoft NuGet package publishing) and produces a sidecar `.sig` or
  embedded CMS signature.
- **Publish:** The signed wheel + `SHA256SUMS` + `PROVENANCE.json` are
  uploaded to `https://connectorscli.blob.core.windows.net/pipeline/`
  behind a release-manager + security approval gate.

When that goes live, this section will be updated to point at the
`pipeline/` container and include the cosign / Authenticode
verification steps.

### Why is the wheel not in this repo?

The wheel lives on Microsoft-managed Azure Storage behind
JIT-controlled write access:

- Only approved Microsoft employees with active JIT can publish a wheel
- Storage diagnostic logs record every upload (who, when, from where)
- Container public access is set to **Blob** (anonymous read of
  individual blobs by URL is allowed; anonymous list is blocked)
- Immutability policies prevent silent replacement of published versions
- Blob can be CDN-fronted with a Microsoft-owned custom domain

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
