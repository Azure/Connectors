# Azure Connectors Private Preview :rocket:
 
The early release of **Azure API Connections** as a service opens up [Azure connectors](https://docs.microsoft.com/en-us/connectors/connector-reference/connector-reference-logicapps-connectors) to Azure Functions and Durable Functions (Imperative Workflows), which were limited to Azure Logic Apps (Declarative/Low-Code Workflows) until now. The ever growing collection of these connectors can now be used seamlessly and consistently across both Azure Functions and Azure Logic Apps.

Azure API Connections combined with Azure Connector sdk(s) assist Azure Application Developers by,
- Drastically help **Reduce Development Cost** of integrating with multiple services. :moneybag::moneybag::moneybag:
- **Authentication** is made **Easy and Fully Managed** esp. for OAuth based API's. :zap:

This release includes:
- **[VSCode Extension](docs/vscode-extension/README.md)** to manage Azure API connections.
- **[Azure Connectors SDK(s)](docs/sdk/README.md)** available to download as a single package or by connector. Supports C#(NuGet) and TypeScript/JavaScript (npm).
- Ability to invoke API connections Locally or Remote from Azure Functions using Managed Identity or Connection Key.

## Get Started!
Follow along our **[QUICKSTART GUIDE](docs/QUICKSTART.md)** for step by step instructions.

Check out the [**SAMPLES**](https://github.com/Azure/Connectors/tree/preview/samples) folder on how to leverage the supported connectors sdk(s) in Azure Functions and WebApps. 

Do check out the [**FAQs**](docs/FAQ.md) for more details and [**KNOWN ISSUES**](docs/KNOWN_ISSUES.md) if you run into any limitations or errors.

## Contributing

This project welcomes contributions and suggestions. Most contributions require you to agree to a Contributor License Agreement (CLA) declaring that you have the right to, and actually do, grant us the rights to use your contribution. For details, visit https://cla.opensource.microsoft.com.

When you submit a pull request, a CLA bot will automatically determine whether you need to provide a CLA and decorate the PR appropriately (e.g., status check, comment). Simply follow the instructions provided by the bot. You will only need to do this once across all repos using our CLA.

This project has adopted the Microsoft Open Source Code of Conduct. For more information see the Code of Conduct FAQ or contact opencode@microsoft.com with any additional questions or comments.

There are several ways you can contribute to this repo:

-   **Ideas, feature requests and bugs**: We are open to all ideas and we want to get rid of bugs! Use the [Issues](https://github.com/Azure/Connectors/issues) section to either report a new issue, share your ideas, or contribute to ongoing discussions.
-   **Documentation**: Found a typo or an awkwardly worded sentence? Submit a PR!
-   **Code**: We need your help expanding the samples. :punch:


## Legal

Before we can accept your pull request you will need to sign a **Contribution License Agreement**. All you need to do is to submit a pull request, then the PR will get appropriately labelled (e.g. `cla-required`, `cla-norequired`, `cla-signed`, `cla-already-signed`). If you already signed the agreement we will continue with reviewing the PR, otherwise system will tell you how you can sign the CLA. Once you sign the CLA all future PR's will be labeled as `cla-signed`.

## Code of Conduct

This project has adopted the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/). For more information see the [Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/) or contact [opencode@microsoft.com](mailto:opencode@microsoft.com) with any additional questions or comments.

## License

[MIT](LICENSE.md)
