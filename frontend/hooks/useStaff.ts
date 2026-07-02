"use client";

import { useEffect, useState } from "react";
import { StaffProfile } from "@/lib/types";
import { staffService } from "@/services/staffService";

export function useStaff() {
  const [staff, setStaff] = useState<StaffProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      try {
        setStaff(await staffService.list());
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  return { staff, isLoading };
}
