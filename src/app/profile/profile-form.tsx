"use client";

import { useActionState } from "react";
import { updateProfileAction, updatePasswordAction } from "./actions";

export function ProfileForm({
  name,
  email,
}: {
  name: string;
  email: string;
}) {
  const [profileState, profileAction, profilePending] = useActionState(updateProfileAction, null);
  const [passwordState, passwordAction, passwordPending] = useActionState(updatePasswordAction, null);

  return (
    <div className="profile-sections">
      <section className="profile-section">
        <h3 className="profile-section-title">Personlige oplysninger</h3>
        <form action={profileAction} className="profile-form">
          {profileState?.error && <p className="form-feedback form-feedback--error">{profileState.error}</p>}
          {profileState?.success && <p className="form-feedback form-feedback--success">{profileState.success}</p>}

          <label className="field">
            <span>Navn</span>
            <input name="name" required maxLength={100} defaultValue={name} />
          </label>

          <label className="field">
            <span>Email</span>
            <input name="email" type="email" required defaultValue={email} />
          </label>

          <label className="field">
            <span>Nuværende kodeord</span>
            <input
              name="currentPassword"
              type="password"
              placeholder="Kræves ved ændringer"
              autoComplete="current-password"
            />
          </label>

          <button
            type="submit"
            className="btn-save"
            style={{ alignSelf: "flex-start" }}
            disabled={profilePending}
          >
            {profilePending ? "Gemmer…" : "Gem oplysninger"}
          </button>
        </form>
      </section>

      <section className="profile-section">
        <h3 className="profile-section-title">Skift kodeord</h3>
        <form action={passwordAction} className="profile-form">
          {passwordState?.error && <p className="form-feedback form-feedback--error">{passwordState.error}</p>}
          {passwordState?.success && <p className="form-feedback form-feedback--success">{passwordState.success}</p>}

          <label className="field">
            <span>Nuværende kodeord</span>
            <input
              name="currentPassword"
              type="password"
              required
              autoComplete="current-password"
            />
          </label>

          <label className="field">
            <span>Nyt kodeord</span>
            <input
              name="newPassword"
              type="password"
              required
              minLength={6}
              placeholder="Mindst 6 tegn"
              autoComplete="new-password"
            />
          </label>

          <label className="field">
            <span>Gentag nyt kodeord</span>
            <input
              name="confirmPassword"
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
            />
          </label>

          <button
            type="submit"
            className="btn-save"
            style={{ alignSelf: "flex-start" }}
            disabled={passwordPending}
          >
            {passwordPending ? "Gemmer…" : "Skift kodeord"}
          </button>
        </form>
      </section>
    </div>
  );
}
