import { AzureFunction, Context } from "@azure/functions"
import { createOffice365OutlookConnector } from "@azure/office365outlook-connector"
import * as moment from "moment-timezone"
import { EarliestEvents } from "../common"

const activityFunction: AzureFunction = async function (context: Context): Promise<EarliestEvents> {
    validateEnvironment("OUTLOOK_CONNECTION");
    validateEnvironment("TIME_ZONE");
    const outlook = await createOffice365OutlookConnector(process.env.OUTLOOK_CONNECTION);
    // Find the right calendar
    const calendarResponse = await outlook.calendarGetTablesV2();
    const calendar = calendarResponse.value.filter((tableElement) => {
        return tableElement.name == "Calendar"
    })[0];
    // Get events from calendar
    const timezone = process.env.TIME_ZONE
    const tomorrow = moment().tz(timezone).add(1, 'day');
    const startTime = tomorrow.startOf('day').utc().format();
    const endTime = tomorrow.endOf('day').utc().format();
    context.log(`Finding events from ${tomorrow.startOf('day')} (${startTime} UTC) to ${tomorrow.endOf('day')} (${endTime} UTC)`);
    const eventResponse = await outlook.calendarsTableData.getEventsCalendarViewV3(calendar.id, startTime, endTime);
    const events = eventResponse.value
        .filter((event) => {
            const shouldNotAttend = event.responseType === 'declined' 
            return !(event.isAllDay || shouldNotAttend)
        })
        .map((event) => {
            return {
                subject: event.subject,
                responseType: event.responseType,
                body: event.body,
                start: event.start
            }
        });
    // Find earliest event
    const earliestEvent = events.sort((eventA, eventB) => {
        return moment(eventA.start).unix() - moment(eventB.start).unix()
    })[0];
    // Find earliest accepted event
    const earliestAcceptedEvent = events
        .filter((event) => {
            return event.responseType === 'organizer' || event.responseType === 'accepted'
        })
        .sort((eventA, eventB) => {
            return moment(eventA.start).unix() - moment(eventB.start).unix()
        })[0];

    const earliestEvents: EarliestEvents = {
        earliestEvent,
        earliestAcceptedEvent
    }
    context.log(`Events found: ${JSON.stringify(earliestEvent)}`)
    return earliestEvents;
};

const validateEnvironment = function (variableName) {
    if (!process.env[variableName]) {
        throw new Error(`The environment variable '${variableName}' is missing or empty. Add to local.settings.json or App Settings.`);
    }
}

export default activityFunction;
