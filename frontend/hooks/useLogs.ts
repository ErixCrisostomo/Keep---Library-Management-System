"use client";

/**
 * Hook: useLogs
 *
 * Small client-side hook that loads the transaction/audit log for the
 * Super Admin UI. It returns the current `logs` array, a loading flag, and
 * a `fetchLogs` function to refresh the list on demand.
 */
import { useEffect, useState } from "react";
import { TxLog } from "@/lib/types";
import { logService } from "@/services/logService";

export function useLogs() {
  const [logs, setLogs] = useState<TxLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Fetch logs from the server and update local state. Errors will bubble
   * to callers of `fetchLogs` (use try/catch if you want to display them).
   */
  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      setLogs(await logService.list());
    } finally {
      setIsLoading(false);
    }
  };

  // Load logs once on mount. Consumers can call `fetchLogs` to refresh.
  useEffect(() => {
    fetchLogs();
    // Also listen for `audit:refresh` events to refresh logs when actions occur.
    // Use a small delay to allow the background audit worker to persist
    // the newly-enqueued event before we fetch the list (reduces race).
    let timer: number | undefined;
    const handler = () => {
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(() => fetchLogs(), 300);
    };
    window.addEventListener("audit:refresh", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    return () => {
      if (timer) window.clearTimeout(timer);
      window.removeEventListener("audit:refresh", handler);
    };
  }, []);

  return { logs, isLoading, fetchLogs };
}
