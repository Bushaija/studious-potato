import { format as dateFnsFormat } from "date-fns";

export function formatDate(
  date: Date | string | number | undefined,
  opts: Intl.DateTimeFormatOptions = {},
) {
  if (!date) return "";

  try {
    return new Intl.DateTimeFormat("en-US", {
      month: opts.month ?? "long",
      day: opts.day ?? "numeric",
      year: opts.year ?? "numeric",
      ...opts,
    }).format(new Date(date));
  } catch (_err) {
    return "";
  }
}

/**
 * Format a date using date-fns with consistent format across the application
 * @param date - Date string, Date object, or timestamp to format
 * @param formatString - Optional format string (defaults to "MMM dd, yyyy")
 * @returns Formatted date string or empty string if date is invalid
 */
export function formatDateWithFns(
  date: Date | string | number | undefined | null,
  formatString: string = "MMM dd, yyyy"
): string {
  if (!date) return "";

  try {
    return dateFnsFormat(new Date(date), formatString);
  } catch (_err) {
    return "";
  }
}
