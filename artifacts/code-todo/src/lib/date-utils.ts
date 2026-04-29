import { format, isToday as isDateToday, parseISO } from "date-fns";

export function formatDate(dateStr: string) {
  return format(parseISO(dateStr), "MMM d, yyyy");
}

export function isToday(dateStr: string) {
  return isDateToday(parseISO(dateStr));
}
