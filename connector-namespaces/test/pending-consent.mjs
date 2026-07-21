import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

export const PENDING_CONSENT_TTL_MS = 24 * 60 * 60 * 1000;
export const MAX_PENDING_CONSENTS = 100;

function emptyMap() {
    return Object.create(null);
}

function isPendingConsent(entry, now) {
    return entry
        && typeof entry === "object"
        && !Array.isArray(entry)
        && Number.isFinite(entry.savedAt)
        && entry.savedAt <= now
        && now - entry.savedAt <= PENDING_CONSENT_TTL_MS
        && typeof entry.connName === "string"
        && entry.connName.length > 0
        && typeof entry.location === "string"
        && entry.location.length > 0
        && typeof entry.consentUrl === "string"
        && /^https?:\/\//.test(entry.consentUrl);
}

export function writePendingConsents(path, pending) {
    const directory = dirname(path);
    if (!existsSync(directory)) mkdirSync(directory, { recursive: true, mode: 0o700 });
    chmodSync(directory, 0o700);
    if (existsSync(path)) chmodSync(path, 0o600);
    writeFileSync(path, JSON.stringify(pending, null, 2), { encoding: "utf-8", mode: 0o600 });
    chmodSync(path, 0o600);
}

export function readPendingConsents(path, now = Date.now()) {
    if (!existsSync(path)) return emptyMap();

    let parsed;
    try {
        parsed = JSON.parse(readFileSync(path, "utf-8"));
    } catch {
        const empty = emptyMap();
        writePendingConsents(path, empty);
        return empty;
    }

    const validRoot = parsed && typeof parsed === "object" && !Array.isArray(parsed);
    const entries = validRoot ? Object.entries(parsed) : [];
    const valid = entries
        .filter(([, entry]) => isPendingConsent(entry, now))
        .sort((a, b) => b[1].savedAt - a[1].savedAt)
        .slice(0, MAX_PENDING_CONSENTS);
    const pending = emptyMap();
    for (const [apiName, entry] of valid) {
        pending[apiName] = entry;
    }

    if (!validRoot || valid.length !== entries.length) {
        writePendingConsents(path, pending);
    }
    return pending;
}
