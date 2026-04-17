import { useQuery } from "@tanstack/react-query";
import { MetricCard } from "../components/ui/metric-card";
import { TrendChart } from "../components/trend-chart";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { AlertTriangle, HardHat, ClipboardCheck, Brain } from "lucide-react";
import { trendData } from "../utils/mock-data";
import { formatDistanceToNow } from "date-fns";
import { useLocation } from "wouter";
import { getStoredUser } from "../utils/user";

const API = import.meta.env.VITE_SHE_API_BASE_URL?.replace("/api", "") ?? "https://worksafer-backend-production.up.railway.app";

interface DepartmentSummary {
  department: string;
  status: string;
  total_reports: number;
  total_findings: number;
  compliance_scores: {
    overall: number;
    ppe_compliance: number;
    environmental_compliance: number;
    behavioral_compliance: number;
    risk_compliance: number;
    closure_rate: number;
  };
  risk_distribution: {
    safe: number;
    medium: number;
    high: number;
    critical: number;
  };
  violation_counts: {
    ppe_violations: number;
    environmental_hazards: number;
    unsafe_behaviors: number;
  };
  training_required: string[];
  latest_report: string;
  oldest_report: string;
}

interface ComplianceSummary {
  total_reports: number;
  overall_ppe_compliance: number;
  overall_safety_rate: number;
  departments: DepartmentSummary[];
}

interface WorkflowReport {
  id: string;
  incident_title: string;
  department: string;
  risk_level: string;
  created_at: string;
  updated_at: string;
}

interface WorkflowDashboard {
  total_reports: number;
  by_status: { [key: string]: { count: number; reports: WorkflowReport[] } };
}

interface Report {
  id: string;
  incident_title: string;
  department: string;
  overall_risk: string;
  total_findings: number;
  scene_description: string;
  location: string;
  workflow_status: string;
  created_at: string;
}

interface ReportsResponse {
  total: number;
  reports: Report[];
}

interface ComplianceActionsResponse {
  total: number;
  actions: any[];
}

export default function Dashboard() {
  const [, navigate] = useLocation();

  const user = getStoredUser();
  const userDepartment = user?.department || "Safety Department";

  // Total Incidents + AI Reports count + Recent 3 cards
  const { data: reportsResponse, isLoading: isLoadingReports } =
    useQuery<ReportsResponse>({
      queryKey: ["/api/reports"],
      queryFn: async () => {
        const res = await fetch(`${API}/api/reports`);
        if (!res.ok) throw new Error("Failed to fetch reports");
        return res.json();
      },
    });

  // Pending Reviews count — from compliance actions
  const { data: complianceActions, isLoading: isLoadingActions } =
    useQuery<ComplianceActionsResponse>({
      queryKey: ["/api/compliance/actions"],
      queryFn: async () => {
        const res = await fetch(`${API}/api/compliance/actions`);
        if (!res.ok) throw new Error("Failed to fetch compliance actions");
        return res.json();
      },
    });

  // Department Safety Status
  const { data: complianceSummary, isLoading: isLoadingCompliance } =
    useQuery<ComplianceSummary>({
      queryKey: ["/api/compliance/summary"],
      queryFn: async () => {
        const res = await fetch(`${API}/api/compliance/summary`);
        if (!res.ok) throw new Error("Failed to fetch compliance summary");
        return res.json();
      },
    });

  // Pending reviews per department
  const { data: workflowDashboard, isLoading: isLoadingWorkflow } =
    useQuery<WorkflowDashboard>({
      queryKey: ["/api/workflow/dashboard"],
      queryFn: async () => {
        const res = await fetch(`${API}/api/workflow/dashboard`);
        if (!res.ok) throw new Error("Failed to fetch workflow dashboard");
        return res.json();
      },
    });

  const getSeverityColor = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case "critical":
      case "high":
        return "w-2 h-2 bg-red-500 rounded-full flex-shrink-0 mt-1";
      case "medium":
        return "w-2 h-2 bg-yellow-500 rounded-full flex-shrink-0 mt-1";
      case "safe":
      case "low":
        return "w-2 h-2 bg-green-500 rounded-full flex-shrink-0 mt-1";
      default:
        return "w-2 h-2 bg-gray-400 rounded-full flex-shrink-0 mt-1";
    }
  };

  const getDepartmentStatusColor = (status: string) => {
    switch (status) {
      case "compliant":
        return "w-3 h-3 bg-green-500 rounded-full flex-shrink-0";
      case "needs_attention":
        return "w-3 h-3 bg-yellow-500 rounded-full flex-shrink-0";
      case "non_compliant":
        return "w-3 h-3 bg-red-500 rounded-full flex-shrink-0";
      default:
        return "w-3 h-3 bg-gray-400 rounded-full flex-shrink-0";
    }
  };

  if (
    isLoadingReports ||
    isLoadingActions ||
    isLoadingCompliance ||
    isLoadingWorkflow
  ) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse space-y-8">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Computed values ──
  const totalIncidents = reportsResponse?.total || 0;

  const highRiskIncidents =
    reportsResponse?.reports?.filter(
      (r) => r.overall_risk === "high" || r.overall_risk === "critical",
    ).length || 0;

  // Pending reviews = compliance actions with status pending_review
  const pendingActions =
    complianceActions?.actions?.filter((a) => a.status === "pending_review")
      .length || 0;

  // AI Reports = all reports (100% AI generated)
  const aiReportsCount = reportsResponse?.total || 0;

  // 3 most recent reports
  const recentIncidents = reportsResponse?.reports?.slice(0, 3) || [];

  const allDepts = complianceSummary?.departments || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          {userDepartment} Dashboard
        </h1>
        <p className="text-gray-600 mt-2">
          Real-time insights and analytics for {userDepartment}
        </p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* 1. Total Incidents — /api/reports total */}
        <MetricCard
          title="Total Incidents"
          value={totalIncidents}
          change={
            highRiskIncidents > 0
              ? `${highRiskIncidents} high risk`
              : "No high risk incidents"
          }
          changeType={highRiskIncidents > 0 ? "negative" : "positive"}
          icon={AlertTriangle}
          iconColor="destructive"
        />

        {/* 2. Most Common Hazard — blank/static */}
        <MetricCard
          title="Most Common Hazard"
          value="—"
          change=""
          icon={HardHat}
          iconColor="warning"
        />

        {/* 3. Pending Reviews — /api/compliance/actions pending_review count */}
        <MetricCard
          title="Pending Reviews"
          value={pendingActions}
          change={pendingActions > 0 ? "Needs attention" : "All up to date"}
          changeType={pendingActions > 0 ? "negative" : "positive"}
          icon={ClipboardCheck}
          iconColor="success"
        />

        {/* 4. AI Reports — /api/reports total */}
        <MetricCard
          title="AI Reports Generated"
          value={aiReportsCount}
          change="100% automation rate"
          changeType="positive"
          icon={Brain}
          iconColor="primary"
        />
      </div>

      {/* Charts + Recent Incidents */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Static trend graph */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">
              30-Day Safety Trend
            </h3>
            <select className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
              <option>Last 30 days</option>
              <option>Last 90 days</option>
              <option>Last 6 months</option>
            </select>
          </div>
          <TrendChart data={trendData} title="" />
        </div>

        {/* Recent Incidents — 3 cards from /api/reports */}
        <Card className="bg-white rounded-xl shadow-sm border border-gray-200">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">
              Recent Incident Highlights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentIncidents.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-6">
                  No recent incidents
                </p>
              ) : (
                recentIncidents.map((incident) => (
                  <div
                    key={incident.id}
                    className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg"
                  >
                    <div
                      className={getSeverityColor(incident.overall_risk)}
                    ></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {incident.incident_title || "Untitled Incident"}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatDistanceToNow(new Date(incident.created_at), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
            <button
              onClick={() => navigate("/reports")}
              className="w-full mt-4 text-primary text-sm font-medium hover:underline"
            >
              View All Incidents
            </button>
          </CardContent>
        </Card>
      </div>

      {/* Department Safety Status */}
      <Card className="bg-white rounded-xl shadow-sm border border-gray-200">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900">
            Department Safety Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          {allDepts.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-6">
              No department data available yet.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {allDepts.map((dept) => {
                // Pending reviews for this specific department from workflow
                const pendingForDept =
                  workflowDashboard?.by_status?.[
                    "pending_review"
                  ]?.reports?.filter((r) => r.department === dept.department)
                    .length || 0;

                return (
                  <div
                    key={dept.department}
                    className="p-4 border border-gray-200 rounded-lg"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-900 text-sm leading-tight">
                        {dept.department}
                      </h4>
                      <div
                        className={getDepartmentStatusColor(dept.status)}
                      ></div>
                    </div>

                    {/* Compliance progress bar */}
                    <div className="mb-2">
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>Compliance</span>
                        <span className="font-semibold text-gray-700">
                          {dept.compliance_scores.overall}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full ${
                            dept.status === "compliant"
                              ? "bg-green-500"
                              : dept.status === "needs_attention"
                                ? "bg-yellow-500"
                                : "bg-red-500"
                          }`}
                          style={{
                            width: `${dept.compliance_scores.overall}%`,
                          }}
                        ></div>
                      </div>
                    </div>

                    {/* Pending reviews count */}
                    <p className="text-xs text-gray-500">
                      <span
                        className={`font-semibold ${pendingForDept > 0 ? "text-orange-600" : "text-green-600"}`}
                      >
                        {pendingForDept}
                      </span>{" "}
                      pending review{pendingForDept !== 1 ? "s" : ""}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
