#!/usr/bin/env bash
# 03-grant-access.sh — Grant an Entra ID principal access to a connection.
# See cookbook.md Recipe 3.
#
# Required env: RG, NS, CONN, TEAMMATE_OID, TENANT, POLICY_NAME

set -euo pipefail
: "${RG:?Set RG=<resource-group-name>}"
: "${NS:?Set NS=<connector-namespace-name>}"
: "${CONN:?Set CONN=<connection-name>}"
: "${TEAMMATE_OID:?Set TEAMMATE_OID=<entra-object-id>}"
: "${TENANT:?Set TENANT=<tenant-id>}"
: "${POLICY_NAME:?Set POLICY_NAME=<policy-name (eg grant-bob)>}"

az connector connection access-policy create \
    -g "$RG" --namespace "$NS" --connection-name "$CONN" -n "$POLICY_NAME" \
    --principal identity.object-id="$TEAMMATE_OID" \
                identity.tenant-id="$TENANT" \
                type=ActiveDirectory

echo
echo ">>> $TEAMMATE_OID now has access to $CONN."
echo ">>> List all policies on this connection:"
echo ">>>   az connector connection access-policy list -g $RG --namespace $NS --connection-name $CONN -o table"
