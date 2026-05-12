import { useEffect, useState } from "react";
import type { MeshConfig, YRoom } from "@baditaflorin/mesh-common";
import * as Y from "yjs";

type Props = { room: YRoom | null; config: MeshConfig };

type Item = {
  id: string;
  text: string;
  claimedBy: string;
  ts: number;
};

const NAME_KEY = (prefix: string) => `${prefix}:displayName`;

export function Feature({ room, config }: Props) {
  const [name, setName] = useState(
    () => localStorage.getItem(NAME_KEY(config.storagePrefix)) ?? "",
  );
  const [draft, setDraft] = useState("");
  const [, rerender] = useState(0);

  useEffect(() => {
    if (name) localStorage.setItem(NAME_KEY(config.storagePrefix), name);
  }, [name, config.storagePrefix]);

  useEffect(() => {
    if (!room) return;
    const items = room.doc.getArray<Item>("items");
    const onChange = () => rerender((n) => n + 1);
    items.observe(onChange);
    return () => items.unobserve(onChange);
  }, [room]);

  if (!room) {
    return (
      <div className="pot-screen">
        <h1>potluck</h1>
        <p className="pot-status">Connecting…</p>
      </div>
    );
  }

  const items = room.doc.getArray<Item>("items");
  const myName = name.trim() || `peer-${room.peerId.slice(0, 4)}`;

  const allItems = items.toArray();
  const dupes = new Map<string, number>();
  allItems.forEach((i) => {
    const k = i.text.toLowerCase().trim();
    dupes.set(k, (dupes.get(k) ?? 0) + 1);
  });

  const addItem = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    items.push([
      {
        id: crypto.randomUUID(),
        text: trimmed,
        claimedBy: myName,
        ts: Date.now(),
      },
    ]);
    setDraft("");
  };

  const removeItem = (id: string) => {
    const idx = items.toArray().findIndex((i) => i.id === id);
    if (idx >= 0) items.delete(idx, 1);
  };

  return (
    <div className="pot-screen">
      <header className="pot-header">
        <h1>potluck</h1>
        <input
          className="pot-name"
          placeholder="your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={24}
        />
        <p className="pot-status">
          {room.peerCount + 1} here · {allItems.length} item{allItems.length === 1 ? "" : "s"}
        </p>
      </header>

      <form
        className="pot-add"
        onSubmit={(e) => {
          e.preventDefault();
          addItem();
        }}
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="I'll bring…"
          maxLength={80}
        />
        <button type="submit">add</button>
      </form>

      <ul className="pot-list">
        {allItems.map((it) => {
          const dupeCount = dupes.get(it.text.toLowerCase().trim()) ?? 1;
          const mine = it.claimedBy === myName;
          return (
            <li key={it.id} className={`pot-item ${dupeCount > 1 ? "is-dupe" : ""}`}>
              <span className="pot-item-text">{it.text}</span>
              <span className="pot-item-by">{it.claimedBy}</span>
              {dupeCount > 1 && (
                <span className="pot-item-warn" title={`${dupeCount} people bringing this`}>
                  ×{dupeCount}
                </span>
              )}
              {mine && (
                <button type="button" className="pot-item-rm" onClick={() => removeItem(it.id)}>
                  ×
                </button>
              )}
            </li>
          );
        })}
        {allItems.length === 0 && (
          <li className="pot-empty">nothing yet — what are you bringing?</li>
        )}
      </ul>
    </div>
  );
}

// keep Y import side-effect free
void Y;
