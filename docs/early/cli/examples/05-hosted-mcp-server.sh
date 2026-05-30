#!/usr/bin/env bash
# 05-hosted-mcp-server.sh — Provision a hosted MCP server (FIC + admin app reg).
# See ../README.md#hosted-mcp-servers.
#
# Required env: RG, NS, MCP, HOSTED_MCP_ID, ADMIN_APP, TARGET_RESOURCE
# Optional env: AUTH_MODE (default: OnBehalfOfUserWithApp; alt: AppOnly)

set -euo pipefail
: "${RG:?Set RG=<resource-group-name>}"
: "${NS:?Set NS=<connector-namespace-name>}"
: "${MCP:?Set MCP=<mcp-connector-name>}"
: "${HOSTED_MCP_ID:?Set HOSTED_MCP_ID=<id-from-connectors-portal-at-connectors.azure.com>}"
: "${ADMIN_APP:?Set ADMIN_APP=<entra-app-client-id-of-admin-app-reg>}"
: "${TARGET_RESOURCE:?Set TARGET_RESOURCE=<downstream-resource-eg-https://graph.microsoft.com>}"
AUTH_MODE="${AUTH_MODE:-OnBehalfOfUserWithApp}"

# Hosted MCP server image discovery is not yet exposed in the CLI for v1.
# Get HOSTED_MCP_ID from the https://connectors.azure.com portal.

az connector-namespace mcp-connector create -g "$RG" --namespace "$NS" -n "$MCP" \
    --kind HostedMcpServer \
    --authentication-mode "$AUTH_MODE" \
    --hosted-mcp-server hosted-mcp-server-id="$HOSTED_MCP_ID" \
    --resource-auth target-resource="$TARGET_RESOURCE" \
                    admin-app-registration.client-id="$ADMIN_APP"

echo
echo ">>> Hosted MCP server $MCP created with $AUTH_MODE."
