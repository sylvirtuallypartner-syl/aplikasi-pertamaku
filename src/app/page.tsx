"use client";

import { useEffect, useState } from "react";
import { CHILD_ORDER, CHILDREN, ChildId, isChildId } from "@/lib/children";
import KidView from "@/components/KidView";
import ParentView from "@/components/ParentView";

type Who = ChildId | "parent";

const WHO_KEY = "kids-tracker-who";

function isWho(v: string | null): v is Who {
  return isChildId(v) || v === "parent";
}

export default function Home() {
  const [who, setWho] = useState<Who | null>(null);
  const [whoLoaded, setWhoLoaded] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(WHO_KEY);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (isWho(saved)) setWho(saved);
    setWhoLoaded(true);
  }, []);

  function choose(next: Who) {
    localStorage.setItem(WHO_KEY, next);
    setWho(next);
  }

  function changeWho() {
    localStorage.removeItem(WHO_KEY);
    setWho(null);
  }

  if (!whoLoaded) return null;

  if (!who) {
    return (
      <div className="picker-screen">
        <div className="picker-blob blob-a" />
        <div className="picker-blob blob-b" />
        <div className="picker-blob blob-c" />
        <div className="picker-content">
          <h1>Kids Tracker</h1>
          <p className="subtitle">Kamu siapa?</p>
          <div className="who-list">
            {CHILD_ORDER.map((id) => {
              const c = CHILDREN[id];
              return (
                <button key={id} className="who-btn" style={{ background: c.color }} onClick={() => choose(id)}>
                  <span className="who-emoji">{c.emoji}</span>
                  {c.name}
                </button>
              );
            })}
            <button className="who-btn parent" onClick={() => choose("parent")}>
              <span className="who-emoji">🔑</span>
              Orang Tua
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="wrap">
      <h1>Kids Tracker</h1>
      {who !== "parent" && (
        <div className="who-bar">
          <span>
            Kamu: <b>{CHILDREN[who].emoji} {CHILDREN[who].name}</b>
          </span>
          <button className="change-btn" onClick={changeWho}>
            Ganti
          </button>
        </div>
      )}

      {who === "parent" ? <ParentView onExit={changeWho} /> : <KidView childId={who} />}
    </div>
  );
}
