import { AzureFunction, Context, HttpRequest } from "@azure/functions"
import { GoogleCalendarConnector, Microsoft365OutlookConnector } from "azure-connectors"
import { CalendarList, RequestEvent } from "azure-connectors/dist/src/googlecalendar/Models";
import { CalendarEventBackend, EntityListResponseCalendarEventBackend } from "azure-connectors/dist/src/office365/Models";

// This example shows how to copy calendar events from gmail to outlook, 
// using the generated types of the SDK to convert gmail event models into outlook event models.
const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {

    // The caller must provide "start" and "end" values to select the date ranges of events to sync.
    // Dates are in ISO 8601 format, e.g. 2020-07-23 or 2020-07-23T00:00:00+00:00
    const startRange: string = req.query["start"]
    const endRange: string = req.query["end"]
    if (startRange && endRange) {
        context.res = {
            status: 200,
            body: "Successfully converted events"
        }
    } else {
        context.res = {
            status: 400,
            body: "Please provide values for the start and end date range"
        }
        return
    }

    // Construct the connector objects we need, using the connection string provided by the Azure Connectors VSCode extension
    const googleCalendarConnector = new GoogleCalendarConnector(process.env["GoogleCalendarConnection"])
    const outlookCalendarConnector = new Microsoft365OutlookConnector(process.env["Microsoft365OutlookConnection"])
          
    // Find the ID of the user's google calendar titled "msft"
    const availableGoogleCalendars: CalendarList = await googleCalendarConnector.listCalendars("owner")
    const msftCalendarId: string = availableGoogleCalendars.items.find(x => x.summary === "msft").id

    // Get the list of all outlook calendar events
    const outlookCalendarEvents: EntityListResponseCalendarEventBackend = await outlookCalendarConnector.calendarGetItems("Calendar")

    // Add each outlook event to the google calendar
    outlookCalendarEvents.value.forEach(async (outlookEvent: CalendarEventBackend) => {
        if (eventIsWithinDateRange(outlookEvent, startRange, endRange)) {
            // Convert the outlook event data into the google calendar event model
            const googleEvent: RequestEvent = {
                summary: outlookEvent.subject,
                start: outlookEvent.start,
                end: outlookEvent.end
            }
            await googleCalendarConnector.createEvent(googleEvent, msftCalendarId)
        }
    });
};

const eventIsWithinDateRange = function (event: CalendarEventBackend, startRange: string, endRange: string): boolean {
    const isAfterStartRange: boolean = new Date(event.start) > new Date(startRange)
    const isBeforeEndRange: boolean = new Date(event.end) < new Date(endRange)
    return isAfterStartRange && isBeforeEndRange
}

export default httpTrigger;
