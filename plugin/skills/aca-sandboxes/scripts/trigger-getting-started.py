"""Trigger Getting Started — Create and manage trigger configs using az rest.

End-to-end walk-through:
  1. Discover available trigger operations
  2. Create a trigger config (connector event → sandbox command)
  3. List and inspect trigger configs
  4. Enable / disable the trigger config
  5. Delete the trigger config

Prerequisites:
  - Azure CLI signed in (az login)
  - Connector + connection already set up
  - Sandbox group + sandbox already created

Usage:
    python trigger-getting-started.py -g <resource-group> --gateway <gw-name> --sandbox-id <id> --sandbox-group <sg>
    python trigger-getting-started.py -g <resource-group> --gateway <gw-name> --sandbox-id <id> --sandbox-group <sg> --connector office365
"""

import argparse
import json
import subprocess
import sys
import tempfile
import os
import uuid

parser = argparse.ArgumentParser(description="Trigger Getting Started")
parser.add_argument("-g", "--resource-group", required=True, help="Resource group")
parser.add_argument("--gateway", required=True, help="Connector name")
parser.add_argument("--connector", default="office365", help="Connector type (default: office365)")
parser.add_argument("--connection-name", default=None, help="Connection name on the gateway")
parser.add_argument("--sandbox-id", required=True, help="Sandbox ID for trigger target")
parser.add_argument("--sandbox-group", required=True, help="Sandbox group for trigger target")
parser.add_argument("--cleanup", action="store_true", help="Delete trigger after")
args = parser.parse_args()

account = json.loads(subprocess.run(
    ["az", "account", "show", "-o", "json"],  # noqa: S607 -- fixed args, PATH-resolved az CLI
    capture_output=True, text=True, check=True).stdout)

subscription_id = account["id"]
rg = args.resource_group
gateway = args.gateway
connector = args.connector
connection_name = args.connection_name or f"{connector}-conn"
sandbox_id = args.sandbox_id
sandbox_group = args.sandbox_group

ARM_BASE = f"https://management.azure.com/subscriptions/{subscription_id}/resourceGroups/{rg}/providers/Microsoft.Web/connectorGateways/{gateway}"
API_VERSION = "api-version=2026-05-01-preview"

print(f"User:             {account['user']['name']}")
print(f"Subscription:     {account['name']} ({subscription_id})")
print(f"Resource Group:   {rg}")
print(f"Gateway:          {gateway}")
print(f"Connector:        {connector}")
print(f"Connection:       {connection_name}")


def az_rest(method, url, body=None, resource=None, ignore_errors=False):
    """Call az rest and return parsed JSON.

    Prints an error message on failure and re-raises `CalledProcessError` so
    callers can decide whether to handle or propagate it. Pass
    `ignore_errors=True` to suppress the print + raise and return None instead
    (useful for existence checks like 'ACL exists?').
    """
    cmd = ["az", "rest", "--method", method, "--url", url]
    if resource:
        cmd += ["--resource", resource]
    if body:
        # Use temp file to avoid PowerShell/shell quoting issues
        tmp = tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False)
        json.dump(body, tmp)
        tmp.close()
        cmd += ["--body", f"@{tmp.name}"]
    try:
        # cmd is always a fixed "az ..." argument list built above -- never shell=True
        # or untrusted input, so this is not a command-injection risk.
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)  # noqa: S603
        return json.loads(result.stdout) if result.stdout.strip() else {}
    except subprocess.CalledProcessError as e:
        if ignore_errors:
            return None
        error_msg = e.stderr[:300] if e.stderr else "unknown error"
        print(f"  ❌ az rest {method} failed: {error_msg}")
        raise
    finally:
        if body:
            os.unlink(tmp.name)


def ensure_user_acl(conn_arm_base, conn_location):
    """Idempotently ensure the signed-in user has an ACL on the connection.
    Required to call the metadata URL with the API Hub audience.
    """
    user_oid = subprocess.run(
        ["az", "ad", "signed-in-user", "show", "--query", "id", "-o", "tsv"],  # noqa: S607
        capture_output=True, text=True, check=True).stdout.strip()
    tenant_id = subprocess.run(
        ["az", "account", "show", "--query", "tenantId", "-o", "tsv"],  # noqa: S607
        capture_output=True, text=True, check=True).stdout.strip()
    acl_url = f"{conn_arm_base}/accessPolicies/{user_oid}?{API_VERSION}"
    # GET first — only create if missing
    if az_rest("GET", acl_url, ignore_errors=True) is None:
        print(f"  Creating user-ACL on connection for objectId {user_oid}...")
        az_rest("PUT", acl_url, body={
            "location": conn_location,
            "properties": {
                "principal": {
                    "type": "ActiveDirectory",
                    "identity": {"objectId": user_oid, "tenantId": tenant_id},
                }
            },
        })
    else:
        print(f"  User-ACL already exists for objectId {user_oid}.")


# =========================================================================
# Step 1: Discover Trigger Operations (via connector Swagger from metadata URL)
# =========================================================================
print("\n" + "=" * 60)
print(f"Step 1: Discover Trigger Operations for {connector}")
print("=" * 60)

# Get the gateway info — used later for ACL location + gateway MI identity
gw_info = az_rest("GET", f"{ARM_BASE}?{API_VERSION}")
location = gw_info.get("location", "westcentralus")

# Get the connection's runtime URL (requires connection to exist)
conn_info = az_rest("GET", f"{ARM_BASE}/connections/{connection_name}?{API_VERSION}")
runtime_url = conn_info.get("properties", {}).get("connectionRuntimeUrl")
if not runtime_url:
    print("  ❌ Connection has no connectionRuntimeUrl yet. Complete OAuth consent first.")
    sys.exit(1)
conn_location = conn_info.get("location", location)

# Ensure the signed-in user has an ACL on the connection (idempotent — GET first, PUT only if missing).
# The metadata URL requires connection-level auth.
ensure_user_acl(f"{ARM_BASE}/connections/{connection_name}", conn_location)

# Derive the metadata URL: replace /apim/ with /metadata/
metadata_url = runtime_url.replace("/apim/", "/metadata/") + "?export=true"

# Call metadata URL with the API Hub audience
swagger = az_rest("GET", metadata_url, resource="https://apihub.azure.com")

# Filter paths for operations with x-ms-trigger
trigger_ops = []
for path, methods in swagger.get("paths", {}).items():
    for method, details in methods.items():
        if not isinstance(details, dict):
            continue
        trigger = details.get("x-ms-trigger")
        if not trigger:
            continue
        op_id = details.get("operationId")
        if not op_id:
            # Skip operations without an operationId — can't address them downstream
            continue
        # x-ms-trigger is typically an object like {"type": "polling"} or a string
        trigger_type_str = trigger.get("type") if isinstance(trigger, dict) else str(trigger)
        trigger_ops.append({
            "name": op_id,
            "path": path,
            "method": method.upper(),
            "summary": details.get("summary", ""),
            "trigger": trigger_type_str or "unknown",
        })

if not trigger_ops:
    print("  ❌ No trigger operations found for this connector.")
    print(f"     Verify connector name '{connector}' is correct.")
    sys.exit(1)

print(f"  {len(trigger_ops)} trigger operations available:")
for i, op in enumerate(trigger_ops, 1):
    print(f"    {i}. {op['name']}: {op['summary']} [{op['trigger']}]")

# Auto-select first trigger for demo purposes (interactive scripts should prompt user)
selected_op = trigger_ops[0]
selected_name = selected_op["name"]
trigger_type = selected_op["trigger"]
print(f"\n  Selected: {selected_name}")

# Polling/recurrence trigger detection:
# Metadata Swagger commonly yields x-ms-trigger.type values like "polling" or "webhook"
# (or "batch"/"single" in older swaggers). Polling triggers fire on a schedule and
# accept a recurrence parameter; inform the user about the default interval.
if trigger_type.lower() in ("polling", "batch", "single"):
    # NOTE: To determine if this is a recurrence trigger, check the Swagger for
    # the operation. If it lacks both x-ms-notification and x-ms-notification-content,
    # it's a recurrence/polling trigger regardless of single/batch.
    print("\n  ℹ️  Check Swagger for this operation to determine if it's a recurrence trigger.")
    print("      If no x-ms-notification and no x-ms-notification-content → it's a polling trigger.")
    print("      Default recurrence: every 3 minutes. Ask user if they want to change it.")

# =========================================================================
# Step 2: Create Access Policy + RBAC (required before trigger creation)
# =========================================================================
print("\n" + "=" * 60)
print("Step 2: Create Access Policy + RBAC")
print("=" * 60)

# Get gateway identity
gw_principal_id = gw_info.get("identity", {}).get("principalId")
gw_tenant_id = gw_info.get("identity", {}).get("tenantId")
if not gw_principal_id:
    print("  ❌ Gateway has no managed identity. Cannot create trigger.")
    print("     Recreate gateway with SystemAssigned identity.")
    sys.exit(1)

# Create access policy (gateway MI → connection)
acl_body = {
    "location": location,
    "properties": {
        "principal": {
            "type": "ActiveDirectory",
            "identity": {"objectId": gw_principal_id, "tenantId": gw_tenant_id},
        }
    },
}
az_rest("PUT", f"{ARM_BASE}/connections/{connection_name}/accessPolicies/gateway-acl?{API_VERSION}", body=acl_body)
print(f"  ✓ Access policy: gateway MI → {connection_name}")

# Assign RBAC role (Dev Compute SandboxGroup Data Owner) on sandbox group
ROLE_ID = "c24cf47c-5077-412d-a19c-45202126392c"
sg_scope = f"/subscriptions/{subscription_id}/resourceGroups/{rg}/providers/Microsoft.App/sandboxGroups/{sandbox_group}"
role_body = {
    "properties": {
        "roleDefinitionId": f"/subscriptions/{subscription_id}/providers/Microsoft.Authorization/roleDefinitions/{ROLE_ID}",
        "principalId": gw_principal_id,
        "principalType": "ServicePrincipal",
    }
}
assignment_name = str(uuid.uuid5(uuid.NAMESPACE_URL, f"{gw_principal_id}-{sandbox_group}-{ROLE_ID}"))
role_url = f"https://management.azure.com{sg_scope}/providers/Microsoft.Authorization/roleAssignments/{assignment_name}?api-version=2022-04-01"
try:
    az_rest("PUT", role_url, body=role_body)
    print("  ✓ RBAC role assigned: gateway MI → sandbox group")
except subprocess.CalledProcessError as e:
    if "RoleAssignmentExists" in (e.stderr or ""):
        print("  ✓ RBAC role already exists")
    else:
        print(f"  ⚠️  RBAC assignment failed (trigger may 403): {e.stderr[:200] if e.stderr else 'unknown error'}")

# =========================================================================
# Step 3: Create Trigger Config
# =========================================================================
print("\n" + "=" * 60)
print("Step 3: Create Trigger Config")
print("=" * 60)
config_name = f"{connector}-trigger"

# Sandbox data-plane endpoints are regional (management.{region}.azuredevcompute.io),
# NOT management.azuredevcompute.io — using the unregional host causes a 404
# GlobalSandboxNotFound when the trigger fires. See gotchas.md and trigger-setup.md.
sandbox_group_url = (
    f"https://management.azure.com/subscriptions/{subscription_id}"
    f"/resourceGroups/{rg}/providers/Microsoft.App/sandboxGroups/{sandbox_group}"
    "?api-version=2026-02-01-preview"
)
sandbox_region = az_rest("GET", sandbox_group_url).get("location", location)

# Build connector-aware default parameters
DEFAULT_PARAMS = {
    "office365": [{"name": "folderPath", "value": "Inbox"}],
    "sharepointonline": [],  # requires dynamic values (siteUrl, listName)
    "onedriveforbusiness": [],  # requires dynamic values (folderPath)
    "teams": [],  # requires dynamic values (teamId, channelId)
}
parameters = DEFAULT_PARAMS.get(connector, [])
if not parameters:
    print(f"  ℹ️  No default parameters for '{connector}'. Trigger will use operation defaults.")

trigger_body = {
    "properties": {
        "connectionDetails": {
            "connectorName": connector,
            "connectionName": connection_name,
        },
        "metadata": {
            "sandboxGroupName": sandbox_group,
            "sandboxId": sandbox_id,
        },
        "notificationDetails": {
            "authentication": {
                "audience": "https://management.azuredevcompute.io/",
                "type": "ManagedServiceIdentity",
            },
            "body": {
                "activationMode": "OnDemand",
                "command": f"echo 'Trigger {config_name} fired!' >> /tmp/trigger.log",
            },
            "callbackUrl": (
                f"https://management.{sandbox_region}.azuredevcompute.io/subscriptions/{subscription_id}"
                f"/resourceGroups/{rg}/sandboxGroups/{sandbox_group}/sandboxes/{sandbox_id}"
                "/executeShellCommand?api-version=2026-02-01-preview"
            ),
            "httpMethod": "Post",
        },
        "operationName": selected_name,
        "parameters": parameters,
    }
}

trigger = az_rest("PUT", f"{ARM_BASE}/triggerConfigs/{config_name}?{API_VERSION}", body=trigger_body)
state = trigger.get("properties", {}).get("state", "Unknown")
print(f"  ✓ Trigger config: {config_name} ({state})")

# =========================================================================
# Step 4: List and Inspect Trigger Configs
# =========================================================================
print("\n" + "=" * 60)
print("Step 4: List Trigger Configs")
print("=" * 60)

triggers = az_rest("GET", f"{ARM_BASE}/triggerConfigs?{API_VERSION}")
for t in triggers.get("value", []):
    name = t.get("name", "?")
    s = t.get("properties", {}).get("state", "?")
    print(f"    {name}: {s}")

# =========================================================================
# Step 5: Enable / Disable
# =========================================================================
print("\n" + "=" * 60)
print("Step 5: Enable / Disable Trigger Config")
print("=" * 60)

az_rest("POST", f"{ARM_BASE}/triggerConfigs/{config_name}/disable?{API_VERSION}")
print(f"  Disabled: {config_name}")

az_rest("POST", f"{ARM_BASE}/triggerConfigs/{config_name}/enable?{API_VERSION}")
print(f"  Enabled: {config_name}")

# =========================================================================
# Step 6: Cleanup
# =========================================================================
if args.cleanup:
    print("\n" + "=" * 60)
    print("Step 6: Cleanup")
    print("=" * 60)
    az_rest("DELETE", f"{ARM_BASE}/triggerConfigs/{config_name}?{API_VERSION}")
    print(f"  ✓ Deleted trigger config: {config_name}")
else:
    print("\n  Trigger left running. Pass --cleanup to delete.")

print("\nDone!")

