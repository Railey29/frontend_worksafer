import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../components/ui/alert-dialog";
import { Textarea } from "../components/ui/textarea";
import { useToast } from "../hooks/use-toast";
import {
  ArrowLeft,
  Download,
  ChevronDown,
  Loader2,
  AlertTriangle,
  RefreshCcw,
  FileText,
  HardHat,
  Flame,
  Ban,
  ClipboardList,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Users,
  Brain,
  MapPin,
  Eye,
  ClipboardCheck,
  Wrench,
  Clock,
  Scale,
  ChevronRight,
  Camera,
} from "lucide-react";
import type { SHEReport, RiskLevel } from "../components/lib/she-api-types";
import {
  RISK_COLORS,
  SEVERITY_COLORS,
  WORKFLOW_STATUS_COLORS,
  PPE_LABELS,
} from "../components/lib/she-api-types";
import {
  fetchReportById,
  deleteReport,
  updateReportStatus,
} from "../components/lib/she-api";
import {
  downloadCSV,
  downloadExcel,
  downloadPDF,
  downloadJSON,
} from "../components/lib/she-export";
import { WorkflowStatusVisualization } from "../components/workflow-status-visualization";
import { getStoredUser } from "../utils/user";
import { isSafetyDepartmentAccount } from "../utils/department";

// ── 5-Level Risk Colors — aligned to OSHE HIRAC Worksheet ────────────
const RISK_LEVEL_COLORS: Record<
  string,
  { bg: string; text: string; border: string; hirac: string }
> = {
  critical: {
    bg: "bg-red-100",
    text: "text-red-800",
    border: "border-red-400",
    hirac: "Highly Unacceptable — Immediate Action Required",
  },
  high: {
    bg: "bg-orange-100",
    text: "text-orange-800",
    border: "border-orange-400",
    hirac: "Highly Unacceptable — Urgent Corrective Action Needed",
  },
  medium: {
    bg: "bg-yellow-100",
    text: "text-yellow-800",
    border: "border-yellow-400",
    hirac: "Moderately Unacceptable — Action Required",
  },
  low: {
    bg: "bg-blue-100",
    text: "text-blue-800",
    border: "border-blue-300",
    hirac: "Low / Relatively Acceptable — Monitor and Control",
  },
  safe: {
    bg: "bg-green-100",
    text: "text-green-800",
    border: "border-green-300",
    hirac: "Safe — No Significant Findings",
  },
};

export default function ReportDetail() {
  const params = useParams<{ id: string }>();
  const id = params.id || "";
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showLegal, setShowLegal] = useState(false);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [statusNotes, setStatusNotes] = useState("");

  const user = getStoredUser();
  const isSafetyDept = isSafetyDepartmentAccount({
    department: user?.department || "Safety Department",
    role: typeof user?.role === "string" ? user.role : "",
  });

  const {
    data: report,
    isLoading,
    isError,
    refetch,
  } = useQuery<SHEReport>({
    queryKey: ["she-report", id],
    queryFn: () => fetchReportById(id),
    enabled: !!id,
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteReport(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["she-reports"] });
      toast({ title: "Archived", description: "Report has been archived." });
      navigate("/reports");
    },
    onError: (error: Error) => {
      toast({
        title: "Archive Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: (params: { status: string; notes?: string }) =>
      updateReportStatus(id, {
        status: params.status as any,
        notes: params.notes,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["she-report", id] });
      queryClient.invalidateQueries({ queryKey: ["she-reports"] });

      toast({
        title: "✓ Status Updated",
        description: `Report status changed to ${selectedStatus.replace(/_/g, " ")}`,
      });

      setShowStatusDialog(false);
      setSelectedStatus("");
      setStatusNotes("");
    },
    onError: (error: Error) => {
      console.error("Status update error:", error);

      const isDeptMismatch =
        error.message.includes("DEPARTMENT_MISMATCH") ||
        error.message.toLowerCase().includes("assigned department");

      toast({
        title: "Status Update Failed",
        description: isDeptMismatch
          ? `The backend requires the assigned department to confirm this transition. ` +
            `Ask your backend team to allow Safety Department to override all status changes ` +
            `(remove the DEPARTMENT_MISMATCH guard for users with role 'Safety Department').`
          : error.message.replace(/^.*?: /, ""),
        variant: "destructive",
      });
    },
  });

  const handleStatusSubmit = () => {
    if (!selectedStatus) {
      toast({ title: "Please select a status", variant: "destructive" });
      return;
    }
    updateStatusMutation.mutate({
      status: selectedStatus,
      notes: statusNotes || undefined,
    });
  };

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3" />
          <div className="h-24 bg-gray-200 rounded" />
          <div className="h-48 bg-gray-200 rounded" />
          <div className="h-48 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  if (isError || !report) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardContent className="p-12 text-center">
            <AlertTriangle className="mx-auto h-12 w-12 text-red-400 mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Report Not Found
            </h2>
            <p className="text-gray-600 mb-4">
              The report may have been deleted, or the API is unavailable.
            </p>
            <div className="flex justify-center gap-3">
              <Button variant="outline" onClick={() => navigate("/reports")}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Reports
              </Button>
              <Button onClick={() => refetch()}>
                <RefreshCcw className="mr-2 h-4 w-4" /> Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const riskLevel = (report?.summary?.overall_risk_level || "medium") as string;
  const riskStyle =
    RISK_LEVEL_COLORS[riskLevel] ||
    RISK_COLORS[riskLevel as RiskLevel] ||
    RISK_COLORS.medium;

  const hiracLabel =
    (report.summary as any)?.overall_risk_label ||
    (RISK_LEVEL_COLORS[riskLevel]?.hirac ?? "");

  const handleExport = (format: string) => {
    try {
      switch (format) {
        case "csv":
          downloadCSV(report);
          break;
        case "excel":
          downloadExcel(report);
          break;
        case "pdf":
          downloadPDF(report);
          break;
        case "json":
          downloadJSON(report);
          break;
      }
      toast({
        title: "Downloaded",
        description: `Report exported as ${format.toUpperCase()}`,
      });
    } catch {
      toast({
        title: "Export Failed",
        description: "Could not export the report.",
        variant: "destructive",
      });
    }
  };

  const complianceObligations = (report as any).compliance_obligations;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <Button variant="outline" onClick={() => navigate("/reports")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Reports
        </Button>
        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Download className="mr-2 h-4 w-4" /> Export Report
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleExport("csv")}>
                Export as CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport("excel")}>
                Export as Excel
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport("pdf")}>
                Export as PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport("json")}>
                Export as JSON
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* ── Report Header with Report ID and Created By ── */}
      {report?.report_header && (
        <Card className={`border-2 ${riskStyle.border}`}>
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <p className="text-sm text-gray-500 font-medium uppercase tracking-wide">
                  {report.report_header.company}
                </p>
                <h1 className="text-2xl font-bold text-gray-900">
                  {report.ai_summary?.incident_title ||
                    report.report_header.report_title}
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                  {report.report_header.department_name} —{" "}
                  {report.report_header.analyzed_department}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {report.report_header.report_date} at{" "}
                  {report.report_header.report_time}
                </p>
                {(report.report_header as any).hirac_basis && (
                  <p className="text-xs text-gray-400 mt-1">
                    HIRAC Basis: {(report.report_header as any).hirac_basis}
                  </p>
                )}
              </div>
              <div className="flex flex-col items-center gap-2">
                <Badge
                  className={`text-lg px-4 py-2 ${riskStyle.bg} ${riskStyle.text}`}
                >
                  {riskLevel.toUpperCase()} RISK
                </Badge>
                {hiracLabel && (
                  <span className="text-xs text-center text-gray-500 max-w-[160px]">
                    {hiracLabel}
                  </span>
                )}
                {report.risk_assessment.stop_work_recommended && (
                  <Badge className="bg-red-600 text-white animate-pulse">
                    STOP WORK RECOMMENDED
                  </Badge>
                )}
                {report.risk_assessment.immediate_action_required && (
                  <Badge className="bg-orange-500 text-white">
                    IMMEDIATE ACTION REQUIRED
                  </Badge>
                )}
              </div>
            </div>

            {/* ============================================================
                REPORT ID AND CREATED BY - ADDED HERE
            ============================================================ */}
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">
                    <span className="font-semibold">Report ID:</span>{" "}
                    <span className="font-mono text-xs">
                      {report.id || "N/A"}
                    </span>
                  </p>
                </div>
                {report.created_by && (
                  <div>
                    <p className="text-sm text-gray-500">
                      <span className="font-semibold">Reported by:</span>{" "}
                      {report.created_by.full_name} (
                      {report.created_by.department})
                    </p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── AI Summary ── */}
      {report.ai_summary && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Brain className="h-4 w-4" /> AI Incident Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-700 leading-relaxed">
              {report.ai_summary.narrative_summary}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
              <div className="p-3 bg-gray-50 rounded-lg">
                <span className="text-xs text-gray-500 block">
                  Incident Type
                </span>
                <span className="font-medium capitalize">
                  {report.ai_summary.incident_type.replace(/_/g, " ")}
                </span>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <span className="text-xs text-gray-500 block">AI Severity</span>
                <span className="font-medium capitalize">
                  {report.ai_summary.severity_assessment}
                </span>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <span className="text-xs text-gray-500 block">
                  Immediate Concerns
                </span>
                <span className="font-medium">
                  {report.ai_summary.immediate_concerns.length} identified
                </span>
              </div>
            </div>
            {report.ai_summary.immediate_concerns.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-xs font-semibold text-red-700 mb-2">
                  Immediate Concerns
                </p>
                <ul className="list-disc list-inside text-sm text-red-800 space-y-1">
                  {report.ai_summary.immediate_concerns.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Incident Details ── */}
      {report.incident_details && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MapPin className="h-4 w-4" /> Incident Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              {report.incident_details.description && (
                <div className="sm:col-span-2">
                  <span className="text-xs text-gray-500 block">
                    Description
                  </span>
                  <p className="text-gray-700">
                    {report.incident_details.description}
                  </p>
                </div>
              )}
              {report.incident_details.location && (
                <div>
                  <span className="text-xs text-gray-500 block">Location</span>
                  <p className="font-medium">
                    {report.incident_details.location}
                  </p>
                </div>
              )}
              <div>
                <span className="text-xs text-gray-500 block">Date</span>
                <p className="font-medium">
                  {report.incident_details.incident_date}
                </p>
              </div>
              <div>
                <span className="text-xs text-gray-500 block">Time</span>
                <p className="font-medium">
                  {report.incident_details.incident_time}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── AI Classification ── */}
      {report.ai_classification && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Eye className="h-4 w-4" /> AI Department Classification
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3 items-center mb-3">
              <Badge className="bg-blue-100 text-blue-800 capitalize">
                {report.ai_classification.department.replace(/_/g, " ")}
              </Badge>
              <span className="text-sm text-gray-600">
                Confidence:{" "}
                <strong>
                  {Math.round(report.ai_classification.confidence * 100)}%
                </strong>
              </span>
              {report.ai_classification.overridden_by_user && (
                <Badge className="bg-yellow-100 text-yellow-800">
                  User Override
                </Badge>
              )}
            </div>
            <p className="text-sm text-gray-700">
              {report.ai_classification.reasoning}
            </p>
          </CardContent>
        </Card>
      )}

      {/* ── Incident Image ── */}
      {report.incident_image && report.incident_image.data_url && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Camera className="h-4 w-4" />
              Incident Scene
            </CardTitle>
          </CardHeader>
          <CardContent>
            <img
              src={report.incident_image.data_url}
              alt="Incident scene"
              className="w-full max-h-[500px] object-contain rounded-lg"
            />
          </CardContent>
        </Card>
      )}

      {/* ── Summary ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4" /> Scene Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          {report?.summary?.scene_description && (
            <p className="text-gray-700 mb-4">
              {report.summary.scene_description}
            </p>
          )}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              icon={<Users className="h-5 w-5 text-blue-600" />}
              label="Workers"
              value={report?.summary?.worker_count || 0}
            />
            <StatCard
              icon={<AlertTriangle className="h-5 w-5 text-red-500" />}
              label="Total Findings"
              value={report?.summary?.total_findings || 0}
            />
            <StatCard
              icon={<HardHat className="h-5 w-5 text-orange-500" />}
              label="PPE Violations"
              value={report?.summary?.ppe_violations || 0}
            />
            <StatCard
              icon={<Flame className="h-5 w-5 text-yellow-600" />}
              label="Env. Hazards"
              value={report?.summary?.environmental_hazards || 0}
            />
          </div>
          {(report.summary as any).risk_breakdown && (
            <div className="mt-4 grid grid-cols-3 gap-3">
              {Object.entries((report.summary as any).risk_breakdown).map(
                ([key, val]) => {
                  const cfg = RISK_LEVEL_COLORS[val as string];
                  return (
                    <div
                      key={key}
                      className={`rounded-lg p-2 text-center ${cfg?.bg || "bg-gray-100"}`}
                    >
                      <p className="text-xs text-gray-500 capitalize">
                        {key.replace("_risk", "")} Risk
                      </p>
                      <p
                        className={`text-sm font-bold capitalize ${cfg?.text || "text-gray-800"}`}
                      >
                        {val as string}
                      </p>
                    </div>
                  );
                },
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── PPE Compliance ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <HardHat className="h-4 w-4" /> PPE Compliance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {Object.entries(report.ppe_compliance.ppe_status)
              .filter(([key]) => key !== "no_safety_gear")
              .map(([key, val]) => (
                <div
                  key={key}
                  className={`flex items-center gap-2 p-3 rounded-lg border ${
                    val === 1
                      ? "bg-green-50 border-green-200"
                      : "bg-red-50 border-red-200"
                  }`}
                >
                  {val === 1 ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-600 shrink-0" />
                  )}
                  <span className="text-sm font-medium">
                    {PPE_LABELS[key] || key}
                  </span>
                </div>
              ))}
          </div>

          {report.ppe_compliance.ppe_status.no_safety_gear === 1 && (
            <div className="bg-red-100 border border-red-300 rounded-lg p-3 flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-red-700" />
              <span className="text-sm font-semibold text-red-800">
                No safety gear detected on worker(s)
              </span>
            </div>
          )}

          {report.ppe_compliance.missing_ppe.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-red-700 mb-2">
                Missing PPE
              </h4>
              <div className="flex flex-wrap gap-2">
                {report.ppe_compliance.missing_ppe.map((item, i) => (
                  <Badge key={i} className="bg-red-100 text-red-800">
                    {item}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {report.ppe_compliance.ppe_hazards.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2">
                PPE-Related Hazards
              </h4>
              <div className="space-y-2">
                {report.ppe_compliance.ppe_hazards.map((h, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg"
                  >
                    <SeverityBadge
                      severity={
                        typeof h.severity === "object"
                          ? ((h.severity as any).value ?? String(h.severity))
                          : String(h.severity)
                      }
                    />
                    <div>
                      <p className="text-sm font-medium">{h.hazard}</p>
                      <p className="text-xs text-gray-500">
                        Missing: {h.missing_ppe}
                      </p>
                      {(h as any).hirac_ref && (
                        <p className="text-xs text-gray-400">
                          HIRAC: {(h as any).hirac_ref}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Environmental Hazards ── */}
      {report.environmental_hazards.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Flame className="h-4 w-4" /> Environmental Hazards (
              {report.environmental_hazards.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {report.environmental_hazards.map((h, i) => (
                <div
                  key={i}
                  className="p-4 border rounded-lg bg-gray-50 space-y-2"
                >
                  <div className="flex items-center gap-2">
                    <SeverityBadge severity={h.severity} />
                    <span className="font-semibold text-sm">
                      {h.hazard_type}
                    </span>
                    {(h as any).hirac_classification && (
                      <span className="text-xs text-gray-400">
                        ({(h as any).hirac_classification})
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-700">{h.description}</p>
                  <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                    <span>
                      <strong>Location:</strong> {h.location_in_scene}
                    </span>
                  </div>
                  <div className="text-sm text-blue-700 bg-blue-50 p-2 rounded">
                    <strong>Recommendation:</strong> {h.recommendation}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Unsafe Behaviors ── */}
      {report.unsafe_behaviors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Ban className="h-4 w-4" /> Unsafe Behaviors (
              {report.unsafe_behaviors.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {report.unsafe_behaviors.map((b, i) => (
                <div
                  key={i}
                  className="p-4 border rounded-lg bg-gray-50 space-y-2"
                >
                  <div className="flex items-center gap-2">
                    <SeverityBadge severity={b.severity} />
                    <span className="font-semibold text-sm">{b.behavior}</span>
                    {(b as any).hirac_classification && (
                      <span className="text-xs text-gray-400">
                        ({(b as any).hirac_classification})
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-700">{b.description}</p>
                  <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                    <span>
                      <strong>Affected:</strong> {b.affected_workers}
                    </span>
                    <span>
                      <strong>Consequence:</strong> {b.potential_consequence}
                    </span>
                  </div>
                  <div className="text-sm text-blue-700 bg-blue-50 p-2 rounded">
                    <strong>Recommendation:</strong> {b.recommendation}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Corrective Actions with Legal Basis ── */}
      {report.corrective_actions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ClipboardList className="h-4 w-4" /> Corrective Actions (
              {report.corrective_actions.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {report.corrective_actions.map((a, i) => (
                <div key={i} className="p-3 border rounded-lg bg-gray-50">
                  <div className="flex items-start gap-3">
                    <SeverityBadge severity={a.priority} />
                    <div className="flex-1">
                      <p className="text-xs text-gray-500 mb-0.5">
                        {a.category}
                      </p>
                      <p className="text-sm text-gray-800">{a.action}</p>
                      {(a as any).legal_basis && (
                        <p className="text-xs text-amber-700 mt-1 flex items-center gap-1">
                          <Scale className="h-3 w-3 flex-shrink-0" />
                          {(a as any).legal_basis}
                        </p>
                      )}
                      {(a as any).compliance_check && (
                        <p className="text-xs text-blue-600 mt-1 italic">
                          ✓ {(a as any).compliance_check}
                        </p>
                      )}
                      {(a as any).hirac_ref && (
                        <p className="text-xs text-gray-400 mt-1">
                          HIRAC Ref: {(a as any).hirac_ref}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Legal Compliance Obligations ── */}
      {complianceObligations && (
        <Card className="border-amber-200">
          <CardHeader>
            <button
              onClick={() => setShowLegal(!showLegal)}
              className="w-full flex items-center justify-between text-left"
            >
              <CardTitle className="flex items-center gap-2 text-base text-amber-800">
                <Scale className="h-4 w-4" /> Legal Compliance Obligations
                {complianceObligations.violated_laws?.length > 0 && (
                  <Badge className="bg-amber-100 text-amber-800 text-xs ml-2">
                    {complianceObligations.violated_laws.length} law
                    {complianceObligations.violated_laws.length !== 1
                      ? "s"
                      : ""}{" "}
                    triggered
                  </Badge>
                )}
              </CardTitle>
              {showLegal ? (
                <ChevronDown className="h-4 w-4 text-amber-600" />
              ) : (
                <ChevronRight className="h-4 w-4 text-amber-600" />
              )}
            </button>
          </CardHeader>

          {showLegal && (
            <CardContent className="space-y-4 pt-0">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Primary Applicable Legislation
                </p>
                <ul className="space-y-1">
                  {(complianceObligations.primary_legislation || []).map(
                    (law: string, i: number) => (
                      <li
                        key={i}
                        className="text-sm text-gray-700 flex items-start gap-2"
                      >
                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                        {law}
                      </li>
                    ),
                  )}
                </ul>
              </div>

              {complianceObligations.violated_laws?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-2">
                    Laws / Regulations Triggered by Findings
                  </p>
                  <ul className="space-y-1 max-h-52 overflow-y-auto">
                    {complianceObligations.violated_laws.map(
                      (law: string, i: number) => (
                        <li
                          key={i}
                          className="text-sm text-gray-700 flex items-start gap-2"
                        >
                          <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
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
                  {(complianceObligations.reporting_requirements || []).map(
                    (req: string, i: number) => (
                      <li
                        key={i}
                        className="text-sm text-gray-700 flex items-start gap-2"
                      >
                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-orange-400 flex-shrink-0" />
                        {req}
                      </li>
                    ),
                  )}
                </ul>
              </div>

              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Employer Obligations
                </p>
                <ul className="space-y-1">
                  {(complianceObligations.employer_obligations || []).map(
                    (ob: string, i: number) => (
                      <li
                        key={i}
                        className="text-sm text-gray-700 flex items-start gap-2"
                      >
                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />
                        {ob}
                      </li>
                    ),
                  )}
                </ul>
              </div>

              <p className="text-xs text-gray-400 italic">
                Source: OSHE HIRAC Worksheet — Compliance Obligations Column
                (HAZ-001 to HAZ-134)
              </p>
            </CardContent>
          )}
        </Card>
      )}

      {/* ── Safety Assessment ── */}
      {report.assessment && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ClipboardCheck className="h-4 w-4" /> Safety Assessment
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-3 items-center text-sm">
              {(() => {
                const cfg =
                  RISK_LEVEL_COLORS[report.assessment.risk_confirmed] ||
                  RISK_COLORS[report.assessment.risk_confirmed as RiskLevel] ||
                  RISK_COLORS.medium;
                return (
                  <Badge className={`${cfg.bg} ${cfg.text}`}>
                    Risk: {report.assessment.risk_confirmed.toUpperCase()}
                  </Badge>
                );
              })()}
              {report.assessment.requires_mitigation && (
                <Badge className="bg-orange-100 text-orange-800">
                  Requires Mitigation
                </Badge>
              )}
              <Badge className="bg-blue-100 text-blue-800">
                Timeline:{" "}
                {report.assessment.recommended_timeline.replace(/_/g, " ")}
              </Badge>
              {(report.assessment as any).risk_label && (
                <span className="text-xs text-gray-500 italic">
                  {(report.assessment as any).risk_label}
                </span>
              )}
            </div>

            {report.assessment.assessment_notes && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <span className="text-xs text-gray-500 block mb-1">
                  Assessment Notes
                </span>
                <p className="text-sm text-gray-700">
                  {report.assessment.assessment_notes}
                </p>
              </div>
            )}

            {report.assessment.priority_findings.length > 0 && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <span className="text-xs font-semibold text-yellow-700 block mb-2">
                  Priority Findings
                </span>
                <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                  {report.assessment.priority_findings.map((f, i) => (
                    <li key={i}>{f}</li>
                  ))}
                </ul>
              </div>
            )}

            {report.assessment.additional_actions.length > 0 && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <span className="text-xs font-semibold text-gray-600 block mb-2">
                  Additional Actions
                </span>
                <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                  {report.assessment.additional_actions.map((a, i) => (
                    <li key={i}>{a}</li>
                  ))}
                </ul>
              </div>
            )}

            <p className="text-xs text-gray-400">
              Assessed by {report.assessment.assessor_name} (
              {report.assessment.generated_by})
              {report.assessment.assessed_at &&
                ` on ${new Date(report.assessment.assessed_at).toLocaleDateString()}`}
            </p>
          </CardContent>
        </Card>
      )}

      {/* ── Mitigation Plan ── */}
      {report.mitigation && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Wrench className="h-4 w-4" /> Mitigation Plan
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600">
              Department: {report.mitigation.department_label} | Submitted by{" "}
              {report.mitigation.responder_name}
              {report.mitigation.submitted_at &&
                ` on ${new Date(report.mitigation.submitted_at).toLocaleDateString()}`}
            </p>

            {report.mitigation.mitigation_actions.length > 0 && (
              <div className="space-y-3">
                {report.mitigation.mitigation_actions.map((ma, i) => (
                  <div key={i} className="p-3 border rounded-lg bg-gray-50">
                    <div className="flex items-start gap-3">
                      <SeverityBadge severity={ma.priority} />
                      <div className="flex-1">
                        <p className="text-sm text-gray-800">{ma.action}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {ma.hazard_addressed}
                        </p>
                        {(ma as any).control_type && (
                          <p className="text-xs text-blue-600 mt-0.5 capitalize">
                            Control:{" "}
                            {(ma as any).control_type.replace(/_/g, " ")}
                          </p>
                        )}
                        <div className="flex gap-3 mt-1">
                          <span className="text-xs text-gray-400">
                            Timeline:{" "}
                            {ma.estimated_completion.replace(/_/g, " ")}
                          </span>
                          <Badge className="bg-blue-100 text-blue-800 text-xs capitalize">
                            {ma.status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {report.mitigation.mitigation_notes && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <span className="text-xs text-gray-500 block mb-1">
                  Mitigation Notes
                </span>
                <p className="text-sm text-gray-700">
                  {report.mitigation.mitigation_notes}
                </p>
              </div>
            )}

            {report.mitigation.preventive_measures.length > 0 && (
              <div>
                <span className="text-xs font-semibold text-gray-700 block mb-2">
                  Preventive Measures
                </span>
                <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                  {report.mitigation.preventive_measures.map((pm, i) => (
                    <li key={i}>{pm}</li>
                  ))}
                </ul>
              </div>
            )}

            {report.mitigation.training_required.length > 0 && (
              <div>
                <span className="text-xs font-semibold text-gray-700 block mb-2">
                  Training Required
                </span>
                <div className="flex flex-wrap gap-2">
                  {report.mitigation.training_required.map((tr, i) => (
                    <Badge key={i} className="bg-purple-100 text-purple-800">
                      {tr}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Workflow ── */}
      {report.workflow && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock className="h-4 w-4" /> Workflow Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <WorkflowStatusVisualization
                currentStatus={report.workflow.status}
                size="md"
              />

              <div className="space-y-3">
                <div className="flex flex-wrap gap-3 items-center">
                  <Badge
                    className={`${(WORKFLOW_STATUS_COLORS[report.workflow.status] || { bg: "bg-gray-100", text: "text-gray-800" }).bg} ${(WORKFLOW_STATUS_COLORS[report.workflow.status] || { bg: "bg-gray-100", text: "text-gray-800" }).text}`}
                  >
                    {report.workflow.status.replace(/_/g, " ").toUpperCase()}
                  </Badge>
                  <span className="text-sm text-gray-600">
                    Assigned to:{" "}
                    <strong className="capitalize">
                      {report.workflow.assigned_department.replace(/_/g, " ")}
                    </strong>
                  </span>
                  {report.workflow.fully_automated && (
                    <Badge className="bg-indigo-100 text-indigo-800">
                      Fully Automated
                    </Badge>
                  )}
                </div>

                {isSafetyDept && (
                  <Button
                    onClick={() => setShowStatusDialog(true)}
                    className="w-full sm:w-auto"
                  >
                    <ChevronRight className="mr-2 h-4 w-4" />
                    Update Status
                  </Button>
                )}

                {!isSafetyDept && (
                  <p className="text-sm text-gray-500 italic">
                    Only Safety Department can update report status.
                  </p>
                )}
              </div>

              {report.workflow.history.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm text-gray-900">
                    Workflow History
                  </h4>
                  <div className="border-l-2 border-gray-200 pl-4 space-y-3 ml-2">
                    {report.workflow.history.map((h, i) => (
                      <div key={i} className="relative">
                        <div className="absolute -left-[1.35rem] top-1 w-2.5 h-2.5 rounded-full bg-blue-500 border-2 border-white" />
                        <p className="text-sm font-medium capitalize">
                          {h.action.replace(/_/g, " ")}
                        </p>
                        <p className="text-xs text-gray-500">
                          {h.by} ({h.role}) —{" "}
                          {new Date(h.timestamp).toLocaleString()}
                        </p>
                        {h.notes && (
                          <p className="text-xs text-gray-600 mt-1">
                            {h.notes}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {report.workflow.closed_at && (
                <p className="text-xs text-gray-500">
                  Closed by {report.workflow.closed_by} on{" "}
                  {new Date(report.workflow.closed_at).toLocaleString()}
                </p>
              )}
            </CardContent>
          </Card>

          <AlertDialog
            open={showStatusDialog}
            onOpenChange={(open) => {
              if (!open && updateStatusMutation.isPending) return;
              setShowStatusDialog(open);
            }}
          >
            <AlertDialogContent className="max-w-md">
              <AlertDialogHeader>
                <AlertDialogTitle>Update Report Status</AlertDialogTitle>
                <AlertDialogDescription>
                  Select the new status for this report. Your action will be
                  recorded in the workflow history.
                </AlertDialogDescription>
              </AlertDialogHeader>

              <div className="space-y-4 py-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-2">
                    New Status
                  </label>
                  {report.workflow?.status === "closed" && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg mb-3">
                      <p className="text-sm text-amber-800">
                        ⚠️ This report is closed and cannot be reopened.
                      </p>
                    </div>
                  )}
                  <div className="space-y-2">
                    {[
                      "submitted",
                      "under_review",
                      "action_required",
                      "in_progress",
                      "closed",
                    ].map((status) => {
                      const isDisabled =
                        status === report.workflow?.status ||
                        (report.workflow?.status === "closed" &&
                          status !== "closed");
                      const isCurrentStatus =
                        status === report.workflow?.status;

                      return (
                        <label
                          key={status}
                          className={`flex items-center gap-3 p-2 rounded border cursor-pointer ${
                            isDisabled
                              ? "opacity-50 cursor-not-allowed bg-gray-50"
                              : "hover:bg-gray-50"
                          }`}
                        >
                          <input
                            type="radio"
                            name="status"
                            value={status}
                            checked={selectedStatus === status}
                            onChange={(e) => setSelectedStatus(e.target.value)}
                            disabled={isDisabled}
                            className="rounded"
                          />
                          <span className="flex-1 text-sm">
                            {(
                              WORKFLOW_STATUS_COLORS[status]?.label || status
                            ).replace(/_/g, " ")}
                            {isCurrentStatus && (
                              <span className="ml-1 text-xs text-gray-500">
                                (current)
                              </span>
                            )}
                          </span>
                          <Badge
                            className={`${WORKFLOW_STATUS_COLORS[status]?.bg} ${WORKFLOW_STATUS_COLORS[status]?.text} text-xs`}
                          >
                            {status.replace(/_/g, " ")}
                          </Badge>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-2">
                    Notes (Optional)
                  </label>
                  <Textarea
                    placeholder="Add any notes about this status change..."
                    value={statusNotes}
                    onChange={(e) => setStatusNotes(e.target.value)}
                    className="min-h-[100px]"
                  />
                </div>
              </div>

              <AlertDialogFooter>
                <AlertDialogCancel disabled={updateStatusMutation.isPending}>
                  Cancel
                </AlertDialogCancel>

                <Button
                  onClick={handleStatusSubmit}
                  disabled={updateStatusMutation.isPending || !selectedStatus}
                >
                  {updateStatusMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Update Status
                </Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}

      {/* ── Overall Risk Assessment ── */}
      <Card className={`border-2 ${riskStyle.border}`}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldAlert className="h-4 w-4" /> Overall Risk Assessment
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-center">
            <Badge
              className={`text-base px-4 py-2 ${riskStyle.bg} ${riskStyle.text}`}
            >
              {report.risk_assessment.overall_risk.toUpperCase()}
            </Badge>
            {hiracLabel && (
              <span className="text-sm text-gray-600">{hiracLabel}</span>
            )}
            {report.risk_assessment.immediate_action_required && (
              <div className="flex items-center gap-2 text-orange-700">
                <AlertTriangle className="h-5 w-5" />
                <span className="font-medium">Immediate action required</span>
              </div>
            )}
            {report.risk_assessment.stop_work_recommended && (
              <div className="flex items-center gap-2 text-red-700">
                <Ban className="h-5 w-5" />
                <span className="font-medium">Stop work recommended</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="text-center text-sm text-gray-500 pb-4">
        <p>
          EEI Corporation SHE Department — Report generated{" "}
          {report.report_header.report_date} at{" "}
          {report.report_header.report_time}
        </p>
        <p className="text-xs text-gray-400 mt-1">
          HIRAC Basis: OSHE-HIRAC-Worksheet-PROJECT (Rev. May 2024) |
          HAZARD-AUDIT-INSPECTION-CHECKLIST (Taglish Rev04)
        </p>
      </div>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────
function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border">
      {icon}
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-xl font-bold text-gray-900">{value}</p>
      </div>
    </div>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  const cfg =
    RISK_LEVEL_COLORS[severity] ||
    SEVERITY_COLORS[severity] ||
    SEVERITY_COLORS.medium;
  return <Badge className={`${cfg.bg} ${cfg.text} text-xs`}>{severity}</Badge>;
}
