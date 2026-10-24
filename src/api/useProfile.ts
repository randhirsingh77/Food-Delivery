import { useCallback, useEffect, useState } from "react";
import { api } from "./client";
import { useStore } from "../store/useStore";
import type { Profile } from "./types";

// The current user's platform profile (role, addresses, driver stats).
// Single source of truth: the Zustand store, so a role switch made on the
// profile screen is instantly reflected in the header account panel and
// every dashboard — no stale local copies.
export function useProfile() {
  const profile = useStore((s) => s.authProfile);
  const setProfile = useStore((s) => s.setAuthProfile);
  const [loading, setLoading] = useState(!profile);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    try {
      const p = await api.getProfile();
      setProfile(p);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load your profile");
    } finally {
      setLoading(false);
    }
  }, [setProfile]);

  useEffect(() => { refresh(); }, [refresh]);

  return { profile, setProfile, loading: loading && !profile, error, refresh };
}

export type { Profile };
