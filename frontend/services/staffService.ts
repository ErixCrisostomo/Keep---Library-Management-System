import { api } from "./api";
import { StaffProfile } from "@/lib/types";

export const staffService = {
  list: () => api.get<StaffProfile[]>("/api/staff"),
};
