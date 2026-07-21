import { build } from "esbuild";
import { builtinModules } from "node:module";
import { readFile, readdir, writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = dirname(fileURLToPath(import.meta.url));
const distributionRoot = join(packageRoot, "extensions", "connector-namespaces");
const bundlePath = join(distributionRoot, "extension.mjs");
const noticesPath = join(distributionRoot, "THIRD-PARTY-NOTICES.txt");
const checkOnly = process.argv.includes("--check");
const hostSdk = "@github/copilot-sdk/extension";
const forbiddenPackages = new Set([
    "@azure/identity-cache-persistence",
    "@azure/msal-node-extensions",
    "keytar",
]);
const builtins = new Set([
    ...builtinModules,
    ...builtinModules.map((name) => `node:${name}`),
]);

const result = await build({
    absWorkingDir: packageRoot,
    entryPoints: ["extension.mjs"],
    outfile: bundlePath,
    bundle: true,
    format: "esm",
    platform: "node",
    target: "node20",
    minify: true,
    legalComments: "eof",
    sourcemap: false,
    metafile: true,
    write: false,
    external: [hostSdk],
    banner: {
        js: "import { createRequire as __cliCreateRequire } from \"node:module\"; const require = __cliCreateRequire(import.meta.url);",
    },
});

const output = result.outputFiles.find((file) => file.path === bundlePath);
if (!output) {
    throw new Error(`esbuild did not produce ${bundlePath}`);
}

const externalImports = Object.values(result.metafile.outputs)
    .flatMap((entry) => entry.imports)
    .filter((entry) => entry.external)
    .map((entry) => entry.path);
const unexpectedImports = [...new Set(externalImports)]
    .filter((specifier) => specifier !== hostSdk && !builtins.has(specifier))
    .sort();
if (unexpectedImports.length > 0) {
    throw new Error(`Unexpected external imports: ${unexpectedImports.join(", ")}`);
}

function packageManifestFromInput(input) {
    const normalized = input.replaceAll("\\", "/");
    const marker = "node_modules/";
    const index = normalized.lastIndexOf(marker);
    if (index === -1) return null;
    const parts = normalized.slice(index + marker.length).split("/");
    const packageName = parts[0].startsWith("@") ? `${parts[0]}/${parts[1]}` : parts[0];
    const packagePath = normalized.slice(0, index + marker.length) + packageName;
    return join(packageRoot, ...packagePath.split("/"), "package.json");
}

async function generateThirdPartyNotices() {
    const manifestPaths = [...new Set(
        Object.keys(result.metafile.inputs).map(packageManifestFromInput).filter(Boolean),
    )].sort();
    const entries = [];

    for (const manifestPath of manifestPaths) {
        const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
        if (forbiddenPackages.has(manifest.name)) {
            throw new Error(`Forbidden native or persistent credential package bundled: ${manifest.name}`);
        }
        const packageDirectory = dirname(manifestPath);
        const licenseFile = (await readdir(packageDirectory))
            .filter((file) => /^licen[cs]e(?:\.|$)/i.test(file))
            .sort()[0];
        if (!licenseFile) {
            throw new Error(`Bundled package ${manifest.name} has no license file`);
        }
        const licenseText = (await readFile(join(packageDirectory, licenseFile), "utf8")).trim();
        entries.push([
            "==============================================================================",
            `${manifest.name} ${manifest.version}`,
            `License: ${manifest.license || "See license text below"}`,
            `Source: ${manifest.repository?.url || manifest.homepage || `https://www.npmjs.com/package/${manifest.name}`}`,
            "",
            licenseText,
        ].join("\n"));
    }

    return [
        "THIRD-PARTY SOFTWARE NOTICES AND INFORMATION",
        "",
        "This file is generated from the packages included in extension.mjs.",
        `${hostSdk} is supplied by the GitHub Copilot host and is not bundled.`,
        "",
        ...entries,
        "",
    ].join("\n");
}

async function updateArtifact(path, expected) {
    if (checkOnly) {
        let actual;
        try {
            actual = await readFile(path);
        } catch (error) {
            if (error?.code === "ENOENT") {
                throw new Error(`${path} is missing; run npm run build`);
            }
            throw error;
        }
        if (!actual.equals(expected)) {
            throw new Error(`${path} is stale; run npm run build and commit the result`);
        }
        return;
    }

    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, expected);
}

const notices = Buffer.from(await generateThirdPartyNotices(), "utf8");
await updateArtifact(bundlePath, Buffer.from(output.contents));
await updateArtifact(noticesPath, notices);

const size = output.contents.byteLength;
process.stdout.write(`${checkOnly ? "Verified" : "Built"} ${bundlePath} (${size} bytes)\n`);
