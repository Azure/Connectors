#!/usr/bin/env bash
# 05-hosted-mcp-server.sh — Provision a hosted MCP server (FIC + admin app reg).
# See cookbook.md Recipe 6.
#
# Required env: RG, NS, MCP, HOSTED_MCP_ID, ADMIN_APP, TARGET_RESOURCE
# Optional env: AUTH_MODE (default: OnBehalfOfUserWithApp; alt: AppOnly)

set -euo pipefail
: "${RG:?Set RG=<resource-group-name>}"
: "${NS:?Set NS=<connector-namespace-name>}"
: "${MCP:?Set MCP=<mcp-connector-name>}"
: "${HOSTED_MCP_ID:?Set HOSTED_MCP_ID=<id-from-managed-hosted-mcp-connector-list>}"
: "${ADMIN_APP:?Set ADMIN_APP=<entra-app-client-id-of-admin-app-reg>}"
: "${TARGET_RESOURCE:?Set TARGET_RESOURCE=<downstream-resource-eg-https://graph.microsoft.com>}"
AUTH_MODE="${AUTH_MODE:-OnBehalfOfUserWithApp}"

echo ">>> Available hosted-MCP-server ids in this namespace:"
az connector managed-hosted-mcp-connector list -g "$RG" --namespace "$NS" -o table || true
echo

az connector mcp-connector create -g "$RG" --namespace "$NS" -n "$MCP" \
    --kind HostedMcpServer \
    --authentication-mode "$AUTH_MODE" \
    --hosted-mcp-server hosted-mcp-server-id="$HOSTED_MCP_ID" \
    --resource-auth target-resource="$TARGET_RESOURCE" \
                    admin-app-registration.client-id="$ADMIN_APP"

echo
echo ">>> Hosted MCP server $MCP created with $AUTH_MODE."
