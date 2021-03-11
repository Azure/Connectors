# [ConnectorName] Custom Config

> see https://aka.ms/autorest

## Configuration

```yaml
# https://github.com/Azure/autorest/blob/master/Samples/openapi-v2/3h-try-require/readme.md
require: ../readme.md

# Add your own config below
directive: 
  - rename-operation-extended:
      from: Subscriptions_List
      to: ListSubscriptions
  - rename-operation-extended:
      from: ContainerGroups_List
      to: ListContainerGroups
  - rename-operation-extended:
      from: Location_ListCachedImages
      to: GetCachedImages
  - rename-operation-extended:
      from: Location_ListCapabilities
      to: GetCapabilities
  - rename-operation-extended:
      from: Location_ListUsage
      to: GetCurrentUsage
  - rename-operation-extended:
      from: ContainerGroups_ListByResourceGroup
      to: ListContainerGroupsByResourceGroup
  - rename-operation-extended:
      from: ContainerGroups_Delete
      to: DeleteContainerGroup
  - rename-operation-extended:
      from: ContainerGroups_Get
      to: GetContainerGroup
  - rename-operation-extended:
      from: ContainerGroups_Update
      to: UpdateContainerGroup
  - rename-operation-extended:
      from: ContainerGroups_CreateOrUpdate
      to: CreateOrUpdateContainerGroup
  - rename-operation-extended:
      from: ContainerLogs_List
      to: GetContainerLogs
  - rename-operation-extended:
      from: ContainerGroups_Restart
      to: RestartContainers
  - rename-operation-extended:
      from: ContainerGroups_Start
      to: StartContainers
  - rename-operation-extended:
      from: ContainerGroups_Stop
      to: StopContainers
  - rename-operation-extended:
      from: ResourceGroups_List
      to: ListResourceGroups
```