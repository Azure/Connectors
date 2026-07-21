import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
    MAX_PENDING_CONSENTS,
    PENDING_CONSENT_TTL_MS,
    readPendingConsents,
    writePendingConsents,
} from "./pending-consent.mjs";

test("pending consent reads prune expired and malformed URLs from disk", async (t) => {
    const directory = await mkdtemp(join(tmpdir(), "cn-pending-consent-"));
    t.after(() => rm(directory, { recursive: true, force: true }));
    const path = join(directory, "pending.json");
    const now = 2_000_000_000_000;
    await writeFile(path, JSON.stringify({
        fresh: {
            connName: "conn-fresh",
            location: "eastus",
            consentUrl: "https://login.example.test/consent",
            savedAt: now - 1_000,
        },
        expired: {
            connName: "conn-expired",
            location: "eastus",
            consentUrl: "https://login.example.test/expired",
            savedAt: now - PENDING_CONSENT_TTL_MS - 1,
        },
        missingTimestamp: {
            connName: "conn-missing",
            location: "eastus",
            consentUrl: "https://login.example.test/missing",
        },
        invalidUrl: {
            connName: "conn-invalid",
            location: "eastus",
            consentUrl: "javascript:alert(1)",
            savedAt: now - 1_000,
        },
    }));

    const pending = readPendingConsents(path, now);
    assert.deepEqual(Object.keys(pending), ["fresh"]);
    assert.deepEqual(Object.keys(JSON.parse(await readFile(path, "utf8"))), ["fresh"]);
});

test("pending consent reads retain only the newest bounded set", async (t) => {
    const directory = await mkdtemp(join(tmpdir(), "cn-pending-consent-"));
    t.after(() => rm(directory, { recursive: true, force: true }));
    const path = join(directory, "pending.json");
    const now = 2_000_000_000_000;
    const pending = Object.fromEntries(Array.from({ length: MAX_PENDING_CONSENTS + 5 }, (_, index) => [
        `connector-${index}`,
        {
            connName: `connection-${index}`,
            location: "eastus",
            consentUrl: `https://login.example.test/consent/${index}`,
            savedAt: now - index,
        },
    ]));
    writePendingConsents(path, pending);

    const bounded = readPendingConsents(path, now);
    assert.equal(Object.keys(bounded).length, MAX_PENDING_CONSENTS);
    assert.equal(Object.hasOwn(bounded, "connector-0"), true);
    assert.equal(Object.hasOwn(bounded, `connector-${MAX_PENDING_CONSENTS + 4}`), false);
});
