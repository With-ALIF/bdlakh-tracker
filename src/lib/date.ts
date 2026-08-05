import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

export const BD_TZ = "Asia/Dhaka";

/** Current time in Bangladesh timezone */
export function now() {
  return dayjs().tz(BD_TZ);
}

/** Today's date string (YYYY-MM-DD) in Bangladesh timezone */
export function today() {
  return now().format("YYYY-MM-DD");
}
