"use client";

import { useEffect, useState } from "react";
import { TxLog } from "@/lib/types";
import { logService } from "@/services/logService";

export function useLogs() {
  const [logs, setLogs] = useState<TxLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      setLogs(await logService.list());
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { logs, isLoading, fetchLogs };
}
