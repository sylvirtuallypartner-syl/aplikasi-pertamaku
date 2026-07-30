"use client";

import { useCallback, useEffect, useState } from "react";
import { EntryRow } from "@/lib/recap";
import { addDays, mondayOf, todayStr } from "@/lib/date";

const POLL_MS = 15000;

export function useWeekEntries(childId: string) {
  const [today, setToday] = useState(() => todayStr());
  const [rows, setRows] = useState<EntryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const monday = mondayOf(today);
  const sunday = addDays(monday, 6);

  const fetchRows = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/entries?childId=${childId}&start=${monday}&end=${sunday}`,
        { cache: "no-store" }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Gagal memuat data");
      setRows(data.rows ?? []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat data");
    } finally {
      setLoading(false);
    }
  }, [childId, monday, sunday]);

  useEffect(() => {
    // Fetch on mount, then poll so other devices' changes show up here too.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    fetchRows();
    const interval = setInterval(() => {
      setToday(todayStr());
      fetchRows();
    }, POLL_MS);
    const onFocus = () => {
      setToday(todayStr());
      fetchRows();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [fetchRows]);

  return { today, monday, sunday, rows, setRows, loading, error, refetch: fetchRows };
}
