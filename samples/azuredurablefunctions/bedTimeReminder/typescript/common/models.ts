import { ResponseType1 } from "@azure/connectors-office365outlook/esm/models"

export interface EarliestEvents {
    earliestEvent: Event
    earliestAcceptedEvent: Event
}

export interface Event {
    subject: string,
    responseType: ResponseType1,
    body: string,
    start: string
}