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
      to: GetCalendarTables_V2
  - rename-operation-extended:
      from: CalendarDeleteItem_V2
      to: DeleteCalendarItem_V2
  - rename-operation-extended:
      from: ContactGetItems_V2
      to: GetContactItems_V2
  - rename-operation-extended:
      from: ContactPostItem_V2
      to: PostContactItem_V2
  - rename-operation-extended:
      from: ContactDeleteItem_V2
      to: DeleteContactItem_V2
  - rename-operation-extended:
      from: ContactGetItem_V2
      to: GetContactItem_V2
  - rename-operation-extended:
      from: ContactPatchItem_V2
      to: PatchContactItem_V2
  - rename-operation-extended:
      from: V3CalendarGetItem
      to: GetCalendarItemV3
  - rename-operation-extended:
      from: V4CalendarGetItems
      to: GetCalendarItemsV4
  - rename-operation-extended:
      from: V4CalendarPostItem
      to: PostCalendarItemV4
  - rename-operation-extended:
      from: V4CalendarPatchItem
      to: PatchCalendarItemV4
  - rename-operation-extended:
      from: SharedMailboxSendEmailV2
      to: SendEmailFromSharedMailboxV2
  - rename-operation-extended:
      from: ContactGetTablesV2
      to: GetContactTablesV2
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
      to: GetCalendarTable
  - rename-operation-extended:
      from: ContactGetTable
      to: GetContactTable
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