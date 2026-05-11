import { requireUserId } from "@/lib/auth/session";

export default async function HomePage() {
  await requireUserId();

  return (
    <main className="app-shell">
      <h1>FamCal</h1>
      <p>Kalenderen er klar til næste trin.</p>
      <form action="/logout" method="post">
        <button type="submit">Log ud</button>
      </form>
    </main>
  );
}
