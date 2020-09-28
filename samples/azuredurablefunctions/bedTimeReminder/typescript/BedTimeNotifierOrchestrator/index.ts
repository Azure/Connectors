import * as df from "durable-functions"
import { EarliestEvents, toLocalTime } from "../common"
import * as moment from "moment-timezone"

const orchestrator = df.orchestrator(function* (context) {
    // Test mode... run immediately and only once
    const continuousReminder = context.df.getInput().toString() !== "test"
    // Get next meetings
    const events: EarliestEvents = yield context.df.callActivity("FindEarliestMeetings");
    // Wait to notify until 10 hours before the first meeting of the day
    if (continuousReminder) {
        const notificationTime = toLocalTime(events.earliestEvent.start).subtract(10, 'hour');
        yield context.df.createTimer(notificationTime.toDate());
    }
    // Send notification
    yield context.df.callActivity("NotifyMe", events);
    // Wait until tomorrow
    if (continuousReminder) {
        const nextDay = toLocalTime(events.earliestEvent.start).endOf('day').add(1, 'hour');
        yield context.df.createTimer(nextDay.toDate());
        // Eternal orchestration pattern: https://docs.microsoft.com/azure/azure-functions/durable/durable-functions-eternal-orchestrations?tabs=javascript
        // Restart from the top of this orchestration as a new orchestration execution
        context.df.continueAsNew(undefined);
    }
});

export default orchestrator;
