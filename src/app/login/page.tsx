"use client";

import { useActionState } from "react";
import { loginAction } from "./actions";

export default function LoginPage() {
  const [state, action, pending] = useActionState(loginAction, null);

  return (
    <main className="auth-shell">
      <form action={action}>
        <h1>FamCal</h1>
        {state?.error ? <p className="auth-error">{state.error}</p> : null}
        <label>
          Email
          <input name="email" type="email" required autoComplete="email" />
        </label>
        <label>
          Adgangskode
          <input name="password" type="password" required autoComplete="current-password" />
        </label>
        <button type="submit" disabled={pending}>
          {pending ? "Logger ind…" : "Log ind"}
        </button>
      </form>
    </main>
  );
}
