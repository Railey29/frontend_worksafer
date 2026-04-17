// ============================================================
// EEI SHE Incident Analysis API — Service Layer
// Base URL: https://worksafer-backend-production.up.railway.app/api
// ============================================================

import type {
  SHEReport,
  SHEReportsResponse,
  SHEDepartments,
  SHEComplianceSummary,
  SHEComplianceAction,
  SHEComplianceActionsResponse,
} from "./she-api-types";
import { getStoredUser } from "../../utils/user";

const SHE_API_BASE = import.meta.env.VITE_SHE_API_BASE_URL ?? "https://worksafer-backend-production.up.railway.app/api";

// ---- Helper to get user info from stored user ----
function getUserInfo(): { name: string; email: string; department: string } {
  const user = getStoredUser();

  if (user) {
    // Try multiple possible property names
    const userName =
      user.name ||
      user.full_name ||
      user.displayName ||
      user.email?.split("@")[0] ||
      "Unknown";
    const userEmail = user.email || "";
    const userDept = user.department || user.dept || "Unknown";

    return {
      name: userName,
      email: userEmail,
      department: userDept,
    };
  }

  return {
    name: "Unknown User",
    email: "unknown@company.com",
    department: "Unknown",
  };
}

// ---- POST /api/analyze ----
export interface AnalyzeIncidentParams {
  file: File;
  department?: string;
  description?: string;
  location?: string;
  incident_date?: string;
  incident_time?: string;
}

export async function analyzeIncidentImage(
  params: AnalyzeIncidentParams,
): Promise<SHEReport> {
  const formData = new FormData();
  formData.append("file", params.file);
  formData.append("department", params.department || "field");
  if (params.description) formData.append("description", params.description);
  if (params.location) formData.append("location", params.location);
  if (params.incident_date)
    formData.append("incident_date", params.incident_date);
  if (params.incident_time)
    formData.append("incident_time", params.incident_time);

  // ============================================================
  // ADD CURRENT USER INFO TO FORMDATA
  // ============================================================
  const userInfo = getUserInfo();
  formData.append("created_by_name", userInfo.name);
  formData.append("created_by_email", userInfo.email);
  formData.append("created_by_department", userInfo.department);

  const res = await fetch(`${SHE_API_BASE}/analyze`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `Analysis failed (${res.status})`);
  }

  return res.json();
}

// ---- GET /api/reports ----
export async function fetchReports(filters?: {
  department?: string;
  risk_level?: string;
}): Promise<SHEReportsResponse> {
  const params = new URLSearchParams();
  if (filters?.department) params.set("department", filters.department);
  if (filters?.risk_level) params.set("risk_level", filters.risk_level);

  const qs = params.toString();
  const url = `${SHE_API_BASE}/reports${qs ? `?${qs}` : ""}`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch reports (${res.status})`);
  }

  return res.json();
}

// ---- GET /api/reports/{id} ----
export async function fetchReportById(id: string): Promise<SHEReport> {
  const res = await fetch(`${SHE_API_BASE}/reports/${id}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `Report not found (${res.status})`);
  }
  return res.json();
}

// ---- PATCH /api/reports/{id}/status ----
export interface UpdateReportStatusParams {
  status:
    | "submitted"
    | "under_review"
    | "action_required"
    | "in_progress"
    | "closed";
  notes?: string;
  closed_note?: string;
}

export async function updateReportStatus(
  id: string,
  params: UpdateReportStatusParams,
): Promise<SHEReport> {
  const token = localStorage.getItem("token");
  const userStr = localStorage.getItem("user");

  // Get user info for audit trail
  let userName = "anonymous";
  let userDept = "";
  try {
    if (userStr) {
      const user = JSON.parse(userStr);
      userName = user.name || user.full_name || user.email || "anonymous";
      userDept = user.department || "";
    }
  } catch {
    // Continue with defaults
  }

  // Build request body - only include non-empty fields
  const body: Record<string, any> = {
    status: params.status,
    updated_by: userName,
  };

  body.department = userDept || "Safety Department";

  if (params.notes && params.notes.trim()) {
    body.notes = params.notes;
  }

  if (params.closed_note && params.closed_note.trim()) {
    body.closed_note = params.closed_note;
  }

  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const requestBody = JSON.stringify(body);
  console.debug(`Updating report status:`, {
    id,
    url: `${SHE_API_BASE}/reports/${id}/status`,
    body: requestBody,
  });
  console.log("Sending department:", userDept);
  console.log("Full body:", body);

  const res = await fetch(`${SHE_API_BASE}/reports/${id}/status`, {
    method: "PATCH",
    headers,
    body: requestBody,
  });

  if (!res.ok) {
    let errorMessage = res.statusText;
    try {
      const errData = await res.json();
      console.error("Backend error response:", errData);

      if (errData.detail) {
        if (typeof errData.detail === "string") {
          errorMessage = errData.detail;
        } else if (Array.isArray(errData.detail) && errData.detail[0]?.msg) {
          errorMessage = errData.detail[0].msg;
        } else if (typeof errData.detail === "object") {
          if (errData.detail.message) {
            errorMessage = errData.detail.message;
          } else if (errData.detail.error) {
            errorMessage = errData.detail.error;
          } else {
            errorMessage = JSON.stringify(errData.detail);
          }
        }
      } else if (errData.message) {
        errorMessage = errData.message;
      } else if (errData.error) {
        errorMessage = errData.error;
      }
    } catch (parseError) {
      console.error("Could not parse error response");
      try {
        const text = await res.text();
        if (text) {
          errorMessage = text;
        }
      } catch {
        // Continue with statusText
      }
    }

    const fullError = `Status update failed (${res.status}): ${errorMessage}`;
    console.error("Full error:", fullError);
    throw new Error(fullError);
  }

  return res.json();
}

// ---- GET /api/reports/archived ----
export async function fetchArchivedReports(filters?: {
  department?: string;
}): Promise<SHEReportsResponse> {
  const params = new URLSearchParams();
  if (filters?.department) params.set("department", filters.department);

  const qs = params.toString();
  const url = `${SHE_API_BASE}/reports/archived${qs ? `?${qs}` : ""}`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch archived reports (${res.status})`);
  }
  return res.json();
}

// ---- POST /api/reports/{id}/restore ----
export async function restoreReport(
  id: string,
): Promise<{ message: string; id: string }> {
  const res = await fetch(`${SHE_API_BASE}/reports/${id}/restore`, {
    method: "POST",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `Restore failed (${res.status})`);
  }
  return res.json();
}

// ---- DELETE /api/reports/{id} ----
export async function deleteReport(
  id: string,
): Promise<{ message: string; id: string }> {
  const res = await fetch(`${SHE_API_BASE}/reports/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `Delete failed (${res.status})`);
  }
  return res.json();
}

// ---- GET /api/departments ----
export async function fetchDepartments(): Promise<SHEDepartments> {
  const res = await fetch(`${SHE_API_BASE}/departments`);
  if (!res.ok) {
    throw new Error(`Failed to fetch departments (${res.status})`);
  }
  return res.json();
}

// ---- GET /api/compliance/summary ----
export async function fetchComplianceSummary(
  department?: string,
): Promise<SHEComplianceSummary> {
  const params = new URLSearchParams();
  if (department) params.set("department", department);
  const qs = params.toString();
  const url = `${SHE_API_BASE}/compliance/summary${qs ? `?${qs}` : ""}`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch compliance summary (${res.status})`);
  }
  return res.json();
}

// ---- GET /api/compliance/actions ----
export async function fetchComplianceActions(filters?: {
  department?: string;
  status?: string;
}): Promise<SHEComplianceActionsResponse> {
  const params = new URLSearchParams();
  if (filters?.department) params.set("department", filters.department);
  if (filters?.status) params.set("status", filters.status);
  const qs = params.toString();
  const url = `${SHE_API_BASE}/compliance/actions${qs ? `?${qs}` : ""}`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch compliance actions (${res.status})`);
  }
  return res.json();
}

// ---- POST /api/compliance/actions ----
export async function submitComplianceAction(data: {
  department: string;
  action_text: string;
  submitted_by: string;
  category?: string;
  file?: File;
}): Promise<SHEComplianceAction> {
  const formData = new FormData();
  formData.append("department", data.department);
  formData.append("action_text", data.action_text);
  formData.append("submitted_by", data.submitted_by);
  if (data.category) formData.append("category", data.category);
  if (data.file) formData.append("proof_image", data.file);

  const res = await fetch(`${SHE_API_BASE}/compliance/actions`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail?.message || `Submit failed (${res.status})`);
  }
  return res.json();
}

// ---- PUT /api/compliance/actions/{id}/review ----
export async function reviewComplianceAction(
  actionId: string,
  data: { reviewed_by: string; review_notes?: string },
): Promise<SHEComplianceAction> {
  const res = await fetch(
    `${SHE_API_BASE}/compliance/actions/${actionId}/review`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    },
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail?.message || `Review failed (${res.status})`);
  }
  return res.json();
}

// ---- PUT /api/compliance/actions/{id}/approve ----
export async function approveComplianceAction(
  actionId: string,
  data: { approved_by: string },
): Promise<SHEComplianceAction> {
  const res = await fetch(
    `${SHE_API_BASE}/compliance/actions/${actionId}/approve`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    },
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail?.message || `Approve failed (${res.status})`);
  }
  return res.json();
}
