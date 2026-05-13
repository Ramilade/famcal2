"use client";

import { useActionState } from "react";
import { useParams } from "next/navigation";
import { useFormStatus } from "react-dom";
import { joinFamilyAction } from "@/app/family/actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="auth-submit-btn">
      {pending ? "Opretter…" : "Opret konto og tilslut"}
    </button>
  );
}

export default function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const [state, action] = useActionState(joinFamilyAction, null);

  return (
    <div className="auth-shell">
      <form action={action}>
        <input type="hidden" name="token" value={token} />
        <h1>Tilslut familien</h1>
        <p className="auth-subtitle">
          Du er inviteret til FamCal. Opret din konto herunder.
        </p>

        {state?.error && <div className="auth-error">{state.error}</div>}

        <label>
          Dit navn
          <input name="name" required placeholder="Fuldt navn" />
        </label>
        <label>
          Email
          <input name="email" type="email" required placeholder="din@email.dk" />
        </label>
        <label>
          Adgangskode
          <input name="password" type="password" required minLength={6} placeholder="Mindst 6 tegn" />
        </label>
        <SubmitButton />
      </form>
    </div>
  );
}
