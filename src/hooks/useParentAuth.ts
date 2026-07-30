"use client";

import { useCallback, useEffect, useState } from "react";

export function useParentAuth() {
  const [authenticated, setAuthenticated] = useState(false);
  const [checking, setChecking] = useState(true);

  const check = useCallback(async () => {
    try {
      const res = await fetch("/api/parent-auth", { cache: "no-store" });
      const data = await res.json();
      setAuthenticated(!!data.authenticated);
    } catch {
      setAuthenticated(false);
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    // Check for an existing parent session cookie on mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    check();
  }, [check]);

  const login = useCallback(async (pin: string): Promise<string | null> => {
    try {
      const res = await fetch("/api/parent-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) return data.error ?? "PIN salah";
      setAuthenticated(true);
      return null;
    } catch {
      return "Gagal menghubungi server";
    }
  }, []);

  const logout = useCallback(async () => {
    await fetch("/api/parent-auth", { method: "DELETE" }).catch(() => {});
    setAuthenticated(false);
  }, []);

  return { authenticated, checking, login, logout };
}
