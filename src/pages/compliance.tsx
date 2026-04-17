import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { MetricCard } from "../components/ui/metric-card";
import { Textarea } from "../components/ui/textarea";
import {
  ClipboardCheck,
  Shield,
  HardHat,
  Leaf,
  Users,
  AlertTriangle,
  TrendingUp,
  RefreshCcw,
  BookOpen,
  Loader2,
  Download,
  FileText,
  FileSpreadsheet,
  FileJson,
  CheckCircle,
  Clock,
  Send,
  Scale,
  ChevronDown,
  ChevronRight,
  Camera,
  XCircle,
} from "lucide-react";
import { Button } from "../components/ui/button";
import type {
  SHEComplianceSummary,
  SHEDepartmentCompliance,
  SHEComplianceAction,
  SHEHIRACDistribution,
} from "../components/lib/she-api-types";
import {
  fetchComplianceSummary,
  fetchComplianceActions,
  submitComplianceAction,
  reviewComplianceAction,
  approveComplianceAction,
} from "../components/lib/she-api";
import { getStoredUser } from "../utils/user";
import {
  isSafetyDepartmentAccount,
  resolveDepartmentKey,
} from "../utils/department";
import { normalizeComplianceActionStatus } from "../utils/compliance";

// ── Risk level config — 5 levels aligned to OSHE HIRAC Worksheet ─────
const RISK_LEVEL_CONFIG: Record<
  string,
  { label: string; hirac: string; badge: string; dot: string }
> = {
  critical: {
    label: "Critical",
    hirac: "Highly Unacceptable",
    badge: "bg-red-100 text-red-800",
    dot: "bg-red-500",
  },
  high: {
    label: "High",
    hirac: "Highly Unacceptable",
    badge: "bg-orange-100 text-orange-800",
    dot: "bg-orange-500",
  },
  medium: {
    label: "Medium",
    hirac: "Moderately Unacceptable",
    badge: "bg-yellow-100 text-yellow-800",
    dot: "bg-yellow-500",
  },
  low: {
    label: "Low",
    hirac: "Low / Relatively Acceptable",
    badge: "bg-blue-100 text-blue-800",
    dot: "bg-blue-400",
  },
  safe: {
    label: "Safe",
    hirac: "Safe",
    badge: "bg-green-100 text-green-800",
    dot: "bg-green-500",
  },
};

const DEPT_LABEL_TO_KEY: Record<string, string> = {
  "Field Operations Group": "field",
  "Quality Control": "quality",
  Environmental: "environmental",
  "Human Resources": "hr",
};

const DEPT_NAME_TO_KEY: Record<string, string> = {
  "Field Operations Group": "field",
  "Quality Control": "quality",
  Environmental: "environmental",
  "Human Resources": "hr",
  "Quality Control Department": "quality",
  "Environmental Department": "environmental",
  "Human Resources Department": "hr",
};

export default function Compliance() {
  const queryClient = useQueryClient();
  const user = getStoredUser();
  const userDepartment = user?.department || "Safety Department";
  const userName = user?.name || user?.fullName || user?.email || "Unknown";
  const isSafetyDept = isSafetyDepartmentAccount({
    department: userDepartment,
    role: typeof user?.role === "string" ? user.role : "",
  });

  const deptKey = isSafetyDept
    ? undefined
    : resolveDepartmentKey(userDepartment, DEPT_LABEL_TO_KEY);
  const canLoadCompliance = isSafetyDept || !!deptKey;

  const {
    data: compliance,
    isLoading,
    isError,
    refetch,
  } = useQuery<SHEComplianceSummary>({
    enabled: canLoadCompliance,
    queryKey: ["she-compliance", deptKey || "unknown"],
    queryFn: () => fetchComplianceSummary(deptKey || undefined),
  });

  const { data: actionsData, refetch: refetchActions } = useQuery({
    enabled: canLoadCompliance,
    queryKey: ["compliance-actions", deptKey || "unknown"],
    queryFn: () =>
      fetchComplianceActions(deptKey ? { department: deptKey } : undefined),
  });

  const actions: SHEComplianceAction[] = actionsData?.actions || [];

  if (!canLoadCompliance) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardContent className="p-12 text-center">
            <AlertTriangle className="mx-auto h-12 w-12 text-yellow-500 mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Department not set
            </h2>
            <p className="text-gray-600">
              Please update your profile department (e.g., "HR Department",
              "Quality Control", "Environmental", "Field Operations").
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mr-3" />
          <span className="text-gray-600">Loading compliance data...</span>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardContent className="p-12 text-center">
            <AlertTriangle className="mx-auto h-12 w-12 text-red-400 mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Failed to Load Compliance Data
            </h2>
            <p className="text-gray-600 mb-4">
              Make sure the SHE Analysis API is running on port 8000.
            </p>
            <Button onClick={() => refetch()}>
              <RefreshCcw className="mr-2 h-4 w-4" /> Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const departments = compliance?.departments || [];
  const totalReports = compliance?.total_reports || 0;

  if (totalReports === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            {isSafetyDept ? "All Departments" : userDepartment} Compliance
          </h1>
          <p className="text-gray-600 mt-2">
            AI-derived compliance metrics from SHE incident reports
          </p>
        </div>
        <Card>
          <CardContent className="p-12 text-center">
            <ClipboardCheck className="mx-auto h-12 w-12 text-gray-300 mb-4" />
            <h2 className="text-lg font-medium text-gray-700 mb-1">
              No Compliance Data Yet
            </h2>
            <p className="text-sm text-gray-500">
              Compliance scores will be generated automatically from SHE
              incident reports. File an incident report to get started.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleRefreshAll = () => {
    refetch();
    refetchActions();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {isSafetyDept ? "All Departments" : userDepartment} Compliance
          </h1>
          <p className="text-gray-600 mt-2">
            AI-derived compliance metrics from {totalReports} SHE report
            {totalReports !== 1 ? "s" : ""}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Based on OSHE HIRAC Worksheet &amp; HAZARD AUDIT INSPECTION
            CHECKLIST (Taglish Rev04)
          </p>
        </div>
        <div className="flex items-center gap-2">
          {compliance && <ExportDropdown compliance={compliance} />}
          <Button variant="outline" onClick={handleRefreshAll}>
            <RefreshCcw className="mr-2 h-4 w-4" /> Refresh
          </Button>
        </div>
      </div>

      {/* HIRAC Risk Level Legend */}
      <Card className="mb-6 bg-gray-50 border-gray-200">
        <CardContent className="p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
            HIRAC Risk Level Reference
          </p>
          <div className="flex flex-wrap gap-3">
            {Object.entries(RISK_LEVEL_CONFIG).map(([key, cfg]) => (
              <div key={key} className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${cfg.dot}`} />
                <span className="text-xs font-medium text-gray-700">
                  {cfg.label}
                </span>
                <span className="text-xs text-gray-400">— {cfg.hirac}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Overall Metrics */}
      {isSafetyDept && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <MetricCard
            title="Overall PPE Compliance"
            value={`${compliance?.overall_ppe_compliance ?? 0}%`}
            icon={HardHat}
            iconColor={
              (compliance?.overall_ppe_compliance ?? 0) >= 80
                ? "success"
                : "warning"
            }
          />
          <MetricCard
            title="Overall Safety Rate"
            value={`${compliance?.overall_safety_rate ?? 0}%`}
            icon={Shield}
            iconColor={
              (compliance?.overall_safety_rate ?? 0) >= 80
                ? "success"
                : "warning"
            }
          />
          <MetricCard
            title="Total Reports Analyzed"
            value={totalReports}
            icon={ClipboardCheck}
            iconColor="success"
          />
        </div>
      )}

      {/* Department Cards */}
      <div className="space-y-6">
        {departments.map((dept) => {
          const deptActionKey =
            DEPT_NAME_TO_KEY[dept.department] ?? dept.department;
          const deptActions = actions.filter(
            (a) => a.department === deptActionKey,
          );
          return (
            <DepartmentComplianceCard
              key={dept.department}
              dept={dept}
              isSafetyDept={isSafetyDept}
              userDepartment={userDepartment}
              userName={userName}
              actions={deptActions}
              onActionSubmitted={() => refetchActions()}
              onActionApproved={() => refetchActions()}
            />
          );
        })}
      </div>
    </div>
  );
}

// ── Export Dropdown ──────────────────────────────────────────────────
function ExportDropdown({ compliance }: { compliance: SHEComplianceSummary }) {
  const [open, setOpen] = useState(false);
  const hasData = compliance?.departments?.length > 0;

  const exportCSV = () => {
    if (!hasData) {
      alert("No compliance data available to export.");
      setOpen(false);
      return;
    }
    const rows: string[][] = [
      [
        "Department",
        "HIRAC Status",
        "Overall %",
        "PPE %",
        "Environmental %",
        "Behavioral %",
        "Risk %",
        "Closure %",
        "Status",
        "Critical",
        "High",
        "Medium",
        "Low",
        "Safe",
        "Highly Unacceptable",
        "Moderately Unacceptable",
        "Low/Relatively Acceptable",
        "Reports",
      ],
    ];
    for (const dept of compliance.departments) {
      const s = dept.compliance_scores;
      const r = dept.risk_distribution;
      const h = dept.hirac_distribution as SHEHIRACDistribution | undefined;
      rows.push([
        dept.department,
        dept.hirac_status || "",
        String(s.overall),
        String(s.ppe_compliance),
        String(s.environmental_compliance),
        String(s.behavioral_compliance),
        String(s.risk_compliance),
        String(s.closure_rate),
        dept.status,
        String(r.critical),
        String(r.high),
        String(r.medium),
        String(r.low),
        String(r.safe),
        String(h?.highly_unacceptable ?? 0),
        String(h?.moderately_unacceptable ?? 0),
        String(h?.low_relatively_acceptable ?? 0),
        String(dept.total_reports),
      ]);
    }
    const csv = rows.map((r) => r.map((f) => `"${f}"`).join(",")).join("\n");
    triggerDownload(
      new Blob([csv], { type: "text/csv;charset=utf-8;" }),
      "compliance_summary.csv",
    );
    setOpen(false);
  };

  const exportJSON = () => {
    if (!hasData) {
      alert("No compliance data available to export.");
      setOpen(false);
      return;
    }
    triggerDownload(
      new Blob([JSON.stringify(compliance, null, 2)], {
        type: "application/json",
      }),
      "compliance_summary.json",
    );
    setOpen(false);
  };

  const exportExcel = async () => {
    if (!hasData) {
      alert("No compliance data available to export.");
      setOpen(false);
      return;
    }
    try {
      const XLSX = await import("xlsx");
      const sheetData = [
        [
          "Department",
          "HIRAC Status",
          "Overall %",
          "PPE %",
          "Env %",
          "Behavior %",
          "Risk %",
          "Closure %",
          "Status",
          "Critical",
          "High",
          "Medium",
          "Low",
          "Safe",
          "Reports",
        ],
        ...compliance.departments.map((dept) => {
          const s = dept.compliance_scores;
          const r = dept.risk_distribution;
          return [
            dept.department,
            dept.hirac_status || "",
            s.overall,
            s.ppe_compliance,
            s.environmental_compliance,
            s.behavioral_compliance,
            s.risk_compliance,
            s.closure_rate,
            dept.status,
            r.critical,
            r.high,
            r.medium,
            r.low,
            r.safe,
            dept.total_reports,
          ];
        }),
      ];
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(sheetData);
      ws["!cols"] = [
        { wch: 30 },
        { wch: 28 },
        { wch: 12 },
        { wch: 10 },
        { wch: 10 },
        { wch: 12 },
        { wch: 10 },
        { wch: 10 },
        { wch: 16 },
        { wch: 10 },
        { wch: 8 },
        { wch: 10 },
        { wch: 8 },
        { wch: 8 },
        { wch: 10 },
      ];
      XLSX.utils.book_append_sheet(wb, ws, "Compliance");
      const buffer = XLSX.write(wb, { type: "array", bookType: "xlsx" });
      triggerDownload(
        new Blob([buffer], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }),
        "compliance_summary.xlsx",
      );
    } catch (err) {
      console.error("Excel export failed:", err);
      alert("Excel export failed. Please try CSV instead.");
    }
    setOpen(false);
  };

  const exportPDF = async () => {
    if (!hasData) {
      alert("No compliance data available to export.");
      setOpen(false);
      return;
    }
    try {
      const { jsPDF } = await import("jspdf");
      const autoTable = (await import("jspdf-autotable")).default;
      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.setTextColor(0, 51, 102);
      doc.text("Compliance Summary Report", 14, 20);
      doc.setFontSize(9);
      doc.setTextColor(100);
      doc.text(
        "Based on: OSHE HIRAC Worksheet & HAZARD AUDIT INSPECTION CHECKLIST (Taglish Rev04)",
        14,
        27,
      );
      doc.text(
        `Total Reports: ${compliance.total_reports} | PPE: ${compliance.overall_ppe_compliance}% | Safety: ${compliance.overall_safety_rate}%`,
        14,
        33,
      );
      autoTable(doc, {
        startY: 40,
        head: [
          [
            "Department",
            "HIRAC Status",
            "Overall",
            "PPE",
            "Env",
            "Behavior",
            "Critical",
            "High",
            "Med",
            "Low",
            "Safe",
            "Status",
          ],
        ],
        body: compliance.departments.map((dept) => {
          const s = dept.compliance_scores;
          const r = dept.risk_distribution;
          return [
            dept.department,
            dept.hirac_status || "",
            `${s.overall}%`,
            `${s.ppe_compliance}%`,
            `${s.environmental_compliance}%`,
            `${s.behavioral_compliance}%`,
            r.critical,
            r.high,
            r.medium,
            r.low,
            r.safe,
            dept.status.replace(/_/g, " "),
          ];
        }),
        headStyles: { fillColor: [0, 51, 102], fontSize: 7 },
        styles: { fontSize: 6, cellPadding: 1.5 },
      });
      triggerDownload(doc.output("blob"), "compliance_summary.pdf");
    } catch (err) {
      console.error("PDF export failed:", err);
      alert("PDF export failed. Please try CSV instead.");
    }
    setOpen(false);
  };

  return (
    <div className="relative">
      <Button variant="outline" onClick={() => setOpen(!open)}>
        <Download className="mr-2 h-4 w-4" /> Export
      </Button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
            <button
              onClick={exportCSV}
              className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 rounded-t-lg"
            >
              <FileText className="h-4 w-4" /> Export as CSV
            </button>
            <button
              onClick={exportExcel}
              className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
            >
              <FileSpreadsheet className="h-4 w-4" /> Export as Excel
            </button>
            <button
              onClick={exportPDF}
              className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
            >
              <FileText className="h-4 w-4 text-red-500" /> Export as PDF
            </button>
            <button
              onClick={exportJSON}
              className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 rounded-b-lg"
            >
              <FileJson className="h-4 w-4" /> Export as JSON
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ── Department Compliance Card ────────────────────────────────────────
function DepartmentComplianceCard({
  dept,
  isSafetyDept,
  userDepartment,
  userName,
  actions,
  onActionSubmitted,
  onActionApproved,
}: {
  dept: SHEDepartmentCompliance;
  isSafetyDept: boolean;
  userDepartment: string;
  userName: string;
  actions: SHEComplianceAction[];
  onActionSubmitted: () => void;
  onActionApproved: () => void;
}) {
  const [showLegal, setShowLegal] = useState(false);
  const scores = dept.compliance_scores;
  const risk = dept.risk_distribution;
  const violations = dept.violation_counts;

  // ── FIX 1: Cast to proper type instead of "|| {}" which widens to {} ──
  const hiracDist = dept.hirac_distribution as SHEHIRACDistribution | undefined;
  const legalCompliance = dept.legal_compliance;

  const deptKey = DEPT_NAME_TO_KEY[dept.department] ?? dept.department;
  const userDeptKey = DEPT_LABEL_TO_KEY[userDepartment] ?? userDepartment;
  const isOwnDeptCard = !isSafetyDept && deptKey === userDeptKey;
  const showProvideAction = isOwnDeptCard;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "compliant":
        return "bg-green-100 text-green-800";
      case "needs_attention":
        return "bg-yellow-100 text-yellow-800";
      case "non_compliant":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "compliant":
        return "Compliant";
      case "needs_attention":
        return "Needs Attention";
      case "non_compliant":
        return "Non-Compliant";
      default:
        return status;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-700";
    if (score >= 60) return "text-yellow-700";
    return "text-red-700";
  };

  const getScoreBarColor = (score: number) => {
    if (score >= 80) return "bg-green-500";
    if (score >= 60) return "bg-yellow-500";
    return "bg-red-500";
  };

  const pendingActions = actions.filter(
    (a) => normalizeComplianceActionStatus(a.status) === "pending_review",
  );
  const reviewedActions = actions.filter(
    (a) => normalizeComplianceActionStatus(a.status) === "reviewed",
  );
  const resolvedActions = actions.filter(
    (a) => normalizeComplianceActionStatus(a.status) === "resolved",
  );
  const allActions = [
    ...pendingActions,
    ...reviewedActions,
    ...resolvedActions,
  ];

  return (
    <Card className="bg-white rounded-xl shadow-sm border border-gray-200">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold text-gray-900">
              {dept.department}
            </CardTitle>
            <p className="text-sm text-gray-500 mt-1">
              {dept.total_reports} report{dept.total_reports !== 1 ? "s" : ""}{" "}
              analyzed
              {dept.latest_report && (
                <>
                  {" "}
                  &middot; Latest:{" "}
                  {new Date(dept.latest_report).toLocaleDateString()}
                </>
              )}
            </p>
            {dept.hirac_status && (
              <p className="text-xs text-gray-400 mt-0.5">
                HIRAC:{" "}
                <span className="font-medium text-gray-600">
                  {dept.hirac_status}
                </span>
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-2xl font-bold text-gray-900">
                {scores.overall}%
              </p>
              <p className="text-xs text-gray-500">Overall</p>
            </div>
            <Badge className={getStatusColor(dept.status)}>
              {getStatusText(dept.status)}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Compliance Score Bars */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ScoreBar
            label="PPE Compliance"
            icon={<HardHat className="h-4 w-4" />}
            score={scores.ppe_compliance}
            getScoreColor={getScoreColor}
            getScoreBarColor={getScoreBarColor}
          />
          <ScoreBar
            label="Environmental Compliance"
            icon={<Leaf className="h-4 w-4" />}
            score={scores.environmental_compliance}
            getScoreColor={getScoreColor}
            getScoreBarColor={getScoreBarColor}
          />
          <ScoreBar
            label="Behavioral Safety"
            icon={<Users className="h-4 w-4" />}
            score={scores.behavioral_compliance}
            getScoreColor={getScoreColor}
            getScoreBarColor={getScoreBarColor}
          />
          <ScoreBar
            label="Risk Compliance"
            icon={<Shield className="h-4 w-4" />}
            score={scores.risk_compliance}
            getScoreColor={getScoreColor}
            getScoreBarColor={getScoreBarColor}
          />
        </div>

        {/* 5-Level Risk Distribution + HIRAC groupings */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 5-Level Risk Distribution */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" /> Risk Distribution
            </h4>
            <div className="space-y-2">
              {(["critical", "high", "medium", "low", "safe"] as const).map(
                (level) => {
                  const cfg = RISK_LEVEL_CONFIG[level];
                  // ── FIX 2: "as unknown as" double cast — required by TS
                  //    because SHERiskDistribution is a typed interface,
                  //    not a plain Record<string,number> ──────────────────
                  const count =
                    (risk as unknown as Record<string, number>)[level] ?? 0;
                  return (
                    <div
                      key={level}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                        <span className="text-sm text-gray-600">
                          {cfg.label}
                        </span>
                        <span className="text-xs text-gray-400">
                          ({cfg.hirac})
                        </span>
                      </div>
                      <Badge className={cfg.badge}>{count}</Badge>
                    </div>
                  );
                },
              )}
            </div>
          </div>

          {/* HIRAC Groupings + Violation Counts */}
          <div className="space-y-4">
            {/* HIRAC Summary — FIX 3: use hiracDist? (optional) not Object.keys check */}
            {hiracDist && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-700 mb-3">
                  HIRAC Classification
                </h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-red-700 font-medium">
                      Highly Unacceptable
                    </span>
                    <Badge className="bg-red-100 text-red-800">
                      {hiracDist.highly_unacceptable ?? 0}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-yellow-700 font-medium">
                      Moderately Unacceptable
                    </span>
                    <Badge className="bg-yellow-100 text-yellow-800">
                      {hiracDist.moderately_unacceptable ?? 0}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-green-700 font-medium">
                      Low / Relatively Acceptable
                    </span>
                    <Badge className="bg-green-100 text-green-800">
                      {hiracDist.low_relatively_acceptable ?? 0}
                    </Badge>
                  </div>
                </div>
              </div>
            )}

            {/* Violation Counts */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                <TrendingUp className="h-4 w-4" /> Total Violations Found
              </h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">PPE Violations</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {violations.ppe_violations}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">
                    Environmental Hazards
                  </span>
                  <span className="text-sm font-semibold text-gray-900">
                    {violations.environmental_hazards}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">
                    Unsafe Behaviors
                  </span>
                  <span className="text-sm font-semibold text-gray-900">
                    {violations.unsafe_behaviors}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Closure Rate */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-gray-700">
              Report Closure Rate
            </h4>
            <span
              className={`text-sm font-semibold ${getScoreColor(scores.closure_rate)}`}
            >
              {scores.closure_rate}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full ${getScoreBarColor(scores.closure_rate)}`}
              style={{ width: `${Math.min(scores.closure_rate, 100)}%` }}
            />
          </div>
        </div>

        {/* Legal Compliance Section */}
        {legalCompliance && (
          <div className="border border-amber-200 rounded-lg overflow-hidden">
            <button
              onClick={() => setShowLegal(!showLegal)}
              className="w-full flex items-center justify-between px-4 py-3 bg-amber-50 hover:bg-amber-100 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Scale className="h-4 w-4 text-amber-700" />
                <span className="text-sm font-medium text-amber-800">
                  Legal Compliance Obligations
                </span>
                {legalCompliance.total_unique_laws_violated > 0 && (
                  <Badge className="bg-amber-200 text-amber-900 text-xs">
                    {legalCompliance.total_unique_laws_violated} law
                    {legalCompliance.total_unique_laws_violated !== 1
                      ? "s"
                      : ""}{" "}
                    triggered
                  </Badge>
                )}
              </div>
              {showLegal ? (
                <ChevronDown className="h-4 w-4 text-amber-700" />
              ) : (
                <ChevronRight className="h-4 w-4 text-amber-700" />
              )}
            </button>

            {showLegal && (
              <div className="p-4 bg-white space-y-4">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Primary Applicable Legislation
                  </p>
                  <ul className="space-y-1">
                    {(legalCompliance.primary_applicable_laws || []).map(
                      (law: string, i: number) => (
                        <li
                          key={i}
                          className="text-xs text-gray-700 flex items-start gap-2"
                        >
                          <span className="mt-1 w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                          {law}
                        </li>
                      ),
                    )}
                  </ul>
                </div>

                {(legalCompliance.violated_laws || []).length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-2">
                      Laws / Regulations Triggered by Findings
                    </p>
                    <ul className="space-y-1 max-h-48 overflow-y-auto">
                      {(legalCompliance.violated_laws || []).map(
                        (law: string, i: number) => (
                          <li
                            key={i}
                            className="text-xs text-gray-700 flex items-start gap-2"
                          >
                            <span className="mt-1 w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
                            {law}
                          </li>
                        ),
                      )}
                    </ul>
                  </div>
                )}

                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Reporting Requirements
                  </p>
                  <ul className="space-y-1">
                    {(legalCompliance.reporting_requirements || []).map(
                      (req: string, i: number) => (
                        <li
                          key={i}
                          className="text-xs text-gray-700 flex items-start gap-2"
                        >
                          <span className="mt-1 w-1.5 h-1.5 rounded-full bg-orange-400 flex-shrink-0" />
                          {req}
                        </li>
                      ),
                    )}
                  </ul>
                </div>

                <p className="text-xs text-gray-400 italic">
                  Source: OSHE HIRAC Worksheet — Compliance Obligations Column
                  (HAZ-001 to HAZ-134)
                </p>
              </div>
            )}
          </div>
        )}

        {/* Training Required */}
        {dept.training_required.length > 0 && (
          <div className="bg-blue-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-800 mb-2 flex items-center gap-2">
              <BookOpen className="h-4 w-4" /> AI-Recommended Training
            </h4>
            <ul className="space-y-1">
              {dept.training_required.map((item, i) => (
                <li
                  key={i}
                  className="text-sm text-blue-700 flex items-start gap-2"
                >
                  <span className="mt-1 w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Submitted Actions */}
        {allActions.length > 0 && (
          <div className="border-t pt-4">
            <h4 className="text-sm font-medium text-gray-900 mb-3">
              Submitted Actions
              {isSafetyDept && pendingActions.length > 0 && (
                <span className="ml-2 inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                  {pendingActions.length} pending review
                </span>
              )}
            </h4>
            <div className="space-y-3">
              {allActions.map((action) => (
                <ActionItem
                  key={action.id}
                  action={action}
                  isSafetyDept={isSafetyDept}
                  userName={userName}
                  onApproved={onActionApproved}
                />
              ))}
            </div>
          </div>
        )}

        {isSafetyDept &&
          allActions.length > 0 &&
          pendingActions.length === 0 &&
          reviewedActions.length === 0 && (
            <p className="text-sm text-gray-500 italic text-center py-2">
              All actions have been reviewed and resolved.
            </p>
          )}

        {showProvideAction && (
          <ProvideActionForm
            department={resolveDepartmentKey(userDepartment, DEPT_LABEL_TO_KEY)}
            userName={userName}
            onSubmitted={onActionSubmitted}
          />
        )}
      </CardContent>
    </Card>
  );
}

// ── Action Item ──────────────────────────────────────────────────────
function ActionItem({
  action,
  isSafetyDept,
  userName,
  onApproved,
}: {
  action: SHEComplianceAction;
  isSafetyDept: boolean;
  userName: string;
  onApproved: () => void;
}) {
  const [reviewNotes, setReviewNotes] = useState("");
  const [showReview, setShowReview] = useState(false);
  const queryClient = useQueryClient();
  const normalizedStatus = normalizeComplianceActionStatus(action.status);

  const approveMutation = useMutation({
    mutationFn: () =>
      approveComplianceAction(action.id, { approved_by: userName }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["compliance-actions"] });
      onApproved();
    },
  });

  const reviewMutation = useMutation({
    mutationFn: () =>
      reviewComplianceAction(action.id, {
        reviewed_by: userName,
        review_notes: reviewNotes,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["compliance-actions"] });
      setShowReview(false);
      setReviewNotes("");
      onApproved();
    },
  });

  const riskCfg = RISK_LEVEL_CONFIG[action.risk_level || "medium"];

  const statusIcon: Record<string, React.ReactNode> = {
    pending_review: <Clock className="h-4 w-4 text-yellow-500" />,
    reviewed: <CheckCircle className="h-4 w-4 text-blue-500" />,
    resolved: <CheckCircle className="h-4 w-4 text-green-500" />,
  };
  const statusBadge: Record<string, string> = {
    pending_review: "bg-yellow-100 text-yellow-800",
    reviewed: "bg-blue-100 text-blue-800",
    resolved: "bg-green-100 text-green-800",
  };
  const statusLabel: Record<string, string> = {
    pending_review: "Pending Review",
    reviewed: "Reviewed",
    resolved: "Resolved",
  };

  return (
    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            {statusIcon[normalizedStatus] || (
              <Clock className="h-4 w-4 text-gray-400" />
            )}
            <Badge
              className={
                statusBadge[normalizedStatus] || "bg-gray-100 text-gray-700"
              }
            >
              {statusLabel[normalizedStatus] || action.status}
            </Badge>
            {riskCfg && (
              <Badge className={riskCfg.badge}>{riskCfg.label} Risk</Badge>
            )}
            <span className="text-xs text-gray-500">
              by {action.submitted_by}
            </span>
          </div>
          <p className="text-sm text-gray-800">{action.action_text}</p>
          {action.legal_basis && (
            <p className="text-xs text-amber-700 mt-1 flex items-center gap-1">
              <Scale className="h-3 w-3" /> {action.legal_basis}
            </p>
          )}
          <p className="text-xs text-gray-500 mt-1">
            Submitted: {new Date(action.submitted_at).toLocaleDateString()}{" "}
            {new Date(action.submitted_at).toLocaleTimeString()}
          </p>
          {action.reviewed_by && (
            <p className="text-xs text-gray-500 mt-1">
              Reviewed by: {action.reviewed_by}
              {action.review_notes && ` — "${action.review_notes}"`}
            </p>
          )}
          {action.approved_by && (
            <p className="text-xs text-green-600 mt-1">
              Approved by: {action.approved_by}
            </p>
          )}

          {/* Render proof_image if exists */}
          {action.proof_image?.thumbnail_url && (
            <div className="mt-3">
              <p className="text-xs font-medium text-gray-500 mb-1 flex items-center gap-1">
                <Camera className="h-3 w-3" /> Photo Proof
              </p>
              <img
                src={action.proof_image.thumbnail_url}
                alt={action.proof_image.filename || "Compliance Proof"}
                className="w-full max-w-sm rounded-lg border border-gray-200 cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => {
                  // simple window open to see full resolution image
                  if (action.proof_image?.data_url) {
                    const win = window.open();
                    win?.document.write(`<img src="${action.proof_image.data_url}" style="max-width: 100%; height: auto;" />`);
                  }
                }}
              />
            </div>
          )}
        </div>

        {isSafetyDept && normalizedStatus === "pending_review" && (
          <div className="flex-shrink-0">
            {!showReview ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowReview(true)}
              >
                Review
              </Button>
            ) : (
              <div className="space-y-2 w-64">
                <Textarea
                  placeholder="Review notes (optional)..."
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  className="text-sm"
                  rows={2}
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => reviewMutation.mutate()}
                    disabled={reviewMutation.isPending}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {reviewMutation.isPending ? (
                      <Loader2 className="h-3 w-3 animate-spin mr-1" />
                    ) : (
                      <CheckCircle className="h-3 w-3 mr-1" />
                    )}
                    Submit Review
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setShowReview(false);
                      setReviewNotes("");
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {isSafetyDept && normalizedStatus === "reviewed" && (
          <Button
            size="sm"
            onClick={() => approveMutation.mutate()}
            disabled={approveMutation.isPending}
            className="bg-green-600 hover:bg-green-700 text-white flex-shrink-0"
          >
            {approveMutation.isPending ? (
              <Loader2 className="h-3 w-3 animate-spin mr-1" />
            ) : (
              <CheckCircle className="h-3 w-3 mr-1" />
            )}
            Approve
          </Button>
        )}
      </div>
    </div>
  );
}

// ── Provide Action Form ──────────────────────────────────────────────
function ProvideActionForm({
  department,
  userName,
  onSubmitted,
}: {
  department: string;
  userName: string;
  onSubmitted: () => void;
}) {
  const [actionText, setActionText] = useState("");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const queryClient = useQueryClient();

  const submitMutation = useMutation({
    mutationFn: () =>
      submitComplianceAction({
        department,
        action_text: actionText,
        submitted_by: userName,
        file: selectedImage || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["compliance-actions"] });
      setActionText("");
      setSelectedImage(null);
      setImagePreview(null);
      setShowForm(false);
      setSuccessMsg(
        "Action submitted successfully and is pending review by the Safety Department.",
      );
      setTimeout(() => setSuccessMsg(""), 5000);
      onSubmitted();
    },
  });

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onload = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="border-t pt-4">
      {successMsg && (
        <div className="mb-3 flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-2">
          <CheckCircle className="h-4 w-4 flex-shrink-0" /> {successMsg}
        </div>
      )}
      {!showForm ? (
        <Button
          onClick={() => setShowForm(true)}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Send className="mr-2 h-4 w-4" /> Provide Action
        </Button>
      ) : (
        <>
          <h4 className="text-sm font-medium text-gray-900 mb-2">
            Provide Corrective Action
          </h4>
          <p className="text-xs text-gray-500 mb-3">
            Describe the corrective action your department will take to address
            the compliance findings. This will be sent to the Safety Department
            for review and approval.
          </p>
          <Textarea
            placeholder="Describe the corrective action to be taken..."
            value={actionText}
            onChange={(e) => setActionText(e.target.value)}
            className="mb-3"
            rows={3}
          />

          <div className="mb-4 text-left">
            {!imagePreview ? (
              <div>
                <input
                  type="file"
                  id="proof-upload"
                  className="hidden"
                  accept=".jpg,.jpeg,.png,.webp"
                  onChange={handleImageUpload}
                />
                <Button variant="outline" size="sm" asChild>
                  <label htmlFor="proof-upload" className="cursor-pointer">
                    <Camera className="mr-2 h-4 w-4" />
                    Attach Photo
                  </label>
                </Button>
              </div>
            ) : (
              <div className="relative inline-block">
                <img
                  src={imagePreview}
                  alt="Proof preview"
                  className="rounded-md border border-gray-200 h-24 object-contain"
                />
                <button
                  type="button"
                  onClick={() => {
                    setSelectedImage(null);
                    setImagePreview(null);
                  }}
                  className="absolute -top-2 -right-2 bg-white rounded-full text-red-500 hover:text-red-700 shadow"
                >
                  <XCircle className="h-5 w-5" />
                </button>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              onClick={() => submitMutation.mutate()}
              disabled={!actionText.trim() || submitMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {submitMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Submit Action
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setShowForm(false);
                setActionText("");
              }}
            >
              Cancel
            </Button>
          </div>
          {submitMutation.isError && (
            <p className="text-sm text-red-600 mt-2">
              Failed to submit: {(submitMutation.error as Error).message}
            </p>
          )}
        </>
      )}
    </div>
  );
}

// ── Score Bar ────────────────────────────────────────────────────────
function ScoreBar({
  label,
  icon,
  score,
  getScoreColor,
  getScoreBarColor,
}: {
  label: string;
  icon: React.ReactNode;
  score: number;
  getScoreColor: (s: number) => string;
  getScoreBarColor: (s: number) => string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm text-gray-600 flex items-center gap-1.5">
          {icon}
          {label}
        </span>
        <span className={`text-sm font-semibold ${getScoreColor(score)}`}>
          {score}%
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`h-2 rounded-full ${getScoreBarColor(score)}`}
          style={{ width: `${Math.min(score, 100)}%` }}
        />
      </div>
    </div>
  );
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  URL.revokeObjectURL(url);
  document.body.removeChild(a);
}
