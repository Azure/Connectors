# Connector Namespaces

> Connect your AI agents and workloads to the apps you already use.

**🌐 Portal: [connectors.azure.com](https://connectors.azure.com)**

Connector Namespaces is a Microsoft Azure service that lets you bring connectors into your own namespace and use them with AI agents, Logic Apps, and other workloads — with the security, governance, and lifecycle controls your organization expects.

## Status

🚧 This repository is being set up. Content, samples, and documentation will be added shortly.

## Skills for Coding Agents

This repo doubles as a plugin marketplace for GitHub Copilot CLI and Claude Code.
It provides a skills plugin for driving Azure Connectors from natural language
and a standalone GitHub Copilot canvas for browsing hosted MCP servers.

### GitHub Copilot CLI

Requires GitHub Copilot CLI **1.0.58 or later** (run `copilot update` if needed):

```bash
/plugin marketplace add Azure/Connectors
/plugin install azure-connectornamespace@Azure-Connectors
/plugin install connector-namespaces@Azure-Connectors
```

### Claude Code

```bash
claude plugin add Azure/Connectors
```

### Available skills

| Skill | Description |
|-------|-------------|
| [azure-connectornamespace](plugin/skills/connectors/SKILL.md) | Generic, callback-agnostic — manage connector namespaces, connections, trigger configs that POST to any HTTP(S) callback (Function App, Logic App, App Service, custom webhook), and MCP server configs that expose connector operations as MCP tools. |
| [azure-connectornamespace-aca-sandbox](plugin/skills/aca-sandboxes/SKILL.md) | ACA-sandbox edition — manage connector namespaces, connections, and triggers; wire external services (Office 365, Teams, Forms, SharePoint, OneDrive, GitHub, Azure Blob) to Azure Container Apps sandbox apps via event-driven triggers or direct API calls using connection runtime URLs. |

See [`plugin/skills/connectors/README.md`](plugin/skills/connectors/README.md) for more detail.

### MCP Connectors canvas

The standalone `connector-namespaces` plugin provides the **MCP Connectors**
canvas for
discovering, connecting, and managing hosted MCP servers from an Azure
Connector Namespace. It keeps Azure access and refresh tokens in extension
process memory only; the selected namespace is retained so a reload can prompt
for sign-in and return directly to its connector catalog.

The checked-in `extension.mjs` is a self-contained bundle: fresh plugin installs
do not run `npm install` or require `node_modules`. See the
[canvas documentation](connector-namespaces/README.md) for usage,
security details, and development commands.

## Resources

- 🌐 [Portal](https://connectors.azure.com) — the Connector Namespaces home page
- 🛠️ [Azure CLI extension](./public-preview/connector-namespace-cli/) — `az connector-namespace ...` for managing Connector Namespaces from the command line
- 📖 [Documentation](https://learn.microsoft.com/azure/) — coming soon
- 💬 [Discussions](https://github.com/Azure/Connectors/issues) — file an issue to start a conversation
- 🐛 [Report a bug](https://github.com/Azure/Connectors/issues/new?template=bug_report.yml)
- 💡 [Request a feature](https://github.com/Azure/Connectors/issues/new?template=feature_request.yml)

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

This project has adopted the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/). For more information see the [Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/) or contact [opencode@microsoft.com](mailto:opencode@microsoft.com) with any additional questions or comments.

## Security

To report a security issue, see [SECURITY.md](SECURITY.md). Please **do not** open public issues for security vulnerabilities.

## License

This project is licensed under the [MIT License](LICENSE).

## Trademarks

This project may contain trademarks or logos for projects, products, or services. Authorized use of Microsoft trademarks or logos is subject to and must follow [Microsoft's Trademark & Brand Guidelines](https://www.microsoft.com/legal/intellectualproperty/trademarks/usage/general). Use of Microsoft trademarks or logos in modified versions of this project must not cause confusion or imply Microsoft sponsorship. Any use of third-party trademarks or logos are subject to those third-party's policies.
