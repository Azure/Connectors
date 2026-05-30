#!/usr/bin/env bash
# 02-consent-flow.sh — Complete OAuth consent for a connection.
# See ../README.md#oauth-consent-flow.
#
# Required env: RG, NS, CONN, USER_OID, TENANT, REDIRECT_URL
# Optional env: CODE (when running step 3 after browser consent)

set -euo pipefail
: "${RG:?Set RG=<resource-group-name>}"
: "${NS:?Set NS=<connector-namespace-name>}"
: "${CONN:?Set CONN=<connection-name>}"
: "${USER_OID:?Set USER_OID=<entra-object-id-of-user>}"
: "${TENANT:?Set TENANT=<tenant-id>}"
: "${REDIRECT_URL:?Set REDIRECT_URL=<https-redirect-url>}"

if [[ -z "${CODE:-}" ]]; then
    echo "STEP 1: Generating consent URL..."
    az connector-namespace connection list-consent-links \
        -g "$RG" --namespace "$NS" --connection-name "$CONN" \
        --parameters "[{
            \"objectId\":      \"$USER_OID\",
            \"tenantId\":      \"$TENANT\",
            \"parameterName\": \"token\",
            \"redirectUrl\":   \"$REDIRECT_URL\"
        }]"
    echo
    echo ">>> Open the 'link' URL above in a browser, authorize,"
    echo ">>> then copy the 'code' query parameter from the redirect URL"
    echo ">>> and re-run with CODE=<value> $0"
else
    echo "STEP 2: Exchanging consent code for stored credentials..."
    az connector-namespace connection confirm-consent-code \
        -g "$RG" --namespace "$NS" --connection-name "$CONN" \
        --code "$CODE" \
        --object-id "$USER_OID" \
        --tenant-id "$TENANT"
    echo
    echo ">>> Consent complete. Try: az connector-namespace connection invoke -g $RG --namespace $NS --connection-name $CONN --request method=GET path=/v1.0/me"
fi
