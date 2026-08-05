// Catalog — fetches managed MCP connectors from the gateway.

import { listManagedApis } from "./armClient.mjs";
import { CATEGORY } from "./categories.mjs";

// Mirrors MANAGED_MCP_API_NAMES in Polaris
// (src/Cascade.Portal.Client/src/constants.ts). The ARM catalog has no
// capability flag that distinguishes managed MCP APIs from similarly named
// connectors, so both experiences use this explicit product allowlist.
export const MANAGED_MCP_API_NAMES = Object.freeze([
    "a365outlookmailmcp",
    "a365outlookcalendarmcp",
    "a365teamsmcp",
    "a365memcp",
    "a365copilotchatmcp",
    "a365wordmcp",
    "a365adminmcp",
    "workiqonedrive",
    "workiqsharepoint",
    "workiqmcp",
    "office365",
    "microsoftlearndocsmcpserver",
    "kusto",
    "jira",
    "databricksinc",
    "mondaycom",
    "zapiermcp",
    "boxmcpserver",
    "cdataconnectai",
    "tavilymcp",
    "cronofymcp",
]);

const managedMcpApiAllowlist = new Set(MANAGED_MCP_API_NAMES);

export function isManagedMcpApi(api) {
    return managedMcpApiAllowlist.has(api.name) ||
        managedMcpApiAllowlist.has(api.properties?.name);
}

// Microsoft first-party servers group under "Microsoft"; everything else is
// a partner server. Office 365 and Kusto use legacy API ids that do not carry
// the newer Microsoft prefixes or branding.
export function categoryFor(name, displayName) {
    const n = (name || "").toLowerCase();
    const d = (displayName || "").toLowerCase();
    const isMicrosoft =
        n === "office365" ||
        n === "kusto" ||
        /^(a365|d365|workiq)/.test(n) ||
        d.startsWith("microsoft") ||
        d.startsWith("work iq") ||
        d.startsWith("dynamics 365");
    return isMicrosoft ? CATEGORY.microsoft : CATEGORY.partner;
}

let cachedCatalog = null;
let cacheKey = null;

export function invalidateCache() {
    cachedCatalog = null;
    cacheKey = null;
}

export async function fetchCatalog(subscriptionId, resourceGroup, gatewayName) {
    const key = `${subscriptionId}/${resourceGroup}/${gatewayName}`;
    if (cachedCatalog && cacheKey === key) return cachedCatalog;

    const apis = await listManagedApis(subscriptionId, resourceGroup, gatewayName);

    const catalog = apis
        .filter(isManagedMcpApi)
        .map((a) => {
            const props = a.properties || {};
            const general = props.generalInformation || {};
            const metadata = props.metadata || {};
            const displayName = general.displayName || a.name;
            return {
                id: a.name,
                apiName: a.name,
                displayName,
                description: general.description || "",
                iconUri: general.iconUri || "",
                brandColor: metadata.brandColor || "",
                category: categoryFor(a.name, displayName),
            };
        });

    cachedCatalog = catalog;
    cacheKey = key;
    return catalog;
}
