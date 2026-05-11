type CalendarEvent = {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string;
  color: string;
  responsibleName: string | null;
};

export function CalendarShell({ events }: { events: CalendarEvent[] }) {
  return (
    <section className="calendar-shell">
      <header className="calendar-header">
        <div>
          <p className="eyebrow">Familiekalender</p>
          <h1>Denne uge</h1>
        </div>
        <a className="button" href="#new-event">Ny aftale</a>
      </header>
      <div className="event-list">
        {events.length === 0 ? <p>Ingen aftaler i perioden.</p> : null}
        {events.map((event) => (
          <article className="event-card" key={event.id} style={{ borderColor: event.color }}>
            <strong>{event.title}</strong>
            <span>{new Date(event.startsAt).toLocaleString("da-DK")}</span>
            {event.responsibleName ? <span>{event.responsibleName}</span> : null}
          </article>
        ))}
      </div>
    </section>
  );
}
