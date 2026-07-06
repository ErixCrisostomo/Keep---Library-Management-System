"use client";

import { useEffect } from "react";
import { useLoanStore } from "@/stores/loanStore";

export function useLoans() {
  const {
    loans, isLoading, error, fetchLoans,
    checkout, directReturn, approveBorrow, rejectBorrow, approveReturn, rejectReturn,
    requestBorrow, requestReturn,
  } = useLoanStore();

  useEffect(() => {
    fetchLoans();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    loans, isLoading, error, fetchLoans,
    checkout, directReturn, approveBorrow, rejectBorrow, approveReturn, rejectReturn,
    requestBorrow, requestReturn,
  };
}
