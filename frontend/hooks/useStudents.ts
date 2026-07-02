"use client";

import { useEffect, useState } from "react";
import { StudentProfile } from "@/lib/types";
import { studentService } from "@/services/studentService";

export function useStudents() {
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      try {
        setStudents(await studentService.list());
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  return { students, isLoading };
}
