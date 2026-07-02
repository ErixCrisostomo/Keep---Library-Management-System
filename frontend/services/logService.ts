import { api } from "./api";
import { TxLog } from "@/lib/types";

export const logService = {
  list: () => api.get<TxLog[]>("/api/logs"),
};
