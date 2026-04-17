import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MetricCard } from "../components/ui/metric-card";
import { TrendChart } from "../components/trend-chart";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../components/ui/dialog";
import { AlertTriangle, HardHat, ClipboardCheck, Brain } from "lucide-react";
import {
  addDays,
  addMonths,
  addWeeks,
  differenceInCalendarDays,
  endOfDay,
  format,
  formatDistanceToNow,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
} from "date-fns";
import { useLocation } from "wouter";
import { getStoredUser } from "../utils/user";
import {
  isSafetyDepartmentAccount,
  resolveDepartmentKey,
} from "../utils/department";
import { isOpenComplianceActionStatus } from "../utils/compliance";

const API = import.meta.env.VITE_SHE_API_BASE_URL?.replace("/api", "") ?? "https://worksafer-backend-production.up.railway.app";

interface DepartmentConfig {
  label: string;
  short: string;
  required_ppe: string[];
}

type DepartmentsResponse = Record<string, DepartmentConfig>;

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

interface PPEHazard {
  hazard: string;
  missing_ppe: string;
  severity: "critical" | "high" | "medium";
}

interface ReportDetail {
  id?: string;
  created_at?: string;
  ppe_compliance?: {
    ppe_hazards?: PPEHazard[];
  };
}

interface ComplianceActionsResponse {
  total: number;
  actions: Array<{
    id: string;
    department: string;
    status: string;
  }>;
}

export default function Dashboard() {
  const [, navigate] = useLocation();

  const user = getStoredUser();
  const userDepartment = user?.department || "Safety Department";
  const isSafetyDept = isSafetyDepartmentAccount({
    department: userDepartment,
    role: typeof user?.role === "string" ? user.role : "",
  });

  const DEPT_LABEL_TO_KEY: Record<string, string> = {
    "Field Operations Group": "field",
    "Field Operation": "field",
    "Quality Control": "quality",
    Environmental: "environmental",
    "Human Resources": "hr",
    HR: "hr",
  };

  const { data: departments } = useQuery<DepartmentsResponse>({
    queryKey: ["/api/departments"],
    queryFn: async () => {
      const res = await fetch(`${API}/api/departments`);
      if (!res.ok) throw new Error("Failed to fetch departments");
      return res.json();
    },
  });

  const deptLabelToKey = useMemo(() => {
    const map: Record<string, string> = { ...DEPT_LABEL_TO_KEY };
    if (departments) {
      for (const [key, cfg] of Object.entries(departments)) {
        map[cfg.label] = key;
      }
    }
    return map;
  }, [departments]);

  const userDeptKey = useMemo(() => {
    if (isSafetyDept) return "";
    const roleLabel = typeof user?.role === "string" ? user.role : "";
    return (
      resolveDepartmentKey(userDepartment, deptLabelToKey) ||
      resolveDepartmentKey(roleLabel, deptLabelToKey) ||
      ""
    );
  }, [deptLabelToKey, isSafetyDept, user?.role, userDepartment]);

  const [selectedDeptKey, setSelectedDeptKey] = useState<string>(
    isSafetyDept ? "all" : "",
  );

  useEffect(() => {
    if (!isSafetyDept && userDeptKey) setSelectedDeptKey(userDeptKey);
  }, [isSafetyDept, userDeptKey]);

  const departmentKeyForMetrics = isSafetyDept
    ? selectedDeptKey
    : userDeptKey || selectedDeptKey;

  const [trendRange, setTrendRange] = useState<"30" | "90" | "180" | "custom">(
    "30",
  );
  const [trendStartDate, setTrendStartDate] = useState<string>("");
  const [trendEndDate, setTrendEndDate] = useState<string>("");
  const [isHazardsOpen, setIsHazardsOpen] = useState(false);

  // If user sets dates, switch to custom automatically.
  useEffect(() => {
    if ((trendStartDate || trendEndDate) && trendRange !== "custom") {
      setTrendRange("custom");
    }
  }, [trendEndDate, trendRange, trendStartDate]);

  // Total Incidents + AI Reports count + Recent 3 cards
  const { data: reportsResponse, isLoading: isLoadingReports } =
    useQuery<ReportsResponse>({
      enabled: isSafetyDept ? !!departmentKeyForMetrics : !!userDeptKey,
      queryKey: ["/api/reports", departmentKeyForMetrics || "all"],
      queryFn: async () => {
        const params = new URLSearchParams();
        const deptKey =
          departmentKeyForMetrics && departmentKeyForMetrics !== "all"
            ? departmentKeyForMetrics
            : "";
        if (deptKey) params.set("department", deptKey);

        const qs = params.toString();
        const res = await fetch(`${API}/api/reports${qs ? `?${qs}` : ""}`);
        if (!res.ok) throw new Error("Failed to fetch reports");
        return res.json();
      },
    });

  // Pending Reviews count — from compliance actions
  const idsKey = useMemo(() => {
    return reportsResponse?.reports?.map((r) => r.id).join("|") || "";
  }, [reportsResponse?.reports]);

  const {
    data: reportDetails,
    isLoading: isLoadingDetails,
    isError: isReportDetailsError,
  } = useQuery<ReportDetail[]>({
    enabled: !!reportsResponse?.reports?.length,
    queryKey: ["/api/reports/details", departmentKeyForMetrics || "all", idsKey],
    queryFn: async () => {
      const ids = (reportsResponse?.reports?.map((r) => r.id) || []).slice(0, 50);
      const results: ReportDetail[] = [];
      const batchSize = 10;

      for (let i = 0; i < ids.length; i += batchSize) {
        const batch = ids.slice(i, i + batchSize);
        const batchResults = await Promise.allSettled(
          batch.map(async (id) => {
            const res = await fetch(`${API}/api/reports/${id}`);
            if (!res.ok) throw new Error("Failed to fetch report detail");
            return res.json();
          }),
        );
        for (const r of batchResults) {
          if (r.status === "fulfilled") results.push(r.value as ReportDetail);
        }
      }

      return results;
    },
    staleTime: 60 * 1000,
  });

  const { data: complianceActions, isLoading: isLoadingActions } =
    useQuery<ComplianceActionsResponse>({
      enabled: isSafetyDept || !!userDeptKey,
      queryKey: ["/api/compliance/actions", isSafetyDept ? "all" : userDeptKey || ""],
      queryFn: async () => {
        const params = new URLSearchParams();
        if (!isSafetyDept && userDeptKey) params.set("department", userDeptKey);
        const qs = params.toString();

        const res = await fetch(`${API}/api/compliance/actions${qs ? `?${qs}` : ""}`);
        if (!res.ok) throw new Error("Failed to fetch compliance actions");
        return res.json();
      },
    });

  // Department Safety Status
  const { data: complianceSummary, isLoading: isLoadingCompliance } =
    useQuery<ComplianceSummary>({
      enabled: isSafetyDept || !!userDeptKey,
      queryKey: ["/api/compliance/summary", isSafetyDept ? "all" : userDeptKey],
      queryFn: async () => {
        const params = new URLSearchParams();
        if (!isSafetyDept && userDeptKey) params.set("department", userDeptKey);
        const qs = params.toString();

        const res = await fetch(
          `${API}/api/compliance/summary${qs ? `?${qs}` : ""}`,
        );
        if (!res.ok) throw new Error("Failed to fetch compliance summary");
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

  const pendingByDeptKey = useMemo(() => {
    const map: Record<string, number> = {};
    for (const action of complianceActions?.actions || []) {
      if (!isOpenComplianceActionStatus(action.status)) continue;
      const key = action.department || "unknown";
      map[key] = (map[key] || 0) + 1;
    }
    return map;
  }, [complianceActions?.actions]);

  const pendingActionsForMetrics = useMemo(() => {
    const depts = complianceSummary?.departments || [];

    if (isSafetyDept && selectedDeptKey && selectedDeptKey !== "all") {
      return depts.filter(
        (d) => resolveDepartmentKey(d.department, deptLabelToKey) === selectedDeptKey,
      ).length;
    }

    return depts.length;
  }, [complianceSummary?.departments, deptLabelToKey, isSafetyDept, selectedDeptKey]);

  // ── Computed values ──
  const totalIncidents = reportsResponse?.total || 0;

  const highRiskIncidents =
    reportsResponse?.reports?.filter(
      (r) => r.overall_risk === "high" || r.overall_risk === "critical",
    ).length || 0;

  // AI Reports = all reports (100% AI generated)
  const aiReportsCount = reportsResponse?.total || 0;

  // 3 most recent reports
  const recentIncidents = reportsResponse?.reports?.slice(0, 3) || [];

  const commonHazards = useMemo(() => {
    const severityScore = (sev: PPEHazard["severity"]) => {
      switch (sev) {
        case "critical":
          return 3;
        case "high":
          return 2;
        case "medium":
          return 1;
        default:
          return 0;
      }
    };

    const hazardMap: Record<
      string,
      {
        count: number;
        maxSeverity: PPEHazard["severity"];
        missingCounts: Record<string, number>;
      }
    > = {};

    for (const report of reportDetails || []) {
      const hazards = report.ppe_compliance?.ppe_hazards || [];
      for (const hz of hazards) {
        const name = (hz.hazard || "").trim();
        if (!name) continue;

        if (!hazardMap[name]) {
          hazardMap[name] = {
            count: 0,
            maxSeverity: hz.severity,
            missingCounts: {},
          };
        }

        hazardMap[name].count += 1;
        if (
          severityScore(hz.severity) >
          severityScore(hazardMap[name].maxSeverity)
        ) {
          hazardMap[name].maxSeverity = hz.severity;
        }

        const missing = (hz.missing_ppe || "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
        for (const item of missing.length ? missing : ["Unknown"]) {
          hazardMap[name].missingCounts[item] =
            (hazardMap[name].missingCounts[item] || 0) + 1;
        }
      }
    }

    const entries = Object.entries(hazardMap).map(([hazard, v]) => {
      const missingSorted = Object.entries(v.missingCounts).sort(
        (a, b) => b[1] - a[1],
      );
      const missingTop = missingSorted[0]?.[0] || "";
      const missingExtra = Math.max(0, missingSorted.length - 1);
      const missingLabel =
        missingTop && missingExtra > 0 ? `${missingTop} +${missingExtra}` : missingTop;
      return {
        hazard,
        count: v.count,
        severity: v.maxSeverity,
        missing: missingLabel,
      };
    });

    entries.sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      const s = severityScore(b.severity) - severityScore(a.severity);
      if (s !== 0) return s;
      return a.hazard.localeCompare(b.hazard);
    });

    return entries;
  }, [reportDetails]);

  const mostCommonHazard = commonHazards[0] || null;

  const allDepts = complianceSummary?.departments || [];

  const metricsDeptLabel = (() => {
    if (isSafetyDept) {
      if (selectedDeptKey === "all") return "All Departments";
      return departments?.[selectedDeptKey]?.label || selectedDeptKey;
    }
    const roleLabel = typeof user?.role === "string" ? user.role : "";
    return departments?.[userDeptKey]?.label || userDepartment || roleLabel;
  })();

  const safetyTrendData = useMemo(() => {
    const reports = reportsResponse?.reports || [];
    const now = new Date();

    const parsed = reports
      .map((r) => {
        const d = new Date(r.created_at);
        return Number.isFinite(d.getTime()) ? d : null;
      })
      .filter((d): d is Date => !!d);

    const counts: Record<string, number> = {};

    const effectivePresetRange: "30" | "90" | "180" =
      trendRange === "30" || trendRange === "90" || trendRange === "180"
        ? trendRange
        : "30";

    const customStart = trendStartDate
      ? startOfDay(new Date(trendStartDate))
      : null;
    const customEnd = trendEndDate
      ? endOfDay(new Date(trendEndDate))
      : null;

    const isValidCustomRange =
      !!customStart &&
      !!customEnd &&
      Number.isFinite(customStart.getTime()) &&
      Number.isFinite(customEnd.getTime()) &&
      customStart <= customEnd;

    const rangeStart = isValidCustomRange
      ? customStart
      : effectivePresetRange === "30"
        ? subDays(startOfDay(now), 29)
        : effectivePresetRange === "90"
          ? subDays(startOfDay(now), 89)
          : startOfMonth(subMonths(now, 5));

    const rangeEnd = isValidCustomRange ? customEnd : now;

    const crossesYear = rangeStart.getFullYear() !== rangeEnd.getFullYear();

    const bucket: "day" | "week" | "month" = (() => {
      if (!isValidCustomRange) {
        if (effectivePresetRange === "30") return "day";
        if (effectivePresetRange === "90") return "week";
        return "month";
      }

      const days = differenceInCalendarDays(rangeEnd, rangeStart) + 1;
      if (days <= 31) return "day";
      if (days <= 120) return "week";
      return "month";
    })();

    const keyForDate = (d: Date) => {
      if (bucket === "day")
        return format(startOfDay(d), crossesYear ? "MMM d yyyy" : "MMM d");
      if (bucket === "week")
        return format(
          startOfWeek(d, { weekStartsOn: 1 }),
          crossesYear ? "MMM d yyyy" : "MMM d",
        );
      return format(
        startOfMonth(d),
        crossesYear ? "MMM yyyy" : "MMM",
      );
    };

    for (const d of parsed) {
      if (d < rangeStart || d > rangeEnd) continue;
      const key = keyForDate(d);
      counts[key] = (counts[key] || 0) + 1;
    }

    if (bucket === "day") {
      const days = Math.max(1, differenceInCalendarDays(rangeEnd, rangeStart) + 1);
      return Array.from({ length: days }).map((_, idx) => {
        const day = addDays(rangeStart, idx);
        const key = format(day, crossesYear ? "MMM d yyyy" : "MMM d");
        return { name: key, value: counts[key] || 0 };
      });
    }

    if (bucket === "week") {
      const startWeek = startOfWeek(rangeStart, { weekStartsOn: 1 });
      const series: Array<{ name: string; value: number }> = [];
      for (let wk = startWeek; wk <= rangeEnd; wk = addWeeks(wk, 1)) {
        const key = format(wk, crossesYear ? "MMM d yyyy" : "MMM d");
        series.push({ name: key, value: counts[key] || 0 });
      }
      return series;
    }

    const startMonth = startOfMonth(rangeStart);
    const series: Array<{ name: string; value: number }> = [];
    for (let m = startMonth; m <= rangeEnd; m = addMonths(m, 1)) {
      const key = format(m, crossesYear ? "MMM yyyy" : "MMM");
      series.push({ name: key, value: counts[key] || 0 });
    }
    return series;
  }, [
    isSafetyDept,
    reportsResponse?.reports,
    selectedDeptKey,
    trendEndDate,
    trendRange,
    trendStartDate,
  ]);

  if (isLoadingReports || isLoadingActions || isLoadingCompliance) {
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {metricsDeptLabel} Dashboard
            </h1>
            <p className="text-gray-600 mt-2">
              Real-time insights and analytics for {metricsDeptLabel}
            </p>
          </div>

          {isSafetyDept ? (
            <div className="min-w-[220px]">
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Department View
              </label>
              <select
                value={selectedDeptKey}
                onChange={(e) => setSelectedDeptKey(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
              >
                <option value="all">All Departments</option>
                {(departments
                  ? Object.entries(departments).map(([key, cfg]) => ({
                    key,
                    label: cfg.label,
                  }))
                  : Object.entries(DEPT_LABEL_TO_KEY).map(([label, key]) => ({
                    key,
                    label,
                  }))
                )
                  .filter(
                    (d, idx, arr) => arr.findIndex((x) => x.key === d.key) === idx,
                  )
                  .map((d) => (
                    <option key={d.key} value={d.key}>
                      {d.label}
                    </option>
                  ))}
              </select>
            </div>
          ) : null}
        </div>
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

        {/* 2. Most Common Hazard — from report PPE hazards */}
        <Card className="bg-white rounded-xl shadow-sm border border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-gray-600">
                    Most Common Hazard
                  </p>
                  <Dialog open={isHazardsOpen} onOpenChange={setIsHazardsOpen}>
                    <DialogTrigger asChild>
                      <button
                        type="button"
                        className="text-xs font-medium text-primary hover:underline"
                      >
                        View all
                      </button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Most Common Hazards</DialogTitle>
                        <DialogDescription>
                          {metricsDeptLabel} • Based on latest{" "}
                          {Math.min(reportsResponse?.reports?.length || 0, 50)}{" "}
                          report(s)
                        </DialogDescription>
                      </DialogHeader>

                      {isLoadingDetails ? (
                        <p className="text-sm text-gray-600">Loading hazards…</p>
                      ) : isReportDetailsError ? (
                        <p className="text-sm text-gray-600">
                          Failed to load hazards. Please try again.
                        </p>
                      ) : commonHazards.length === 0 ? (
                        <p className="text-sm text-gray-600">
                          No PPE-related hazards found.
                        </p>
                      ) : (
                        <div className="max-h-[60vh] overflow-auto border border-gray-200 rounded-lg">
                          <table className="w-full text-sm">
                            <thead className="sticky top-0 bg-white">
                              <tr className="text-left text-xs text-gray-500 border-b border-gray-200">
                                <th className="px-3 py-2">Severity</th>
                                <th className="px-3 py-2">Hazard</th>
                                <th className="px-3 py-2">Missing PPE</th>
                                <th className="px-3 py-2 text-right">Count</th>
                              </tr>
                            </thead>
                            <tbody>
                              {commonHazards.map((h) => {
                                const sevClass =
                                  h.severity === "critical"
                                    ? "bg-red-100 text-red-800"
                                    : h.severity === "high"
                                      ? "bg-orange-100 text-orange-800"
                                      : "bg-yellow-100 text-yellow-800";

                                return (
                                  <tr
                                    key={h.hazard}
                                    className="border-b border-gray-100 last:border-b-0"
                                  >
                                    <td className="px-3 py-2">
                                      <span
                                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${sevClass}`}
                                      >
                                        {h.severity}
                                      </span>
                                    </td>
                                    <td className="px-3 py-2 text-gray-900">
                                      {h.hazard}
                                    </td>
                                    <td className="px-3 py-2 text-gray-700">
                                      {h.missing || "—"}
                                    </td>
                                    <td className="px-3 py-2 text-right font-semibold text-gray-900">
                                      {h.count}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </DialogContent>
                  </Dialog>
                </div>

                <p className="text-3xl font-bold text-gray-900 mt-1 truncate">
                  {mostCommonHazard?.hazard || "—"}
                </p>
                <p
                  className={`text-sm mt-1 ${mostCommonHazard?.severity === "critical" ||
                      mostCommonHazard?.severity === "high"
                      ? "text-red-600"
                      : "text-gray-600"
                    }`}
                >
                  {isLoadingDetails
                    ? "Loading hazards…"
                    : isReportDetailsError
                      ? "Failed to load hazards"
                      : mostCommonHazard
                        ? `${mostCommonHazard.severity.toUpperCase()} • Missing: ${mostCommonHazard.missing || "—"}`
                        : "No PPE hazards found"}
                </p>
              </div>

              <div className="p-3 rounded-lg bg-yellow-100 text-yellow-600">
                <HardHat className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 3. Pending Reviews — /api/compliance/actions pending_review count */}
        <MetricCard
          title="Pending Reviews"
          value={pendingActionsForMetrics}
          change={
            pendingActionsForMetrics > 0 ? "Needs attention" : "All up to date"
          }
          changeType={pendingActionsForMetrics > 0 ? "negative" : "positive"}
          icon={ClipboardCheck}
          iconColor="success"
        />

        {/* 4. AI Reports — /api/reports total */}
        <MetricCard
          title="AI Reports"
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
          <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Safety Trend</h3>
              <p className="text-xs text-gray-500 mt-1">
                Set a start date and end date to filter your Safety Trend.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={trendRange}
                onChange={(e) => {
                  const next = e.target.value as "30" | "90" | "180" | "custom";
                  setTrendRange(next);
                  if (next !== "custom") {
                    setTrendStartDate("");
                    setTrendEndDate("");
                  }
                }}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
              >
                <option value="30">Last 30 days</option>
                <option value="90">Last 90 days</option>
                <option value="180">Last 6 months</option>
                <option value="custom">Custom range</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Start date
              </label>
              <input
                type="date"
                value={trendStartDate}
                onChange={(e) => setTrendStartDate(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
                max={trendEndDate || undefined}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                End date
              </label>
              <input
                type="date"
                value={trendEndDate}
                onChange={(e) => setTrendEndDate(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
                min={trendStartDate || undefined}
              />
            </div>
            <div className="sm:col-span-2 flex justify-end gap-2">
              <button
                type="button"
                className="text-sm px-3 py-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50"
                disabled={!trendStartDate && !trendEndDate}
                onClick={() => {
                  setTrendStartDate("");
                  setTrendEndDate("");
                  setTrendRange("30");
                }}
              >
                Clear dates
              </button>
            </div>
          </div>
          <TrendChart data={safetyTrendData} title="" />
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
                const deptKey = deptLabelToKey[dept.department] || "";
                const pendingForDept = deptKey ? pendingByDeptKey[deptKey] || 0 : 0;

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
                          className={`h-1.5 rounded-full ${dept.status === "compliant"
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
