import { api } from "./api";
import { StudentProfile } from "@/lib/types";

export const studentService = {
  list: () => api.get<StudentProfile[]>("/api/students"),
};
