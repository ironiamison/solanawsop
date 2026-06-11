"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_PREFIX = "solanawsop_table_notes:";

function storageKey(roomId: string) {
  return `${STORAGE_PREFIX}${roomId}`;
}

export default function TableNotesPanel({ roomId }: { roomId: string }) {
  const [notes, setNotes] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      setNotes(localStorage.getItem(storageKey(roomId)) ?? "");
    } catch {
      setNotes("");
    }
  }, [roomId]);

  const save = useCallback(() => {
    try {
      localStorage.setItem(storageKey(roomId), notes);
      setSaved(true);
      setTimeout(() => setSaved(false), 1800);
    } catch {
      // ignore
    }
  }, [roomId, notes]);

  return (
    <div className="opoker-notes-panel flex h-full flex-col">
      <p className="opoker-notes-title">Player notes</p>
      <p className="opoker-notes-copy">
        Track reads and tendencies for this table. Saved locally on this device.
      </p>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="@handle — aggressive preflop, overfolds river…"
        className="opoker-notes-textarea mt-3 min-h-[8rem] flex-1 resize-none"
      />
      <div className="mt-2 flex items-center justify-between gap-2">
        <button type="button" onClick={save} className="opoker-notes-save">
          {saved ? "Saved" : "Save notes"}
        </button>
        <span className="text-[10px] text-zinc-600">Per-table · local only</span>
      </div>
    </div>
  );
}
