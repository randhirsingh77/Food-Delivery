import { useCallback, useEffect, useState } from "react";
import { api } from "./client";
import type { Profile } from "./types";

// Loads the current user's platform profile (role, addresses, driver
// stats) and keeps it in sync after edits.
export function useProfile() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    try {
      setProfile(await api.getProfile());
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load your profile");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return { profile, setProfile, loading, error, refresh };
}
