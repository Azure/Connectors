# AzureQueues Custom Config

> see https://aka.ms/autorest

## Configuration

```yaml
# https://github.com/Azure/autorest/blob/master/Samples/openapi-v2/3h-try-require/readme.md
require: ../readme.md

directive:
  - rename-model: 
      from: Queue
      to: AzureQueue
```