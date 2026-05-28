#!/usr/bin/env bash
# 04-obo-mcp-connector.sh — Create an On-Behalf-Of-User MCP connector.
# See cookbook.md Recipe 5.
#
# All tool calls run as the calling user via per-user dynamic API Hub connections.
#
# Required env: RG, NS, MCP, CONNECTOR_NAME

set -euo pipefail
: "${RG:?Set RG=<resource-group-name>}"
: "${NS:?Set NS=<connector-namespace-name>}"
: "${MCP:?Set MCP=<mcp-connector-name>}"
: "${CONNECTOR_NAME:?Set CONNECTOR_NAME=<connector-id-eg-sql>}"

az connector mcp-connector create -g "$RG" --namespace "$NS" -n "$MCP" \
    --authentication-mode OnBehalfOfUser \
    --connectors "[{\"connectorName\":\"$CONNECTOR_NAME\"}]"

echo
echo ">>> OBO MCP connector $MCP created."
echo ">>> Tool calls will execute under each caller's identity."
echo ">>> Grant teammates access:"
echo ">>>   ./04-grant-mcp-access.sh   (or see cookbook.md Recipe 4)"
