# Connector Namespaces — Azure CLI Extension

> Manage **`Microsoft.Web/connectorGateways`** Connector Namespaces and
> their children from the Azure CLI.

This directory ships the **preview release** of the `az connector-namespace`
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
az extension add --source https://connectorscli.blob.core.windows.net/manual/connector_namespace-1.0.0b9-py3-none-any.whl
```

Verify install:

```bash
az extension show --name connector-namespace --query "{name:name, version:version, preview:preview}" -o table
az connector-namespace --help
```

Uninstall:

```bash
az extension remove --name connector-namespace
```

## Wheel provenance & integrity

Verify the downloaded wheel matches the published artifact before
installing in any environment you care about.

### Published artifact metadata (v1.0.0b9)

| Field | Value |
|---|---|
| URL | `https://connectorscli.blob.core.windows.net/manual/connector_namespace-1.0.0b9-py3-none-any.whl` |
| Size | **146,361 bytes** |
| SHA-256 | `30b7e8e0273ee11c582d9d1fad1c734937d30e322b2dc6dbc1598df909183724` |
| MD5 (hex) | `d3777a14b1511accd00fcf876efb0292` |
| MD5 (base64, matches blob `Content-MD5`) | `03d6FLFRGszQD8+HbvsCkg==` |
| ETag | _populated by Azure Storage on upload_ |
| Last-Modified | _populated by Azure Storage on upload_ |
| Content-Type | `application/octet-stream` |
| Blob type | `BlockBlob` |
| Source repo | <https://github.com/Azure/azure-cli-extensions> |
| Source path | `src/connector-namespace/` |
| Built with | OneBranch `python-official-connector` pipeline ([build 166088375](https://msazure.visualstudio.com/One/_build/results?buildId=166088375)) |
| Signing | ❌ Not signed (preview-only — see [Signing roadmap](#signing-roadmap)) |

### Verify SHA-256 locally

After downloading the wheel, compare its SHA-256 with the value above:

```bash
# Linux / macOS
curl -O https://connectorscli.blob.core.windows.net/manual/connector_namespace-1.0.0b9-py3-none-any.whl
sha256sum connector_namespace-1.0.0b9-py3-none-any.whl
# Expect: 30b7e8e0273ee11c582d9d1fad1c734937d30e322b2dc6dbc1598df909183724
```

```powershell
# Windows PowerShell
Invoke-WebRequest https://connectorscli.blob.core.windows.net/manual/connector_namespace-1.0.0b9-py3-none-any.whl -OutFile .\connector_namespace-1.0.0b9-py3-none-any.whl
Get-FileHash -Algorithm SHA256 .\connector_namespace-1.0.0b9-py3-none-any.whl
# Expect:  30B7E8E0273EE11C582D9D1FAD1C734937D30E322B2DC6DBC1598DF909183724
```

### Verify ETag / Content-MD5 server-side

The Azure Storage HEAD response carries `ETag` and `Content-MD5`. If
the values above don't match what the storage account returns, the
blob has been overwritten:

```bash
curl --head https://connectorscli.blob.core.windows.net/manual/connector_namespace-1.0.0b9-py3-none-any.whl
# Look for:
#   ETag: <value reported on upload>
#   Content-MD5: 03d6FLFRGszQD8+HbvsCkg==
#   Content-Length: 146361
```

### Signing roadmap

The preview wheel is not code-signed. Signed wheels will be published
once the release pipeline lands end-to-end:

- **Build:** Wheel is built by the OneBranch
  [`python-official-connector`](https://msazure.visualstudio.com/One/_build?definitionId=462678)
  pipeline from `coreai-microsoft/adc-devx`, which mirrors source from
  `Azure/azure-cli-extensions src/connector-namespace/`. Each pipeline
  run auto-bumps the trailing beta serial (1.0.0bN) via an ADO
  counter() expression — no commits-back to the repo.
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

### Wheel distribution

For convenience during the preview phase, the wheel is checked into
this repository under [`cli/dist/`](./dist/) AND uploaded to
Microsoft-managed Azure Storage. The two should be byte-identical (use
the SHA-256 above to confirm). Storage hosting carries the controls
needed for broader distribution:

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
az connector-namespace create -g $RG -n $NS --location $LOC

# Add an Office 365 connection
az connector-namespace connection create -g $RG --namespace $NS -n office365Conn \
    --connector-name office365 --display-name "Office 365"

# Complete OAuth consent (see docs/cookbook.md Recipe 2)

# Wrap operations as an MCP connector
az connector-namespace mcp-connector create -g $RG --namespace $NS -n office365Mcp \
    --connectors '[{"connectionName":"office365Conn"}]'

# Mint a runtime API key
az connector-namespace list-api-key -g $RG --namespace $NS --key-type Primary --never-expire
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
