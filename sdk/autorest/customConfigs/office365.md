# office365 Custom Config

> see https://aka.ms/autorest

## Configuration

```yaml
# https://github.com/Azure/autorest/blob/master/Samples/openapi-v2/3h-try-require/readme.md
require: ../readme.md

# Add your own config below
directive:
  - rename-operation-extended:
      from: CalendarGetTables_V2
      to: GetCalendars_V2
  - rename-operation-extended:
      from: CalendarDeleteItem_V2
      to: DeleteCalendarEvent_V2
  - rename-operation-extended:
      from: ContactGetItems_V2
      to: GetContacts_V2
  - rename-operation-extended:
      from: ContactPostItem_V2
      to: CreateContact_V2
  - rename-operation-extended:
      from: ContactDeleteItem_V2
      to: DeleteContact_V2
  - rename-operation-extended:
      from: ContactGetItem_V2
      to: GetContact_V2
  - rename-operation-extended:
      from: ContactPatchItem_V2
      to: UpdateContact_V2
  - rename-operation-extended:
      from: V3CalendarGetItem
      to: GetCalendarEvent_V3
  - rename-operation-extended:
      from: V4CalendarGetItems
      to: GetCalendarEvents_V4
  - rename-operation-extended:
      from: V4CalendarPostItem
      to: CreateCalendarEvent_V4
  - rename-operation-extended:
      from: V4CalendarPatchItem
      to: UpdateCalendarEvent_V4
  - rename-operation-extended:
      from: SharedMailboxSendEmailV2
      to: SendEmailFromSharedMailboxV2
  - rename-operation-extended:
      from: ContactGetTablesV2
      to: GetContactFolders_V2
  - rename-operation-extended:
      from: ReplyToV3
      to: ReplyToEmailV3
  - rename-operation-extended:
      from: ReceiveResponseGet
      to: GetRecordResponse
  - rename-operation-extended:
      from: ReceiveResponsePost
      to: PostRecordResponse
  - rename-operation-extended:
      from: CalendarGetTable
      to: GetCalendarMetadata
  - rename-operation-extended:
      from: ContactGetTable
      to: GetFolderMetadata
  - rename-operation-extended:
      from: CreateOnFlaggedEmailPokeSubscription
      to: CreateOnFlaggedEmailSubscription
  - rename-operation-extended:
      from: CreateGraphOnFlaggedEmailPokeSubscription
      to: CreateOnFlaggedEmailGraphSubscription
  - rename-operation-extended:
      from: CreateGraphOnNewEmailPokeSubscription
      to: CreateOnNewEmailGraphSubscription
  - rename-operation-extended:
      from: CreateGraphOnNewMentionMeEmailPokeSubscription
      to: CreateOnNewMentionMeEmailGraphSubscription
  - rename-operation-extended:
      from: CreateOnNewEmailPokeSubscription
      to: CreateOnNewEmailSubscription
  - rename-operation-extended:
      from: CreateOnNewMentionMeEmailPokeSubscription
      to: CreateOnNewMentionMeEmailSubscription
  - rename-operation-extended:
      from: CreateOnChangedEventPokeSubscription
      to: CreateOnChangedEventSubscription
  - rename-operation-extended:
      from: CreateGraphOnChangedEventPokeSubscription
      to: CreateOnChangedEventGraphSubscription
```