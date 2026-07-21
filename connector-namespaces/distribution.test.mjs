import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cp, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";

const packageRoot = dirname(fileURLToPath(import.meta.url));
const distributionRoot = join(packageRoot, "extensions", "connector-namespaces");
const hostSdk = "@github/copilot-sdk/extension";
const expectedFiles = [
    "LICENSE",
    "THIRD-PARTY-NOTICES.txt",
    "copilot-extension.json",
    "extension.mjs",
    "package.json",
];

test("the source-free distribution registers without node_modules", async (t) => {
    const temporaryRoot = await mkdtemp(join(tmpdir(), "connector-namespaces-dist-"));
    t.after(() => rm(temporaryRoot, { recursive: true, force: true }));

    const installRoot = join(temporaryRoot, "connector-namespaces");
    await cp(distributionRoot, installRoot, { recursive: true });

    assert.equal(existsSync(join(installRoot, "node_modules")), false);
    assert.deepEqual((await readdir(installRoot)).sort(), expectedFiles);

    const analysis = await build({
        entryPoints: [join(installRoot, "extension.mjs")],
        bundle: true,
        format: "esm",
        platform: "node",
        target: "node20",
        write: false,
        metafile: true,
        external: [hostSdk],
    });
    const externalImports = Object.values(analysis.metafile.outputs)
        .flatMap((output) => output.imports)
        .filter((entry) => entry.external)
        .map((entry) => entry.path);
    assert.equal(externalImports.includes(hostSdk), true);
    assert.equal(externalImports.some((specifier) => specifier.startsWith("@azure/")), false);
    assert.equal(externalImports.some((specifier) => specifier.startsWith("./")), false);

    const registrationPath = join(temporaryRoot, "registration.json");
    const stubPath = join(temporaryRoot, "sdk-stub.mjs");
    const loaderPath = join(temporaryRoot, "sdk-loader.mjs");
    await writeFile(stubPath, `
import { writeFileSync } from "node:fs";
export function createCanvas(declaration) { return declaration; }
export async function joinSession(config) {
    writeFileSync(process.env.CANVAS_REGISTRATION_FILE, JSON.stringify({
        canvases: config.canvases.map(({ id, displayName }) => ({ id, displayName })),
        tools: config.tools.map(({ name }) => ({ name })),
    }));
    return { workspacePath: undefined };
}
`, "utf8");
    await writeFile(loaderPath, `
const stubUrl = new URL("./sdk-stub.mjs", import.meta.url).href;
export async function resolve(specifier, context, nextResolve) {
    if (specifier === ${JSON.stringify(hostSdk)}) {
        return { url: stubUrl, shortCircuit: true };
    }
    return nextResolve(specifier, context);
}
`, "utf8");

    const loaded = spawnSync(process.execPath, [
        "--experimental-loader",
        pathToFileURL(loaderPath).href,
        join(installRoot, "extension.mjs"),
    ], {
        cwd: installRoot,
        encoding: "utf8",
        env: {
            ...process.env,
            CANVAS_REGISTRATION_FILE: registrationPath,
            COPILOT_HOME: join(temporaryRoot, "copilot-home"),
        },
    });
    assert.equal(loaded.status, 0, loaded.stderr || loaded.stdout);

    const registration = JSON.parse(await readFile(registrationPath, "utf8"));
    assert.deepEqual(registration, {
        canvases: [{ id: "connector-namespaces", displayName: "MCP Connectors" }],
        tools: [{ name: "connector_namespaces_open_playground" }],
    });
});
