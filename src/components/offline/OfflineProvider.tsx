"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  isOnline,
  startAutoSync,
  syncOfflineQueue,
  queueDepth,
  offlineTutorMessage,
} from "@/lib/offline";

interface OfflineContextValue {
  online: boolean;
  pendingMutations: number;
  syncNow: () => Promise<void>;
  tutorBlockedMessage: string;
}

const OfflineContext = createContext<OfflineContextValue | null>(null);

export function OfflineProvider({ children }: { children: React.ReactNode }) {
  const [online, setOnline] = useState(true);
  const [pendingMutations, setPending] = useState(0);

  const refreshDepth = useCallback(async () => {
    try {
      setPending(await queueDepth());
    } catch {
      setPending(0);
    }
  }, []);

  const syncNow = useCallback(async () => {
    await syncOfflineQueue();
    await refreshDepth();
  }, [refreshDepth]);

  useEffect(() => {
    setOnline(isOnline());
    const onOnline = () => {
      setOnline(true);
      void syncNow();
    };
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    const stop = startAutoSync();
    void refreshDepth();
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      stop();
    };
  }, [syncNow, refreshDepth]);

  const value = useMemo(
    () => ({
      online,
      pendingMutations,
      syncNow,
      tutorBlockedMessage: offlineTutorMessage(),
    }),
    [online, pendingMutations, syncNow]
  );

  return (
    <OfflineContext.Provider value={value}>{children}</OfflineContext.Provider>
  );
}

export function useOffline() {
  const ctx = useContext(OfflineContext);
  if (!ctx) {
    return {
      online: true,
      pendingMutations: 0,
      syncNow: async () => undefined,
      tutorBlockedMessage: offlineTutorMessage(),
    };
  }
  return ctx;
}
