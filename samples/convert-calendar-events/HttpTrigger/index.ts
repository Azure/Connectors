import { AzureFunction, Context, HttpRequest } from "@azure/functions"
import { GoogleCalendarConnector, Microsoft365OutlookConnector } from "azure-connectors"
import { CalendarList, RequestEvent } from "azure-connectors/dist/src/googlecalendar/Models";
import { EntityListResponseCalendarEventBackend, CalendarEventBackend } from "azure-connectors/dist/src/office365/Models";

const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {

    // Construct the connector objects we need, using the connection string provided by the Azure Connectors VSCode extension
    const googleCalendarConnector = new GoogleCalendarConnector(process.env["GoogleCalendarConnection"])
    const office365CalendarConnector = new Microsoft365OutlookConnector(process.env["Microsoft365OutlookConnection"])
          
    // Find the ID of the user's google calendar titled "msft"
    const availableGoogleCalendars: CalendarList = await googleCalendarConnector.listCalendars("owner")
    const msftCalendarId: string = availableGoogleCalendars.items.find(x => x.summary === "msft").id

    // Get the list of all outlook calendar events
    const outlookCalendarEvents: EntityListResponseCalendarEventBackend = await office365CalendarConnector.calendarGetItems("Calendar")

    // Add each outlook event to the google calendar
    outlookCalendarEvents.value.forEach(async (outlookEvent: CalendarEventBackend) => {
        // Convert the outlook event data into the google calendar event model
        const googleEvent: RequestEvent = {
            summary: outlookEvent.subject,
            start: outlookEvent.start,
            end: outlookEvent.end
        }
        await googleCalendarConnector.createEvent(googleEvent, msftCalendarId)
    });
};

export default httpTrigger;
