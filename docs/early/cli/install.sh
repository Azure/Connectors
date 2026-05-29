#!/usr/bin/env sh
# Install (or uninstall) the `az connector-namespace` Azure CLI extension.
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/Azure/Connectors/main/docs/early/cli/install.sh | sh
#
#   # Pin a specific version:
#   curl -fsSL https://raw.githubusercontent.com/Azure/Connectors/main/docs/early/cli/install.sh \
#     | CONNECTOR_NAMESPACE_VERSION=1.0.0b9 sh
#
#   # Uninstall:
#   curl -fsSL https://raw.githubusercontent.com/Azure/Connectors/main/docs/early/cli/install.sh \
#     | sh -s -- --uninstall

set -eu

REPO="Azure/Connectors"
EXT_NAME="connector-namespace"
PKG_NAME="connector_namespace"
LATEST_URL="https://raw.githubusercontent.com/${REPO}/main/docs/early/cli/latest-version.txt"

UNINSTALL=0
for arg in "$@"; do
  case "$arg" in
    --uninstall|-u) UNINSTALL=1 ;;
    -h|--help)
      sed -n '2,16p' "$0"
      exit 0
      ;;
  esac
done

if ! command -v az >/dev/null 2>&1; then
  echo "ERROR: Azure CLI ('az') not found." >&2
  echo "Install it first: https://learn.microsoft.com/cli/azure/install-azure-cli" >&2
  exit 1
fi

if [ "$UNINSTALL" -eq 1 ]; then
  if az extension show --name "$EXT_NAME" >/dev/null 2>&1; then
    az extension remove --name "$EXT_NAME"
    echo "Uninstalled '$EXT_NAME'."
  else
    echo "'$EXT_NAME' is not installed; nothing to do."
  fi
  exit 0
fi

# Resolve version: env var overrides latest-version.txt.
if [ -n "${CONNECTOR_NAMESPACE_VERSION:-}" ]; then
  VERSION="$CONNECTOR_NAMESPACE_VERSION"
  echo "Using pinned version: $VERSION (from \$CONNECTOR_NAMESPACE_VERSION)"
else
  VERSION=$(curl -fsSL "$LATEST_URL" | tr -d '[:space:]')
  if [ -z "$VERSION" ]; then
    echo "ERROR: Could not resolve latest version from $LATEST_URL" >&2
    exit 1
  fi
  echo "Resolved latest version: $VERSION"
fi

WHEEL="${PKG_NAME}-${VERSION}-py3-none-any.whl"
WHEEL_URL="https://github.com/${REPO}/releases/download/v${VERSION}/${WHEEL}"

echo "Installing '$EXT_NAME' v$VERSION ..."
echo "  Wheel: $WHEEL_URL"
echo ""

# --upgrade so re-running this script updates an existing install.
# --yes accepts the "extension is in preview" prompt automatically.
az extension add --upgrade --yes --source "$WHEEL_URL"

echo ""
echo "✓ Installed. Try:"
echo "    az connector-namespace --help"
