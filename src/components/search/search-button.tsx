"use client";

import { useState, useEffect } from "react";
import { SearchModal } from "./search-modal";
import type { Member } from "@/components/calendar/month-calendar";

export function SearchButton({
  members,
  currentUserId,
}: {
  members: Member[];
  currentUserId: string;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <button
        className="btn-ghost search-btn"
        onClick={() => setOpen(true)}
        title="Søg (Ctrl+K)"
      >
        🔍
      </button>
      {open && (
        <SearchModal
          members={members}
          currentUserId={currentUserId}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
