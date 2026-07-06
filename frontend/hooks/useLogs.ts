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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { logs, isLoading, fetchLogs };
}
