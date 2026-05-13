"use client";

import { useActionState } from "react";
import { addMemberAction } from "./actions";

export function AddMemberForm({ familyId }: { familyId: string }) {
  const [state, action, pending] = useActionState(addMemberAction, null);

  return (
    <form action={action} className="add-member-form">
      <input type="hidden" name="familyId" value={familyId} />

      {state?.error && <p className="form-feedback form-feedback--error">{state.error}</p>}
      {state?.success && <p className="form-feedback form-feedback--success">{state.success}</p>}

      <div className="field-row">
        <label className="field">
          <span>Navn</span>
          <input name="name" required maxLength={100} placeholder="Fornavn Efternavn" />
        </label>
        <label className="field">
          <span>Email</span>
          <input name="email" type="email" required placeholder="email@eksempel.dk" />
        </label>
      </div>

      <label className="field">
        <span>Adgangskode</span>
        <input
          name="password"
          type="password"
          required
          minLength={6}
          placeholder="Mindst 6 tegn"
        />
      </label>

      <button type="submit" className="btn-save" style={{ alignSelf: "flex-start" }} disabled={pending}>
        {pending ? "Tilføjer…" : "Tilføj medlem"}
      </button>
    </form>
  );
}
