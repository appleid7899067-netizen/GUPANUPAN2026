/** Puter auth provider — real sign-in surface for GuPanu. */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  ensurePuter,
  puterGetUser,
  puterIsSignedIn,
  puterSignIn,
  puterSignOut,
  type PuterUser,
} from "@/lib/puter";

type PuterAuthState = {
  ready: boolean;
  signedIn: boolean;
  user: PuterUser | null;
  loading: boolean;
  error: string | null;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
};

const PuterAuthContext = createContext<PuterAuthState | null>(null);

export function PuterAuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [user, setUser] = useState<PuterUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      await ensurePuter();
      const ok = await puterIsSignedIn();
      setSignedIn(ok);
      setUser(ok ? await puterGetUser() : null);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setSignedIn(false);
      setUser(null);
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const signIn = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await puterSignIn();
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [refresh]);

  const signOut = useCallback(async () => {
    setLoading(true);
    try {
      await puterSignOut();
      setSignedIn(false);
      setUser(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  const value = useMemo(
    () => ({ ready, signedIn, user, loading, error, signIn, signOut, refresh }),
    [ready, signedIn, user, loading, error, signIn, signOut, refresh],
  );

  return <PuterAuthContext.Provider value={value}>{children}</PuterAuthContext.Provider>;
}

export function usePuterAuth(): PuterAuthState {
  const ctx = useContext(PuterAuthContext);
  if (!ctx) {
    throw new Error("usePuterAuth must be used within PuterAuthProvider");
  }
  return ctx;
}
