import { createEventAction } from "@/app/events/actions";

export function EventForm() {
  return (
    <form id="new-event" action={createEventAction} className="card form-stack">
      <h2>Ny aftale</h2>
      <label>Titel<input name="title" required maxLength={120} /></label>
      <label>Beskrivelse<textarea name="description" maxLength={2000} /></label>
      <label>Start<input name="startsAt" type="datetime-local" required /></label>
      <label>Slut<input name="endsAt" type="datetime-local" required /></label>
      <label>Farve<input name="color" type="color" defaultValue="#2563eb" /></label>
      <button type="submit">Gem aftale</button>
    </form>
  );
}
