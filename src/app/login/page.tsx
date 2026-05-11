"use client";

import { useActionState } from "react";
import { loginAction } from "./actions";

export default function LoginPage() {
  const [state, action, pending] = useActionState(loginAction, null);

  return (
    <main className="auth-shell">
      <form action={action} className="card form-stack">
        <h1>Log ind</h1>
        {state?.error ? <p style={{ color: "red" }}>{state.error}</p> : null}
        <label>
          Email
          <input name="email" type="email" required autoComplete="email" />
        </label>
        <label>
          Adgangskode
          <input name="password" type="password" required autoComplete="current-password" />
        </label>
        <button type="submit" disabled={pending}>Log ind</button>
      </form>
    </main>
  );
}
