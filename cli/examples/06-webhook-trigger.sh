#!/usr/bin/env bash
# 06-webhook-trigger.sh — Create a webhook-style trigger and inspect runs.
# See cookbook.md Recipe 8.
#
# Required env: RG, NS, TRIGGER, CONN, CONNECTOR_NAME, OPERATION, CALLBACK_URL

set -euo pipefail
: "${RG:?Set RG=<resource-group-name>}"
: "${NS:?Set NS=<connector-namespace-name>}"
: "${TRIGGER:?Set TRIGGER=<trigger-name>}"
: "${CONN:?Set CONN=<connection-name>}"
: "${CONNECTOR_NAME:?Set CONNECTOR_NAME=<connector-id-eg-office365>}"
: "${OPERATION:?Set OPERATION=<operation-id-eg-OnNewEmail>}"
: "${CALLBACK_URL:?Set CALLBACK_URL=<https-callback-endpoint>}"

az connector-namespace trigger create -g "$RG" --namespace "$NS" -n "$TRIGGER" \
    --connection-details "{\"connectionName\":\"$CONN\",\"connectorName\":\"$CONNECTOR_NAME\"}" \
    --operation-name "$OPERATION" \
    --notification-details "{\"callbackUrl\":\"$CALLBACK_URL\"}"

echo
echo ">>> Trigger $TRIGGER created."
echo ">>> Inspect runs:"
echo ">>>   az connector-namespace trigger run    list -g $RG --namespace $NS --trigger-name $TRIGGER -o table"
echo ">>>   az connector-namespace trigger status show -g $RG --namespace $NS --trigger-name $TRIGGER -n primary"
