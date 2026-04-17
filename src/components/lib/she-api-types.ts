// ============================================================
// EEI SHE Incident Analysis API — TypeScript Types
// Base URL: https://worksafer-backend-production.up.railway.app/api
// ============================================================

// ---- Created By (who filed the report) ----
export interface SHECreatedBy {
  full_name: string;
  department: string;
  email: string;
}

// ---- Report Header ----
export interface SHEReportHeader {
  company: string;
  department_name: string;
  report_title: string;
  report_date: string;
  report_time: string;
  analyzed_department: string;
  hirac_basis?: string;
  checklist_basis?: string;
  legal_basis?: string;
}

// ---- Summary ----
export interface SHERiskBreakdown {
  ppe_risk: RiskLevel;
  scene_risk: RiskLevel;
  behavior_risk: RiskLevel;
}

export interface SHEReportSummary {
  overall_risk_level: RiskLevel;
  overall_risk_label?: string;
  hirac_classification?: string;
  recommended_timeline?: string;
  scene_description: string;
  worker_count: number;
  total_findings: number;
  ppe_violations: number;
  environmental_hazards: number;
  unsafe_behaviors: number;
  risk_breakdown?: SHERiskBreakdown;
}

// ---- PPE Status ----
export interface PPEStatus {
  hardhat: number;
  gloves: number;
  safety_vest: number;
  safety_harness: number;
  safety_boots: number;
  no_safety_gear: number;
}

export interface PPEHazard {
  hazard: string;
  missing_ppe: string;
  severity: RiskLevel;
  hirac_ref?: string;
  risk_level?: RiskLevel;
}

export interface ChecklistFlag {
  checklist_item: string;
  category_key: string;
  severity: RiskLevel;
  note: string;
}

export interface SHEPPECompliance {
  present_ppe: string[];
  missing_ppe: string[];
  ppe_status: PPEStatus;
  ppe_hazards: PPEHazard[];
  checklist_flags?: ChecklistFlag[];
}

// ---- Environmental Hazard ----
export interface SHEEnvironmentalHazard {
  hazard_type: string;
  description: string;
  severity: RiskLevel;
  location_in_scene: string;
  recommendation: string;
  hirac_classification?: string;
}

// ---- Unsafe Behavior ----
export interface SHEUnsafeBehavior {
  behavior: string;
  description: string;
  severity: RiskLevel;
  affected_workers: string;
  potential_consequence: string;
  recommendation: string;
  hirac_classification?: string;
}

// ---- Corrective Action ----
export interface SHECorrectiveAction {
  category:
    | "PPE Compliance"
    | "Environmental Hazard"
    | "Unsafe Behavior"
    | "AI Assessment Recommendation";
  action: string;
  priority: RiskLevel;
  hirac_ref?: string;
  checklist_ref?: string;
  legal_basis?: string;
  supporting_laws?: string[];
  compliance_check?: string;
  penalty_basis?: string;
}

// ---- Risk Assessment ----
export interface SHERiskAssessment {
  overall_risk: RiskLevel;
  risk_label?: string;
  hirac_classification?: string;
  immediate_action_required: boolean;
  stop_work_recommended: boolean;
}

// ---- Incident Details ----
export interface SHEIncidentDetails {
  description: string;
  location: string;
  incident_date: string;
  incident_time: string;
}

// ---- AI Classification ----
export interface SHEAIClassification {
  department: string;
  confidence: number;
  reasoning: string;
  overridden_by_user: boolean;
}

// ---- AI Summary ----
export interface SHEAISummary {
  incident_title: string;
  narrative_summary: string;
  incident_type: string;
  severity_assessment: string;
  immediate_concerns: string[];
}

// ---- Safety Assessment ----
export interface SHEAssessment {
  generated_by: string;
  assessor_name: string;
  risk_confirmed: string;
  risk_label?: string;
  assessment_notes: string;
  requires_mitigation: boolean;
  additional_actions: string[];
  priority_findings: string[];
  recommended_timeline: string;
  assessed_at: string;
}

// ---- Mitigation Action ----
export interface SHEMitigationAction {
  action: string;
  hazard_addressed: string;
  status: string;
  priority: string;
  estimated_completion: string;
  control_type?: string;
}

// ---- Mitigation Plan ----
export interface SHEMitigation {
  generated_by: string;
  responder_name: string;
  department: string;
  department_label: string;
  mitigation_actions: SHEMitigationAction[];
  mitigation_notes: string;
  preventive_measures: string[];
  training_required: string[];
  submitted_at: string;
}

// ---- Workflow History Item ----
export interface SHEWorkflowHistoryItem {
  action: string;
  by: string;
  role: string;
  timestamp: string;
  notes: string;
}

// ---- Workflow ----
export interface SHEWorkflow {
  status: string;
  assigned_department: string;
  fully_automated: boolean;
  history: SHEWorkflowHistoryItem[];
  closed_at: string | null;
  closed_by: string | null;
}

// ---- Legal Compliance Obligations ----
export interface SHELegalCompliance {
  violated_laws: string[];
  primary_legislation: string[];
  reporting_requirements: string[];
  employer_obligations: string[];
}

// ---- Full Report ----
export interface SHEReport {
  id?: string;
  created_by?: SHECreatedBy;
  report_header: SHEReportHeader;
  summary: SHEReportSummary;
  ppe_compliance: SHEPPECompliance;
  environmental_hazards: SHEEnvironmentalHazard[];
  unsafe_behaviors: SHEUnsafeBehavior[];
  corrective_actions: SHECorrectiveAction[];
  risk_assessment: SHERiskAssessment;
  incident_details?: SHEIncidentDetails;
  ai_classification?: SHEAIClassification;
  ai_summary?: SHEAISummary;
  incident_image?: {
    data_url: string;
    thumbnail_url: string;
  };
  assessment?: SHEAssessment;
  mitigation?: SHEMitigation;
  workflow?: SHEWorkflow;
  compliance_obligations?: SHELegalCompliance;
  created_at?: string;
  updated_at?: string;
}

// ---- Report list item ----
export interface SHEReportListItem {
  id: string;
  department: string;
  overall_risk: RiskLevel;
  risk_label?: string;
  hirac_class?: string;
  total_findings: number;
  scene_description: string;
  created_at: string;
  incident_title?: string;
  location?: string;
  workflow_status?: string;
  reported_by_name?: string;
  reported_by_department?: string;
  created_by?: SHECreatedBy;
  thumbnail_url?: string;
  image_filename?: string;
  image_size_bytes?: number;
}

export interface SHEReportsResponse {
  total: number;
  reports: SHEReportListItem[];
}

// ---- Department info ----
export interface SHEDepartmentInfo {
  label: string;
  short: string;
  required_ppe: string[];
}

export type SHEDepartments = Record<string, SHEDepartmentInfo>;

// ============================================================
// Risk Level Types
// ============================================================
export type RiskLevel = "critical" | "high" | "medium" | "low" | "safe";

export const RISK_COLORS: Record<
  RiskLevel,
  { bg: string; text: string; border: string }
> = {
  critical: {
    bg: "bg-red-100",
    text: "text-red-800",
    border: "border-red-300",
  },
  high: {
    bg: "bg-orange-100",
    text: "text-orange-800",
    border: "border-orange-300",
  },
  medium: {
    bg: "bg-yellow-100",
    text: "text-yellow-800",
    border: "border-yellow-300",
  },
  low: {
    bg: "bg-blue-100",
    text: "text-blue-800",
    border: "border-blue-200",
  },
  safe: {
    bg: "bg-green-100",
    text: "text-green-800",
    border: "border-green-200",
  },
};

export const SEVERITY_COLORS: Record<string, { bg: string; text: string }> = {
  critical: { bg: "bg-red-100", text: "text-red-800" },
  high: { bg: "bg-orange-100", text: "text-orange-800" },
  medium: { bg: "bg-yellow-100", text: "text-yellow-800" },
  low: { bg: "bg-blue-100", text: "text-blue-800" },
  safe: { bg: "bg-green-100", text: "text-green-800" },
};

export const WORKFLOW_STATUS_COLORS: Record<
  string,
  { bg: string; text: string; label: string }
> = {
  submitted: { bg: "bg-blue-100", text: "text-blue-800", label: "Submitted" },
  under_review: {
    bg: "bg-purple-100",
    text: "text-purple-800",
    label: "Under Review",
  },
  action_required: {
    bg: "bg-orange-100",
    text: "text-orange-800",
    label: "Action Required",
  },
  in_progress: {
    bg: "bg-amber-100",
    text: "text-amber-800",
    label: "In Progress",
  },
  closed: { bg: "bg-green-100", text: "text-green-800", label: "Closed" },
  pending_assessment: {
    bg: "bg-yellow-100",
    text: "text-yellow-800",
    label: "Pending Assessment",
  },
};

// ============================================================
// PPE LABELS - MUST BE EXPORTED
// ============================================================
export const PPE_LABELS: Record<string, string> = {
  hardhat: "Hard Hat",
  gloves: "Gloves",
  safety_vest: "Safety Vest",
  safety_harness: "Safety Harness",
  safety_boots: "Safety Boots",
  no_safety_gear: "No Safety Gear",
};

// ============================================================
// Compliance Types
// ============================================================
export interface SHEComplianceScores {
  overall: number;
  ppe_compliance: number;
  environmental_compliance: number;
  behavioral_compliance: number;
  risk_compliance: number;
  closure_rate: number;
}

export interface SHERiskDistribution {
  critical: number;
  high: number;
  medium: number;
  low: number;
  safe: number;
}

export interface SHEHIRACDistribution {
  highly_unacceptable: number;
  moderately_unacceptable: number;
  low_relatively_acceptable: number;
}

export interface SHEViolationCounts {
  ppe_violations: number;
  environmental_hazards: number;
  unsafe_behaviors: number;
}

export interface SHEDepartmentLegalCompliance {
  violated_laws: string[];
  total_unique_laws_violated: number;
  primary_applicable_laws: string[];
  reporting_requirements: string[];
}

export interface SHEDepartmentCompliance {
  department: string;
  status: "compliant" | "needs_attention" | "non_compliant";
  hirac_status?: string;
  total_reports: number;
  total_findings: number;
  compliance_scores: SHEComplianceScores;
  risk_distribution: SHERiskDistribution;
  hirac_distribution?: SHEHIRACDistribution;
  violation_counts: SHEViolationCounts;
  legal_compliance?: SHEDepartmentLegalCompliance;
  training_required: string[];
  latest_report: string;
  oldest_report: string;
}

export interface SHEComplianceSummary {
  total_reports: number;
  overall_ppe_compliance: number;
  overall_safety_rate: number;
  departments: SHEDepartmentCompliance[];
  risk_level_reference?: Record<string, string>;
  legal_framework?: {
    primary_legislation: string;
    irr: string;
    core_rules: string[];
    reference_source: string;
  };
}

export interface SHEComplianceAction {
  id: string;
  department: string;
  action_text: string;
  submitted_by: string;
  category: string;
  status: "pending_review" | "reviewed" | "resolved";
  risk_level?: RiskLevel;
  hirac_ref?: string;
  checklist_ref?: string;
  legal_basis?: string;
  submitted_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  review_notes: string | null;
  approved_at: string | null;
  approved_by: string | null;
  proof_image?: {
    data_url: string;
    thumbnail_url: string;
    filename: string;
    content_type: string;
    size_bytes: number;
  };
}

export interface SHEComplianceActionsResponse {
  total: number;
  actions: SHEComplianceAction[];
}

export const COMPLIANCE_ACTION_STATUS_COLORS: Record<
  string,
  { bg: string; text: string }
> = {
  pending_review: { bg: "bg-yellow-100", text: "text-yellow-800" },
  reviewed: { bg: "bg-blue-100", text: "text-blue-800" },
  resolved: { bg: "bg-green-100", text: "text-green-800" },
};
