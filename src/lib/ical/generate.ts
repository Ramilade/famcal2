const FREQ_MAP = {
  daily: "DAILY",
  weekly: "WEEKLY",
  monthly: "MONTHLY",
  yearly: "YEARLY",
} as const;

function foldLine(line: string): string {
  const bytes = new TextEncoder().encode(line);
  if (bytes.length <= 75) return line;
  const chunks: string[] = [];
  let i = 0;
  let first = true;
  while (i < line.length) {
    const limit = first ? 75 : 74;
    first = false;
    let end = i + limit;
    if (end >= line.length) { chunks.push(line.slice(i)); break; }
    chunks.push(line.slice(i, end));
    i = end;
  }
  return chunks.join("\r\n ");
}

function icalDate(d: Date, allDay = false): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const date = `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`;
  if (allDay) return date;
  return `${date}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}

function icalEscape(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

type IcalEvent = {
  id: string;
  title: string;
  description: string;
  startsAt: Date;
  endsAt: Date;
  allDay: boolean;
  recurrenceRule: {
    frequency: "daily" | "weekly" | "monthly" | "yearly";
    interval: number;
    until: Date | null;
  } | null;
};

export function generateIcal(familyName: string, events: IcalEvent[]): string {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:-//FamCal//FamCal//DA`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    foldLine(`X-WR-CALNAME:${icalEscape(familyName)}`),
    "X-WR-TIMEZONE:Europe/Copenhagen",
  ];

  for (const ev of events) {
    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${ev.id}@famcal`);
    if (ev.allDay) {
      lines.push(`DTSTART;VALUE=DATE:${icalDate(ev.startsAt, true)}`);
      lines.push(`DTEND;VALUE=DATE:${icalDate(ev.endsAt, true)}`);
    } else {
      lines.push(`DTSTART:${icalDate(ev.startsAt)}`);
      lines.push(`DTEND:${icalDate(ev.endsAt)}`);
    }
    lines.push(foldLine(`SUMMARY:${icalEscape(ev.title)}`));
    if (ev.description) lines.push(foldLine(`DESCRIPTION:${icalEscape(ev.description)}`));
    if (ev.recurrenceRule) {
      const r = ev.recurrenceRule;
      let rrule = `RRULE:FREQ=${FREQ_MAP[r.frequency]};INTERVAL=${r.interval}`;
      if (r.until) rrule += `;UNTIL=${icalDate(r.until)}`;
      lines.push(rrule);
    }
    lines.push(`DTSTAMP:${icalDate(new Date())}`);
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n") + "\r\n";
}
