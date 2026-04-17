import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Button } from "../components/ui/button";
import { MetricCard } from "../components/ui/metric-card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import { Download, Users, AlertTriangle, Brain, BarChart3 } from "lucide-react";
import { useToast } from "../hooks/use-toast";
import {
  addDays,
  addMonths,
  format,
  startOfDay,
  startOfMonth,
  subDays,
  subMonths,
} from "date-fns";
import {
  fetchDepartments,
  fetchReportById,
  fetchReports,
} from "../components/lib/she-api";
import type {
  SHEDepartments,
  SHEReport,
  SHEReportsResponse,
} from "../components/lib/she-api-types";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts";
import { getStoredUser } from "../utils/user";
import {
  isSafetyDepartmentAccount,
  resolveDepartmentKey,
} from "../utils/department";
import { isOpenComplianceActionStatus } from "../utils/compliance";

const SHE_API_BASE = import.meta.env.VITE_SHE_API_BASE_URL ?? "https://worksafer-backend-production.up.railway.app/api";

type DepartmentKey = "field" | "hr" | "quality" | "environmental" | "all";

type InjuryPeriod = "weekly" | "monthly" | "yearly";

interface ComplianceActionsResponse {
  total: number;
  actions: Array<{
    id: string;
    department: string;
    status: string;
  }>;
}

interface DepartmentMlData {
  department_key: string;
  department?: string;
  total_reports?: number;
  aggregated_ppe_present?: string[];
  aggregated_ppe_missing?: string[];
  ml_output: Record<string, { probability: number; prevention?: string }> | null;
  last_updated?: string;
  message?: string;
}

const ML_ENDPOINT_BY_DEPT: Record<Exclude<DepartmentKey, "all">, string> = {
  field: "field-op-ml-data",
  hr: "hr-ml-data",
  environmental: "environment-ml-data",
  quality: "quality-ml-data",
};

const ML_DISPLAY_ORDER = [
  "Fall Hazard",
  "Foot Injury",
  "Hand Injury",
  "Head Injury",
  "Safe",
  "Severe Fall Injury",
  "Vehicle Strike Risk",
  "Visibility Accident",
] as const;

function triggerDownload(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  window.URL.revokeObjectURL(url);
}

function buildMlDisplayLines(
  output: DepartmentMlData["ml_output"],
): Array<{ hazard: string; probability: number }> {
  if (!output) return [];

  const known = new Set<string>(ML_DISPLAY_ORDER as unknown as string[]);
  const getProb = (hazard: string) => Number(output?.[hazard]?.probability ?? 0);

  const lines = (ML_DISPLAY_ORDER as unknown as string[]).map((hazard) => ({
    hazard,
    probability: getProb(hazard),
  }));

  const extras = Object.keys(output).filter((k) => !known.has(k));
  extras.sort((a, b) => a.localeCompare(b));
  for (const hazard of extras) {
    lines.push({ hazard, probability: getProb(hazard) });
  }

  return lines;
}

function toSortedCounts(items: string[]) {
  const counts: Record<string, number> = {};
  for (const item of items) {
    const key = (item || "Unknown").trim() || "Unknown";
    counts[key] = (counts[key] || 0) + 1;
  }
  return Object.entries(counts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

export default function Analytics() {
  const { toast } = useToast();

  const user = getStoredUser();
  const userDepartment = user?.department || "Safety Department";
  const isSafetyDept = isSafetyDepartmentAccount({
    department: userDepartment,
    role: typeof user?.role === "string" ? user.role : "",
  });

  const { data: departments } = useQuery<SHEDepartments>({
    queryKey: ["she-departments"],
    queryFn: fetchDepartments,
  });

  const deptLabelToKey = useMemo(() => {
    const fallback: Record<string, Exclude<DepartmentKey, "all">> = {
      "Field Operations Group": "field",
      "Field Operation": "field",
      "Quality Control": "quality",
      Environmental: "environmental",
      "Human Resources": "hr",
      HR: "hr",
    };
    const map: Record<string, Exclude<DepartmentKey, "all">> = { ...fallback };
    if (departments) {
      for (const [key, cfg] of Object.entries(departments)) {
        map[cfg.label] = key as Exclude<DepartmentKey, "all">;
      }
    }
    return map;
  }, [departments]);

  const userDeptKey = useMemo(() => {
    if (isSafetyDept) return "" as const;
    const roleLabel = typeof user?.role === "string" ? user.role : "";
    return (resolveDepartmentKey(userDepartment, deptLabelToKey) ||
      resolveDepartmentKey(roleLabel, deptLabelToKey) ||
      "") as Exclude<DepartmentKey, "all"> | "";
  }, [deptLabelToKey, isSafetyDept, user?.role, userDepartment]);

  const [selectedDeptKey, setSelectedDeptKey] = useState<DepartmentKey>(
    isSafetyDept ? "all" : "all",
  );

  const [injuryPeriod, setInjuryPeriod] = useState<InjuryPeriod>("monthly");

  useEffect(() => {
    if (!isSafetyDept && userDeptKey) setSelectedDeptKey(userDeptKey);
  }, [isSafetyDept, userDeptKey]);

  const deptKeyForAnalytics: DepartmentKey = isSafetyDept
    ? selectedDeptKey
    : ((userDeptKey || "all") as DepartmentKey);

  const reportsFilter =
    deptKeyForAnalytics !== "all"
      ? { department: deptKeyForAnalytics }
      : undefined;

  const {
    data: reportsResponse,
    isLoading: isLoadingReports,
    isError: isReportsError,
  } = useQuery<SHEReportsResponse>({
    enabled: isSafetyDept ? !!deptKeyForAnalytics : !!userDeptKey,
    queryKey: ["she-reports", deptKeyForAnalytics],
    queryFn: () => fetchReports(reportsFilter),
  });

  const idsKey = useMemo(() => {
    return reportsResponse?.reports?.map((r) => r.id).join("|") || "";
  }, [reportsResponse?.reports]);

  const { data: reportDetails, isLoading: isLoadingDetails } = useQuery<
    SHEReport[]
  >({
    enabled: !!reportsResponse?.reports?.length,
    queryKey: ["she-report-details", deptKeyForAnalytics, idsKey],
    queryFn: async () => {
      const ids = reportsResponse?.reports?.map((r) => r.id) || [];
      const results: SHEReport[] = [];
      const batchSize = 10;

      for (let i = 0; i < ids.length; i += batchSize) {
        const batch = ids.slice(i, i + batchSize);
        const batchResults = await Promise.all(
          batch.map((id) => fetchReportById(id)),
        );
        results.push(...batchResults);
      }

      return results;
    },
    staleTime: 60 * 1000,
  });

  const { data: complianceActions } = useQuery<ComplianceActionsResponse>({
    enabled: isSafetyDept ? !!deptKeyForAnalytics : !!userDeptKey,
    queryKey: ["she-compliance-actions", deptKeyForAnalytics],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (deptKeyForAnalytics !== "all") params.set("department", deptKeyForAnalytics);
      const qs = params.toString();
      const res = await fetch(
        `${SHE_API_BASE}/compliance/actions${qs ? `?${qs}` : ""}`,
      );
      if (!res.ok) throw new Error("Failed to fetch compliance actions");
      return res.json();
    },
    staleTime: 30 * 1000,
  });

  const {
    data: mlData,
    isLoading: isLoadingMl,
    isError: isMlError,
    error: mlError,
  } = useQuery<DepartmentMlData>({
    enabled:
      deptKeyForAnalytics !== "all" &&
      !!ML_ENDPOINT_BY_DEPT[deptKeyForAnalytics as Exclude<DepartmentKey, "all">],
    queryKey: ["ml-data", deptKeyForAnalytics],
    queryFn: async () => {
      const endpoint =
        ML_ENDPOINT_BY_DEPT[deptKeyForAnalytics as Exclude<DepartmentKey, "all">];
      const res = await fetch(`${SHE_API_BASE}/${endpoint}`);
      if (!res.ok) {
        const detail = await res.json().catch(() => null);
        const message =
          (detail && (detail.message || detail.detail?.message)) ||
          `Failed to fetch ML data (${res.status})`;
        throw new Error(message);
      }
      return res.json();
    },
    staleTime: 30 * 1000,
  });

  const { data: mlDataAll, isLoading: isLoadingMlAll } = useQuery<
    Record<Exclude<DepartmentKey, "all">, DepartmentMlData>
  >({
    enabled: deptKeyForAnalytics === "all",
    queryKey: ["ml-data-all"],
    queryFn: async () => {
      const keys: Array<Exclude<DepartmentKey, "all">> = [
        "field",
        "hr",
        "quality",
        "environmental",
      ];

      const results = await Promise.all(
        keys.map(async (key) => {
          const endpoint = ML_ENDPOINT_BY_DEPT[key];
          try {
            const res = await fetch(`${SHE_API_BASE}/${endpoint}`);
            if (!res.ok) {
              const detail = await res.json().catch(() => null);
              const message =
                (detail && (detail.message || detail.detail?.message)) ||
                `Failed to fetch ML data (${res.status})`;
              return [
                key,
                {
                  department_key: key,
                  ml_output: null,
                  message,
                } satisfies DepartmentMlData,
              ] as const;
            }
            const data = (await res.json()) as DepartmentMlData;
            return [key, data] as const;
          } catch (e) {
            return [
              key,
              {
                department_key: key,
                ml_output: null,
                message:
                  e instanceof Error ? e.message : "Failed to fetch ML data",
              } satisfies DepartmentMlData,
            ] as const;
          }
        }),
      );

      return Object.fromEntries(results) as Record<
        Exclude<DepartmentKey, "all">,
        DepartmentMlData
      >;
    },
    staleTime: 30 * 1000,
  });

  const workersTotal = useMemo(() => {
    return (reportDetails || []).reduce(
      (sum, r) => sum + (r.summary?.worker_count ?? 0),
      0,
    );
  }, [reportDetails]);

  const incidentTypeCounts = useMemo(() => {
    const types =
      (reportDetails || []).map((r) => r.ai_summary?.incident_type || "Unknown") ||
      [];
    return toSortedCounts(types);
  }, [reportDetails]);

  const unsafeBehaviorCounts = useMemo(() => {
    const behaviors: string[] = [];
    for (const r of reportDetails || []) {
      for (const b of r.unsafe_behaviors || []) {
        behaviors.push(b.behavior || "Unknown");
      }
    }
    return toSortedCounts(behaviors);
  }, [reportDetails]);

  const pendingReviewsCount = useMemo(() => {
    return (complianceActions?.actions || []).filter((a) =>
      isOpenComplianceActionStatus(a.status),
    ).length;
  }, [complianceActions?.actions]);

  const injuryWindow = useMemo(() => {
    const now = new Date();
    const start =
      injuryPeriod === "weekly"
        ? subDays(startOfDay(now), 6)
        : injuryPeriod === "monthly"
          ? subDays(startOfDay(now), 29)
          : startOfMonth(subMonths(now, 11));
    return { start, now };
  }, [injuryPeriod]);

  const injuryReportsInRange = useMemo(() => {
    const getDate = (r: SHEReport) => {
      const raw = r.created_at || r.report_header?.report_date || "";
      const d = new Date(raw);
      return Number.isFinite(d.getTime()) ? d : null;
    };

    return (reportDetails || []).filter((r) => {
      const d = getDate(r);
      return !!d && d >= injuryWindow.start && d <= injuryWindow.now;
    });
  }, [injuryWindow.now, injuryWindow.start, reportDetails]);

  const injuryStats = useMemo(() => {
    const peopleInjured = injuryReportsInRange.reduce(
      (sum, r) => sum + (r.summary?.worker_count ?? 0),
      0,
    );
    const incidents = injuryReportsInRange.length;
    const highRisk = injuryReportsInRange.filter(
      (r) =>
        r.summary?.overall_risk_level === "high" ||
        r.summary?.overall_risk_level === "critical",
    ).length;

    return { peopleInjured, incidents, highRisk };
  }, [injuryReportsInRange]);

  const injuryTrendData = useMemo(() => {
    const { start, now } = injuryWindow;
    const isYearly = injuryPeriod === "yearly";
    const keyForBucket = (d: Date) =>
      format(isYearly ? startOfMonth(d) : startOfDay(d), isYearly ? "MMM" : "MMM d");

    const counts: Record<string, { incidents: number; injured: number }> = {};
    for (const r of injuryReportsInRange) {
      const raw = r.created_at || r.report_header?.report_date || "";
      const d = new Date(raw);
      if (!Number.isFinite(d.getTime())) continue;
      const key = keyForBucket(d);
      if (!counts[key]) counts[key] = { incidents: 0, injured: 0 };
      counts[key].incidents += 1;
      counts[key].injured += r.summary?.worker_count ?? 0;
    }

    if (injuryPeriod === "weekly") {
      return Array.from({ length: 7 }).map((_, idx) => {
        const day = addDays(start, idx);
        const key = format(day, "MMM d");
        return {
          name: key,
          incidents: counts[key]?.incidents || 0,
          injured: counts[key]?.injured || 0,
        };
      });
    }

    if (injuryPeriod === "monthly") {
      return Array.from({ length: 30 }).map((_, idx) => {
        const day = addDays(start, idx);
        const key = format(day, "MMM d");
        return {
          name: key,
          incidents: counts[key]?.incidents || 0,
          injured: counts[key]?.injured || 0,
        };
      });
    }

    const startMonth = startOfMonth(subMonths(now, 11));
    return Array.from({ length: 12 }).map((_, idx) => {
      const m = addMonths(startMonth, idx);
      const key = format(m, "MMM");
      return {
        name: key,
        incidents: counts[key]?.incidents || 0,
        injured: counts[key]?.injured || 0,
      };
    });
  }, [injuryPeriod, injuryReportsInRange, injuryWindow]);

  const mlChartData = useMemo(() => {
    const output = mlData?.ml_output;
    if (!output) return [];
    return Object.entries(output)
      .map(([hazard, info]) => ({
        hazard,
        probability: Number(info?.probability ?? 0),
      }))
      .sort((a, b) => b.probability - a.probability);
  }, [mlData?.ml_output]);

  const analyticsDeptLabel = useMemo(() => {
    if (isSafetyDept) {
      if (deptKeyForAnalytics === "all") return "All Departments";
      return departments?.[deptKeyForAnalytics]?.label || deptKeyForAnalytics;
    }
    return departments?.[userDeptKey]?.label || userDepartment;
  }, [departments, deptKeyForAnalytics, isSafetyDept, userDepartment, userDeptKey]);

  const handleExportCSV = () => {
    const rows: string[][] = [];
    rows.push(["Analytics Export"]);
    rows.push(["Department", analyticsDeptLabel]);
    rows.push(["Total Reports", String(reportsResponse?.total ?? 0)]);
    rows.push(["Workers (sum)", String(workersTotal)]);
    rows.push([]);

    rows.push(["Incident Types"]);
    rows.push(["Incident Type", "Count"]);
    for (const it of incidentTypeCounts) rows.push([it.name, String(it.count)]);
    rows.push([]);

    rows.push(["Root Cause Analysis (Unsafe Behaviors)"]);
    rows.push(["Unsafe Behavior", "Count"]);
    for (const ub of unsafeBehaviorCounts) rows.push([ub.name, String(ub.count)]);

    const csv = rows
      .map((r) =>
        r.map((f) => `"${String(f).replaceAll('"', '""')}"`).join(","),
      )
      .join("\n");

    triggerDownload(
      new Blob([csv], { type: "text/csv;charset=utf-8;" }),
      "analytics_export.csv",
    );
    toast({ title: "Export Complete", description: "Downloaded analytics_export.csv" });
  };

  const handleExportJSON = () => {
    const payload = {
      generated_at: new Date().toISOString(),
      department: {
        key: deptKeyForAnalytics,
        label: analyticsDeptLabel,
      },
      totals: {
        reports: reportsResponse?.total ?? 0,
        workers_sum: workersTotal,
      },
      incident_types: incidentTypeCounts,
      unsafe_behaviors: unsafeBehaviorCounts,
      ml:
        deptKeyForAnalytics === "all"
          ? mlDataAll || null
          : mlData || null,
    };

    triggerDownload(
      new Blob([JSON.stringify(payload, null, 2)], {
        type: "application/json;charset=utf-8;",
      }),
      "analytics_export.json",
    );
    toast({
      title: "Export Complete",
      description: "Downloaded analytics_export.json",
    });
  };

  const handleExportExcel = async () => {
    try {
      const XLSX = await import("xlsx");
      const wb = XLSX.utils.book_new();

      const summarySheet = XLSX.utils.aoa_to_sheet([
        ["Department", analyticsDeptLabel],
        ["Total Reports", reportsResponse?.total ?? 0],
        ["Workers (sum)", workersTotal],
      ]);
      XLSX.utils.book_append_sheet(wb, summarySheet, "Summary");

      const incidentTypesSheet = XLSX.utils.aoa_to_sheet([
        ["Incident Type", "Count"],
        ...incidentTypeCounts.map((r) => [r.name, r.count]),
      ]);
      XLSX.utils.book_append_sheet(wb, incidentTypesSheet, "Incident Types");

      const rootCauseSheet = XLSX.utils.aoa_to_sheet([
        ["Unsafe Behavior", "Count"],
        ...unsafeBehaviorCounts.map((r) => [r.name, r.count]),
      ]);
      XLSX.utils.book_append_sheet(wb, rootCauseSheet, "Root Causes");

      const buffer = XLSX.write(wb, { type: "array", bookType: "xlsx" });
      triggerDownload(
        new Blob([buffer], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }),
        "analytics_export.xlsx",
      );
      toast({
        title: "Export Complete",
        description: "Downloaded analytics_export.xlsx",
      });
    } catch (err) {
      console.error("Excel export failed:", err);
      toast({
        title: "Export Failed",
        description: "Excel export failed. Try CSV instead.",
        variant: "destructive",
      });
    }
  };

  const handleExportPDF = async () => {
    try {
      const { jsPDF } = await import("jspdf");
      const autoTable = (await import("jspdf-autotable")).default;

      const doc = new jsPDF();
      const getLastTableY = () =>
        Number((doc as any).lastAutoTable?.finalY ?? 46);
      const addWrappedText = (text: string, x: number, y: number) => {
        const lines = doc.splitTextToSize(text, 180);
        doc.text(lines, x, y);
        return y + lines.length * 5;
      };
      const buildMlRows = (output: DepartmentMlData["ml_output"]) => {
        if (!output) return [] as string[][];
        const lines = buildMlDisplayLines(output);
        return lines.map((row) => [
          row.hazard,
          `${row.probability.toFixed(1)}%`,
          String(output?.[row.hazard]?.prevention ?? ""),
        ]);
      };

      doc.setFontSize(16);
      doc.text("Analytics Export", 14, 18);
      doc.setFontSize(10);
      doc.text(`Department: ${analyticsDeptLabel}`, 14, 26);
      doc.text(`Total Reports: ${reportsResponse?.total ?? 0}`, 14, 32);
      doc.text(`Workers (sum): ${workersTotal}`, 14, 38);

      autoTable(doc, {
        startY: 46,
        head: [["Incident Type", "Count"]],
        body: incidentTypeCounts.map((r) => [r.name, String(r.count)]),
      });

      autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 8,
        head: [["Unsafe Behavior", "Count"]],
        body: unsafeBehaviorCounts.map((r) => [r.name, String(r.count)]),
      });

      // Predictive Insights (ML)
      let y = getLastTableY() + 12;
      doc.setFontSize(12);
      doc.text("Predictive Insights (ML)", 14, y);
      y += 6;

      if (deptKeyForAnalytics === "all") {
        if (isLoadingMlAll) {
          doc.setFontSize(10);
          y = addWrappedText("ML data is still loading.", 14, y) + 2;
        } else {
          const keys: Array<Exclude<DepartmentKey, "all">> = [
            "field",
            "hr",
            "quality",
            "environmental",
          ];

          for (const key of keys) {
            const label = departments?.[key]?.label || key;
            const data = mlDataAll?.[key];
            doc.setFontSize(11);
            doc.text(label, 14, y);
            y += 4;

            if (data?.ml_output) {
              autoTable(doc, {
                startY: y + 2,
                head: [["Hazard", "Probability", "Prevention"]],
                body: buildMlRows(data.ml_output),
                styles: { fontSize: 9 },
                headStyles: { fillColor: [37, 99, 235] },
                columnStyles: { 2: { cellWidth: 90 } },
              });
              y = getLastTableY() + 10;
            } else {
              doc.setFontSize(10);
              const msg =
                data?.message ||
                "No ML data yet. ML will auto-generate once reports are available.";
              y = addWrappedText(msg, 14, y + 4) + 8;
            }
          }
        }
      } else if (isLoadingMl) {
        doc.setFontSize(10);
        y = addWrappedText("ML data is still loading.", 14, y) + 2;
      } else if (isMlError) {
        doc.setFontSize(10);
        const msg =
          mlError instanceof Error ? mlError.message : "Failed to load ML data";
        y = addWrappedText(msg, 14, y) + 2;
      } else if (mlData?.ml_output) {
        autoTable(doc, {
          startY: y,
          head: [["Hazard", "Probability", "Prevention"]],
          body: buildMlRows(mlData.ml_output),
          styles: { fontSize: 9 },
          headStyles: { fillColor: [245, 158, 11] },
          columnStyles: { 2: { cellWidth: 90 } },
        });
        y = getLastTableY() + 8;
      } else {
        doc.setFontSize(10);
        const msg =
          mlData?.message ||
          "No ML data yet. ML will auto-generate once reports are available.";
        y = addWrappedText(msg, 14, y) + 2;
      }

      doc.save("analytics_export.pdf");
      toast({ title: "Export Complete", description: "Downloaded analytics_export.pdf" });
    } catch (err) {
      console.error("PDF export failed:", err);
      toast({
        title: "Export Failed",
        description: "PDF export failed. Try CSV instead.",
        variant: "destructive",
      });
    }
  };

  const mlDisplayLines = useMemo(() => {
    return buildMlDisplayLines(mlData?.ml_output || null);
  }, [mlData?.ml_output]);

  if (isLoadingReports || isLoadingDetails) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (isReportsError) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="bg-white rounded-xl shadow-sm border border-gray-200">
          <CardContent className="p-6 text-center text-sm text-gray-600">
            Failed to load analytics. Make sure the API is running on{" "}
            <span className="font-semibold">https://worksafer-backend-production.up.railway.app</span>.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
          <p className="text-gray-600 mt-2">
            Injury, incident types, root causes, and predictive insights for{" "}
            {analyticsDeptLabel}
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {isSafetyDept ? (
            <div className="min-w-[220px]">
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Department View
              </label>
              <select
                value={selectedDeptKey}
                onChange={(e) =>
                  setSelectedDeptKey(e.target.value as DepartmentKey)
                }
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
              >
                <option value="all">All Departments</option>
                {departments
                  ? Object.entries(departments).map(([key, cfg]) => (
                      <option key={key} value={key}>
                        {cfg.label}
                      </option>
                    ))
                  : null}
              </select>
            </div>
          ) : null}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="flex items-center">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleExportCSV}>
                Export CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportJSON}>
                Export JSON
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportExcel}>
                Export Excel
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportPDF}>
                Export PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <MetricCard
          title="Workers (sum)"
          value={workersTotal}
          change="From report summary"
          changeType="neutral"
          icon={Users}
          iconColor="primary"
        />
        <MetricCard
          title="Total Reports"
          value={reportsResponse?.total || 0}
          change="From reports"
          changeType="neutral"
          icon={AlertTriangle}
          iconColor="destructive"
        />
        <MetricCard
          title="Incident Types"
          value={incidentTypeCounts.length}
          change="Distinct types"
          changeType="neutral"
          icon={BarChart3}
          iconColor="success"
        />
        <MetricCard
          title="Unsafe Behaviors"
          value={unsafeBehaviorCounts.reduce((s, r) => s + r.count, 0)}
          change="Occurrences"
          changeType="neutral"
          icon={Brain}
          iconColor="warning"
        />
      </div>

      {/* Graphs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <Card className="bg-white rounded-xl shadow-sm border border-gray-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-lg font-semibold text-gray-900">
              Injury Statistics
            </CardTitle>
            <select
              value={injuryPeriod}
              onChange={(e) => setInjuryPeriod(e.target.value as InjuryPeriod)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
            >
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </CardHeader>
          <CardContent>
            <div className="space-y-5">
              <div className="rounded-lg border border-red-100 bg-red-50 p-4">
                <div className="text-sm font-semibold text-red-700">
                  People Injured
                </div>
                <div className="text-3xl font-bold text-red-700 mt-1">
                  {injuryStats.peopleInjured}
                </div>
                <div className="text-xs text-gray-600 mt-1">
                  {injuryPeriod === "weekly"
                    ? "Last 7 days"
                    : injuryPeriod === "monthly"
                      ? "Last 30 days"
                      : "Last 12 months"}
                </div>
              </div>

              <div className="text-sm text-gray-700 space-y-2">
                <div className="flex items-center justify-between">
                  <span>Total Incidents</span>
                  <span className="font-semibold">{injuryStats.incidents}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>High Risk</span>
                  <span className="font-semibold">{injuryStats.highRisk}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Pending Reviews</span>
                  <span className="font-semibold">{pendingReviewsCount}</span>
                </div>
              </div>

              <div className="w-full h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={injuryTrendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="incidents"
                      name="Incidents"
                      stroke="#2563EB"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="injured"
                      name="People Injured"
                      stroke="#EF4444"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white rounded-xl shadow-sm border border-gray-200">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">
              Predictive Insights (ML)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {deptKeyForAnalytics === "all" ? (
              isLoadingMlAll ? (
                <p className="text-sm text-gray-600">Loading ML data...</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(
                    ["field", "hr", "quality", "environmental"] as Array<
                      Exclude<DepartmentKey, "all">
                    >
                  ).map((key) => {
                    const label = departments?.[key]?.label || key;
                    const data = mlDataAll?.[key];
                    const lines = buildMlDisplayLines(data?.ml_output || null);

                    return (
                      <div
                        key={key}
                        className="border border-gray-200 rounded-lg p-4"
                      >
                        <div className="text-sm font-semibold text-gray-900 mb-3">
                          {label}
                        </div>
                        {data?.ml_output ? (
                          <div className="rounded-lg bg-slate-950 text-slate-100 font-mono text-sm p-3 border border-slate-800">
                            {lines.map((row) => (
                              <div key={row.hazard} className="leading-6">
                                {row.hazard}: {row.probability.toFixed(1)}%
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-600">
                            {data?.message ||
                              "No ML data yet. ML will auto-generate once reports are available."}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )
            ) : isLoadingMl ? (
              <p className="text-sm text-gray-600">Loading ML data...</p>
            ) : isMlError ? (
              <p className="text-sm text-gray-600">
                {mlError instanceof Error ? mlError.message : "Failed to load ML data"}
              </p>
            ) : mlData?.ml_output ? (
              <div className="space-y-4">
                <div className="w-full h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={mlChartData}
                      layout="vertical"
                      margin={{ top: 10, right: 20, left: 40, bottom: 10 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" domain={[0, 100]} />
                      <YAxis
                        dataKey="hazard"
                        type="category"
                        width={160}
                        tick={{ fontSize: 12 }}
                      />
                      <Tooltip />
                      <Bar dataKey="probability" fill="#F59E0B" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="rounded-lg bg-slate-950 text-slate-100 font-mono text-sm p-4 border border-slate-800">
                  {mlDisplayLines.map((row) => (
                    <div key={row.hazard} className="leading-6">
                      {row.hazard}: {row.probability.toFixed(1)}%
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-600">
                {mlData?.message ||
                  "No ML data yet. ML will auto-generate once reports are available."}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Incident Types + Root Cause */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="bg-white rounded-xl shadow-sm border border-gray-200">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">
              Incident Types (from Reports)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {incidentTypeCounts.length === 0 ? (
              <p className="text-sm text-gray-600">No data yet.</p>
            ) : (
              <div className="space-y-3">
                {incidentTypeCounts.slice(0, 10).map((row) => (
                  <div
                    key={row.name}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <span className="text-sm font-medium text-gray-800">
                      {row.name}
                    </span>
                    <span className="text-sm font-semibold text-gray-900">
                      {row.count}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-white rounded-xl shadow-sm border border-gray-200">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">
              Root Cause Analysis (Unsafe Behaviors)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {unsafeBehaviorCounts.length === 0 ? (
              <p className="text-sm text-gray-600">No data yet.</p>
            ) : (
              <div className="space-y-3">
                {unsafeBehaviorCounts.slice(0, 10).map((row) => (
                  <div
                    key={row.name}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <span className="text-sm font-medium text-gray-800">
                      {row.name}
                    </span>
                    <span className="text-sm font-semibold text-gray-900">
                      {row.count}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
