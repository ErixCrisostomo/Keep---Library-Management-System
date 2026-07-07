"use client";

import { useState, useEffect } from "react";
import { X, Loader2 } from "lucide-react";
import { api, ApiError } from "@/services/api";

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  // 'create_student', 'create_staff', or 'edit'
  mode: "create_student" | "create_staff" | "edit"; 
  // Data if editing (contains namespaced id like "student-123" or "staff-456")
  editData?: {
    id: string;
    name: string;
    login_id: string;
    type: string;
    email?: string | null;
    course?: string | null;
    section?: string | null;
    year_level?: string | null;
    role?: string;
  } | null;
}

export function AccountModal({ isOpen, onClose, onSuccess, mode, editData }: AccountModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    login_id: "",
    password: "",
    role: "librarian", // default for staff creation
    email: "",
    course: "",
    section: "",
    year_level: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Pre-fill form if editing
  useEffect(() => {
    if (isOpen) {
      setError("");
      if (editData && mode === "edit") {
        setFormData({
          name: editData.name,
          login_id: editData.login_id,
          password: "", // Leave blank on edit unless they want to change it
          role: editData.role === "superadmin" ? "superadmin" : "librarian",
          email: editData.email || "",
          course: editData.course || "",
          section: editData.section || "",
          year_level: editData.year_level || "",
        });
      } else {
        // Reset for creation
        setFormData({ name: "", login_id: "", password: "", role: "librarian", email: "", course: "", section: "", year_level: "" });
      }
    }
  }, [isOpen, editData, mode]);

  if (!isOpen) return null;

  const isStudent = mode === "create_student" || (mode === "edit" && editData?.type === "student");
  const isEdit = mode === "edit";
  const title = isEdit ? `Edit Account: ${editData?.name}` : (isStudent ? "Create Student Account" : "Create Staff Account");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      if (isEdit) {
        const isStaff = editData!.id.startsWith("staff-");
        const realId = editData!.id.replace("staff-", "").replace("student-", ""); 
        const path = isStaff ? `/api/staff/${realId}` : `/api/students/${realId}`;
        
        // Only send password if it was filled out
        const payload: any = { 
          name: formData.name, 
          login_id: formData.login_id 
        };
        
        // Only attach password if the admin actually typed a new one
        if (formData.password) payload.password = formData.password;

        // Attach student-specific fields if applicable
        if (!isStaff) {
          if (formData.email) payload.email = formData.email;
          if (formData.course) payload.course = formData.course;
          if (formData.section) payload.section = formData.section;
          if (formData.year_level) payload.year_level = formData.year_level;
        }

        await api.put(path, payload);
      } else {
        const path = isStudent ? "/api/students" : "/api/staff";
        const payload = isStudent 
          ? { name: formData.name, login_id: formData.login_id, password: formData.password, email: formData.email || null, course: formData.course || null, section: formData.section || null, year_level: formData.year_level || null }
          : { name: formData.name, login_id: formData.login_id, password: formData.password, role: formData.role };
        
        await api.post(path, payload);
      }
      
      onSuccess();
      onClose();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("An unexpected error occurred.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="font-semibold">{title}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg">{error}</div>}

          {/* Name */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Full Name *</label>
            <input required value={formData.name} onChange={e => setFormData(s => ({...s, name: e.target.value}))} className="w-full px-3 py-2 text-sm bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/30" />
          </div>

          {/* Login ID */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">{isStudent ? "Student Code (SR-...)" : "Email Address"} *</label>
            <input required value={formData.login_id} onChange={e => setFormData(s => ({...s, login_id: e.target.value}))} className="w-full px-3 py-2 text-sm bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/30" />
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Password {isEdit ? "(leave blank to keep current)" : "*"}</label>
            <input type="password" required={!isEdit} value={formData.password} onChange={e => setFormData(s => ({...s, password: e.target.value}))} className="w-full px-3 py-2 text-sm bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/30" />
          </div>

          {/* Role (Only for Staff Creation) */}
          {!isStudent && !isEdit && (
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Role *</label>
              <select value={formData.role} onChange={e => setFormData(s => ({...s, role: e.target.value}))} className="w-full px-3 py-2 text-sm bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/30">
                <option value="librarian">Librarian</option>
                <option value="superadmin">Super Admin</option>
              </select>
            </div>
          )}

          {/* Student Specific Fields */}
          {isStudent && (
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-muted-foreground mb-1">Email</label>
                <input type="email" value={formData.email} onChange={e => setFormData(s => ({...s, email: e.target.value}))} className="w-full px-3 py-2 text-sm bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/30" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Course</label>
                <input value={formData.course} onChange={e => setFormData(s => ({...s, course: e.target.value}))} className="w-full px-3 py-2 text-sm bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/30" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Year Level</label>
                <input value={formData.year_level} onChange={e => setFormData(s => ({...s, year_level: e.target.value}))} className="w-full px-3 py-2 text-sm bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/30" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Section</label>
                <input value={formData.section} onChange={e => setFormData(s => ({...s, section: e.target.value}))} className="w-full px-3 py-2 text-sm bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/30" />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-border text-muted-foreground hover:bg-muted/50">Cancel</button>
            <button type="submit" disabled={isLoading} className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-2 disabled:opacity-50">
              {isLoading && <Loader2 size={14} className="animate-spin" />}
              {isEdit ? "Save Changes" : "Create Account"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}