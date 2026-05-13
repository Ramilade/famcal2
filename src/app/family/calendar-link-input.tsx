"use client";

export function CalendarLinkInput({ url }: { url: string }) {
  return (
    <input
      readOnly
      className="invite-link-input"
      value={url}
      onClick={(e) => (e.target as HTMLInputElement).select()}
    />
  );
}
