export type ParsedIcalEvent = {
  title: string;
  description: string;
  startsAt: Date;
  endsAt: Date;
  allDay: boolean;
  rruleStr: string | null;
};

function unfoldLines(raw: string): string[] {
  return raw
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\n[ \t]/g, "")
    .split("\n");
}

function unescape(s: string): string {
  return s.replace(/\\n/g, "\n").replace(/\\,/g, ",").replace(/\\;/g, ";").replace(/\\\\/g, "\\");
}

function parseDate(value: string, params: string): Date | null {
  // Remove param portion if present in key
  const v = value.trim();

  // All-day: YYYYMMDD
  if (/^\d{8}$/.test(v)) {
    const y = +v.slice(0, 4), mo = +v.slice(4, 6) - 1, d = +v.slice(6, 8);
    return new Date(Date.UTC(y, mo, d));
  }
  // DateTime UTC: YYYYMMDDTHHmmssZ
  if (/^\d{8}T\d{6}Z$/.test(v)) {
    return new Date(
      Date.UTC(+v.slice(0, 4), +v.slice(4, 6) - 1, +v.slice(6, 8),
               +v.slice(9, 11), +v.slice(11, 13), +v.slice(13, 15)),
    );
  }
  // DateTime local (assume UTC): YYYYMMDDTHHmmss
  if (/^\d{8}T\d{6}$/.test(v)) {
    return new Date(
      Date.UTC(+v.slice(0, 4), +v.slice(4, 6) - 1, +v.slice(6, 8),
               +v.slice(9, 11), +v.slice(11, 13), +v.slice(13, 15)),
    );
  }
  // ISO fallback
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

function isAllDay(keyWithParams: string, value: string): boolean {
  return /VALUE=DATE/i.test(keyWithParams) || /^\d{8}$/.test(value.trim());
}

export function parseIcal(content: string): ParsedIcalEvent[] {
  const lines = unfoldLines(content);
  const results: ParsedIcalEvent[] = [];

  let inEvent = false;
  let current: Partial<ParsedIcalEvent & { startAllDay: boolean }> = {};

  for (const line of lines) {
    if (line === "BEGIN:VEVENT") { inEvent = true; current = {}; continue; }
    if (line === "END:VEVENT") {
      inEvent = false;
      if (current.title && current.startsAt) {
        const ev: ParsedIcalEvent = {
          title: current.title,
          description: current.description ?? "",
          startsAt: current.startsAt,
          endsAt: current.endsAt ?? new Date(current.startsAt.getTime() + 3_600_000),
          allDay: current.startAllDay ?? false,
          rruleStr: current.rruleStr ?? null,
        };
        results.push(ev);
      }
      continue;
    }
    if (!inEvent) continue;

    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) continue;
    const keyFull = line.slice(0, colonIdx);
    const value = line.slice(colonIdx + 1);
    const baseKey = keyFull.split(";")[0].toUpperCase();

    switch (baseKey) {
      case "SUMMARY":       current.title = unescape(value); break;
      case "DESCRIPTION":   current.description = unescape(value); break;
      case "DTSTART":
        current.startsAt = parseDate(value, keyFull) ?? undefined;
        current.startAllDay = isAllDay(keyFull, value);
        current.allDay = current.startAllDay;
        break;
      case "DTEND":
        current.endsAt = parseDate(value, keyFull) ?? undefined;
        break;
      case "RRULE":         current.rruleStr = value; break;
    }
  }

  return results;
}

export function parseRRule(
  rrule: string,
): { frequency: "daily" | "weekly" | "monthly" | "yearly"; interval: number; until: Date | null } | null {
  const map: Record<string, "daily" | "weekly" | "monthly" | "yearly"> = {
    DAILY: "daily", WEEKLY: "weekly", MONTHLY: "monthly", YEARLY: "yearly",
  };
  const parts = Object.fromEntries(rrule.split(";").map((p) => p.split("=")));
  const freq = map[parts.FREQ];
  if (!freq) return null;
  const interval = parts.INTERVAL ? parseInt(parts.INTERVAL) || 1 : 1;
  let until: Date | null = null;
  if (parts.UNTIL) {
    until = parseDate(parts.UNTIL, "") ?? null;
  }
  return { frequency: freq, interval, until };
}
