import * as moment from "moment-timezone"

export const toLocalTime = function (utcTime: string) {
    return moment.utc(utcTime).tz(process.env.TIME_ZONE);
}