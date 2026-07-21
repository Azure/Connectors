# Releasing

This repository publishes public preview connector artifacts through GitHub Releases.

## Current release model

Releases are tag-based:

- Release tags use the `v<version>` shape, for example `v1.0.0b33`.
- GitHub automatically exposes source-code archives for each tag; their download names and internal top-level folder names are controlled by GitHub.
- The release workflow also uploads an explicit deterministic `Connectors-<version>.zip` source archive plus a `.sha256` file so the artifact, checksum, workflow run, and attestation are all visible in the release.

Do not create disposable `v*` tags for testing. Release tags are protected and are expected to represent real preview artifacts.

The standalone MCP Connectors canvas uses component-scoped tags named
`connector-namespaces-v<version>`. Its release workflow publishes a deterministic
archive of the root-level `connector-namespaces/` plugin, a checksum file, and an
awesome-copilot external-plugin descriptor pinned to the exact release SHA.

## Security controls

The repository has release-tag protection, release immutability, and a release approval environment:

- The active tag ruleset protects `refs/tags/v*` from deletion and non-fast-forward updates.
- Published releases are expected to become immutable after publication.
- The `release` environment requires approval from `@Azure/azure-connectors-contributors`, prevents self-review, disables admin bypass, and is restricted to protected branches.
- Existing older releases may not show as immutable if they were published before immutability was enabled.

After publishing a release, verify:

```powershell
gh api repos/Azure/Connectors/releases/tags/v<version>
gh api repos/Azure/Connectors/git/ref/tags/v<version>
gh api repos/Azure/Connectors/rulesets --jq '.[] | select(.target == "tag") | {name, enforcement, conditions, rules}'
gh api repos/Azure/Connectors/environments/release
```

Expected evidence:

- The release exists and is not a draft.
- Preview releases use `prerelease=true`.
- New releases must report `immutable=true`.
- The release contains `Connectors-<version>.zip` and `Connectors-<version>.zip.sha256` assets.
- The tag ref points to the intended commit or annotated tag object.
- The tag ruleset remains active for `refs/tags/v*` with `deletion` and `non_fast_forward` rules.
- The `release` environment still requires reviewers and prevents self-review.

## Release workflow

Use the **Release Connectors source archive** workflow for new releases.

The workflow publishes the release with `GITHUB_TOKEN` instead of an individual account. It validates the requested version and tag, verifies that the target commit is reachable from `main`, checks out that exact commit, builds a source archive with `git archive`, emits a SHA-256 file, creates a build-provenance attestation, publishes the release, and reads back the release immutability/tag metadata.

Required workflow inputs:

| Input | Purpose |
| --- | --- |
| `version` | Release version without a leading `v`, for example `1.0.0b34` |
| `target_ref` | Azure/Connectors ref or commit used for the release tag; must be reachable from `main` |
| `notes_start_tag` | Previous release tag used for generated notes |
| `prerelease` | Whether the GitHub Release should be marked as a prerelease |

Before running the workflow:

1. Confirm all release content is merged to `main` through a reviewed PR.
2. Confirm `target_ref` points to the reviewed `main` commit that should own the release tag.
3. Confirm the release environment approval is still configured.
4. Run the workflow from the `main` branch.

## MCP Connectors canvas releases

Use the **Release MCP Connectors canvas** workflow for the standalone canvas.
Run it from `main` only after the desired commit and generated
`connector-namespaces/extensions/connector-namespaces/extension.mjs` have passed
normal review and CI.

The workflow:

1. Verifies the requested commit is reachable from `main` and atomically creates
   or verifies the component tag at that exact commit.
2. Confirms the source package, lockfile, plugin manifest, and distribution
   package all use the requested version.
3. Rebuilds the extension and fails if the committed distribution is stale.
4. Runs the complete source and clean-install test suite.
5. Archives the complete `connector-namespaces/` plugin with no `node_modules`
   or native `.node` sidecars.
6. Attests the archive, publishes the immutable
   `connector-namespaces-v<version>` release, and verifies its assets and tag.
7. Generates an awesome-copilot external-plugin descriptor containing the
   public repository, `connector-namespaces` path, release tag, and exact SHA.

Before the first canvas release, extend the repository's tag ruleset to protect
`refs/tags/connector-namespaces-v*` from deletion and non-fast-forward updates.
After a release, use its generated descriptor when submitting the public
awesome-copilot external-plugin review issue. Do not edit
`github/awesome-copilot`'s `plugins/external.json` directly for the initial
submission.

## Why the workflow is safer

A workflow-backed release is safer than publishing artifacts from an individual account because it gives the repo a repeatable managed identity, auditable logs, constrained permissions, required approval, and provenance for the source archive.

The source archive workflow applies to this repository because the release content is repository content: documentation, plugin skill files, and public preview CLI materials. The downloaded `Connectors-1.0.0b33.zip` archive is not the generated `azext_connector_namespace` wheel; it is a source-code archive of this repository.

If future releases include a generated wheel or package again, the wheel source and deterministic build must be added to this repository or to another trusted workflow. Do not publish opaque externally built wheels as KPI-compliant artifacts.

## No manual release fallback

Do not publish releases manually through the GitHub UI or `gh release create`. The approved path is the release workflow because it is reviewed, environment-gated, checksummed, attested, and validated after publication.

GitHub release environments protect workflow deployments; they do not, by themselves, gate direct UI or API release creation. If a stronger technical block is required, combine least-privilege repository access with release-tag creation restrictions that still allow the approved workflow identity to create release tags. Until that is configured, manual release publishing remains prohibited by repo process.

## When additional build provenance is needed

The source archive workflow is sufficient for releases whose deliverable is repository content. It is not sufficient for a generated package that is not built from this repository.

If `connector_namespace-<version>-py3-none-any.whl` or another generated package is published in a future release, the KPI-compliant path is:

1. Put the authoritative package source under reviewed source control.
2. Build the package inside a trusted workflow.
3. Attest the built package.
4. Publish the attested package through the release workflow.
5. Read back release immutability, tag protection, artifact names, checksums, and attestations.