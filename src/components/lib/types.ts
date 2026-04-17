export interface DashboardMetrics {
  totalIncidents: number;
  commonHazard: string;
  hazardCount: number;
  complianceRate: number;
  aiReports: number;
  automationRate: number;
}

export interface RecentIncident {
  id: string;
  title: string;
  timeAgo: string;
  severity: "high" | "medium" | "low";
}

export interface Department {
  name: string;
  status: "good" | "warning" | "danger";
  pendingReviews: number;
}

export interface AIAnalysisResult {
  hazardType: string;
  riskLevel: string;
  confidence: number;
  detectedObjects: string[];
  generatedReport: string;
}

export interface ChartData {
  name: string;
  value: number;
}

export interface HazardData {
  name: string;
  value: number;
  color: string;
}