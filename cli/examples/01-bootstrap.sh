#!/usr/bin/env bash
# 01-bootstrap.sh — Create a Connector Namespace, a connection, and an MCP connector.
# See cookbook.md Recipe 1.
#
# Required env: RG, NS, LOC

set -euo pipefail
: "${RG:?Set RG=<resource-group-name>}"
: "${NS:?Set NS=<connector-namespace-name>}"
: "${LOC:?Set LOC=<region>}"

az group create -n "$RG" -l "$LOC"
az connector create -g "$RG" -n "$NS" --location "$LOC"

az connector connection create -g "$RG" --namespace "$NS" -n office365Conn \
    --connector-name office365 --display-name "Office 365"

echo
echo ">>> office365Conn created. Complete OAuth consent with 02-consent-flow.sh,"
echo ">>> then run:"
echo ">>>   az connector mcp-connector create -g $RG --namespace $NS -n office365Mcp \\"
echo ">>>       --connectors '[{\"connectionName\":\"office365Conn\"}]'"
