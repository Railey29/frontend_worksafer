import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../components/ui/alert-dialog";
import { Textarea } from "../components/ui/textarea";
import { useToast } from "../hooks/use-toast";
import {
  FileText,
  Eye,
  Trash2,
  Loader2,
  AlertTriangle,
  Filter,
  RefreshCcw,
  MapPin,
  User,
  CheckCircle2,
  PenLine,
  ClipboardList,
} from "lucide-react";
import type {
  SHEReportsResponse,
  SHEReportListItem,
  RiskLevel,
} from "../components/lib/she-api-types";
import {
  RISK_COLORS,
  WORKFLOW_STATUS_COLORS,
} from "../components/lib/she-api-types";
import { fetchReports, deleteReport } from "../components/lib/she-api";
import { getStoredUser } from "../utils/user";
import {
  isSafetyDepartmentAccount,
  resolveDepartmentKey,
} from "../utils/department";

// ── 5-Level Risk Config ────────────
const RISK_LEVEL_CONFIG: Record<
  string,
  { label: string; hirac: string; bg: string; text: string; border: string }
> = {
  critical: {
    label: "Critical",
    hirac: "Highly Unacceptable",
    bg: "bg-red-100",
    text: "text-red-800",
    border: "border-red-300",
  },
  high: {
    label: "High",
    hirac: "Highly Unacceptable",
    bg: "bg-orange-100",
    text: "text-orange-800",
    border: "border-orange-300",
  },
  medium: {
    label: "Medium",
    hirac: "Moderately Unacceptable",
    bg: "bg-yellow-100",
    text: "text-yellow-800",
    border: "border-yellow-300",
  },
  low: {
    label: "Low",
    hirac: "Low / Relatively Acceptable",
    bg: "bg-blue-100",
    text: "text-blue-800",
    border: "border-blue-200",
  },
  safe: {
    label: "Safe",
    hirac: "Safe",
    bg: "bg-green-100",
    text: "text-green-800",
    border: "border-green-200",
  },
};

// ── Accept Confirmation Modal ─────────────────────────────────────────
function AcceptReportDialog({
  report,
  onConfirm,
  isLoading,
}: {
  report: SHEReportListItem;
  onConfirm: () => void;
  isLoading: boolean;
}) {
  const reportNumber = (report as any).report_number || "";
  const uniqueId = report.id || (report as any)._id || "N/A";
  const displayId = reportNumber ? reportNumber : `${uniqueId.slice(0, 8)}…`;

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          size="sm"
          className="flex-1 bg-green-600 hover:bg-green-700 text-white"
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
          ) : (
            <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
          )}
          Accept
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            Accept Report?
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>
              You are about to accept report{" "}
              <span className="font-semibold text-gray-800">{displayId}</span>.
              This confirms the accuracy of the incident details.
            </p>
            <p className="text-blue-700 bg-blue-50 rounded-md px-3 py-2 text-sm font-medium">
              📋 After accepting, you will be redirected to the{" "}
              <strong>Compliance page</strong> to complete the required
              compliance actions.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-green-600 hover:bg-green-700"
          >
            Accept & Go to Compliance
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ── Modify Report Dialog ──────────────────────────────────────────────
function ModifyReportDialog({
  report,
  onConfirm,
  isLoading,
}: {
  report: SHEReportListItem;
  onConfirm: (notes: string) => void;
  isLoading: boolean;
}) {
  const [notes, setNotes] = useState("");
  const reportNumber = (report as any).report_number || "";
  const uniqueId = report.id || (report as any)._id || "N/A";
  const displayId = reportNumber ? reportNumber : `${uniqueId.slice(0, 8)}…`;

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          className="flex-1 border-amber-400 text-amber-700 hover:bg-amber-50"
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
          ) : (
            <PenLine className="h-3.5 w-3.5 mr-1" />
          )}
          Modify
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <PenLine className="h-5 w-5 text-amber-600" />
            Modify Report
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>
                Suggest modifications for report{" "}
                <span className="font-semibold text-gray-800">{displayId}</span>
                . Describe what details need to be corrected or updated.
              </p>
              <Textarea
                placeholder="Describe the changes needed (e.g., incorrect location, wrong incident type, missing PPE details)..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="min-h-[100px] text-sm text-gray-800"
              />
              <p className="text-blue-700 bg-blue-50 rounded-md px-3 py-2 text-sm font-medium">
                📋 After submitting modifications, you will be redirected to the{" "}
                <strong>Compliance page</strong> to complete the required
                compliance actions.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setNotes("")}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={() => onConfirm(notes)}
            disabled={!notes.trim()}
            className="bg-amber-500 hover:bg-amber-600 disabled:opacity-50"
          >
            Submit & Go to Compliance
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default function Reports() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const user = getStoredUser();
  const userDepartment = user?.department || "Safety Department";
  const isSafetyDept = isSafetyDepartmentAccount({
    department: userDepartment,
    role: typeof user?.role === "string" ? user.role : "",
  });

  const DEPT_LABEL_TO_KEY: Record<string, string> = {
    "Field Operations Group": "field",
    "Quality Control": "quality",
    Environmental: "environmental",
    "Human Resources": "hr",
  };
  const userDeptKey = resolveDepartmentKey(userDepartment, DEPT_LABEL_TO_KEY);
  const canLoadReports = isSafetyDept || !!userDeptKey;

  const [departmentFilter, setDepartmentFilter] = useState<string>(
    isSafetyDept ? "all" : userDeptKey,
  );
  const [riskFilter, setRiskFilter] = useState<string>("all");

  // Track which report is being actioned
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [modifyingId, setModifyingId] = useState<string | null>(null);

  const filters: { department?: string; risk_level?: string } = {};
  if (departmentFilter !== "all" && departmentFilter)
    filters.department = departmentFilter;
  if (riskFilter !== "all") filters.risk_level = riskFilter;

  const { data, isLoading, isError, refetch } = useQuery<SHEReportsResponse>({
    enabled: canLoadReports,
    queryKey: ["she-reports", departmentFilter, riskFilter],
    queryFn: () =>
      fetchReports(Object.keys(filters).length > 0 ? filters : undefined),
  });

  if (!canLoadReports) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardContent className="p-12 text-center">
            <AlertTriangle className="mx-auto h-12 w-12 text-yellow-500 mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Department not set
            </h2>
            <p className="text-gray-600">
              Please update your profile department.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const deleteMutation = useMutation({
    mutationFn: deleteReport,
    onSuccess: (_result, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ["she-reports"] });
      toast({
        title: "Report Archived",
        description: `Report ${deletedId.slice(0, 8)}… has been archived.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Archive Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle Accept — mark report as accepted then navigate to compliance
  const handleAccept = (report: SHEReportListItem) => {
    setAcceptingId(report.id);
    // Optimistically update query cache status
    queryClient.setQueryData<SHEReportsResponse>(
      ["she-reports", departmentFilter, riskFilter],
      (old) => {
        if (!old) return old;
        return {
          ...old,
          reports: old.reports.map((r) =>
            r.id === report.id ? { ...r, workflow_status: "accepted" } : r,
          ),
        };
      },
    );
    toast({
      title: "Report Accepted",
      description: "The report has been accepted. Redirecting to Compliance…",
    });
    setTimeout(() => {
      setAcceptingId(null);
      navigate("/compliance");
    }, 800);
  };

  // Handle Modify — log modification notes then navigate to compliance
  const handleModify = (report: SHEReportListItem, notes: string) => {
    setModifyingId(report.id);
    queryClient.setQueryData<SHEReportsResponse>(
      ["she-reports", departmentFilter, riskFilter],
      (old) => {
        if (!old) return old;
        return {
          ...old,
          reports: old.reports.map((r) =>
            r.id === report.id
              ? { ...r, workflow_status: "modification_requested" }
              : r,
          ),
        };
      },
    );
    toast({
      title: "Modification Submitted",
      description:
        "Your modification notes have been recorded. Redirecting to Compliance…",
    });
    setTimeout(() => {
      setModifyingId(null);
      navigate("/compliance");
    }, 800);
  };

  const getRiskStyle = (level: string) => {
    return (
      RISK_LEVEL_CONFIG[level] ||
      RISK_COLORS[level as RiskLevel] ||
      RISK_COLORS.medium
    );
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3" />
          <div className="h-16 bg-gray-200 rounded" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-40 bg-gray-200 rounded" />
            ))}
          </div>
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
              Failed to Load Reports
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

  const reports = data?.reports || [];
  const total = data?.total || 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {isSafetyDept ? "Incident Reports" : `${userDepartment} Reports`}
          </h1>
          <p className="text-gray-600 mt-1">
            {total} report{total !== 1 ? "s" : ""} found
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isSafetyDept && (
            <div className="flex items-center gap-2 text-xs text-gray-500 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
              <ClipboardList className="h-4 w-4 text-blue-500 shrink-0" />
              <span>
                <strong>Officer actions:</strong> Accept to confirm accuracy, or
                Modify to flag corrections — both redirect to Compliance.
              </span>
            </div>
          )}
          <Button
            variant="outline"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCcw className="mr-2 h-4 w-4" /> Refresh
          </Button>
        </div>
      </div>

      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Filter className="h-4 w-4" /> Filters:
            </div>
            <div className="flex flex-wrap gap-4">
              <div className="w-48">
                <Select
                  value={departmentFilter}
                  onValueChange={setDepartmentFilter}
                  disabled={!isSafetyDept}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Departments" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    <SelectItem value="field">
                      Field Operations Group
                    </SelectItem>
                    <SelectItem value="quality">Quality Control</SelectItem>
                    <SelectItem value="environmental">Environmental</SelectItem>
                    <SelectItem value="hr">Human Resources</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="w-48">
                <Select value={riskFilter} onValueChange={setRiskFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Risk Levels" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Risk Levels</SelectItem>
                    <SelectItem value="critical">🔴 Critical</SelectItem>
                    <SelectItem value="high">🟠 High</SelectItem>
                    <SelectItem value="medium">🟡 Medium</SelectItem>
                    <SelectItem value="low">🔵 Low</SelectItem>
                    <SelectItem value="safe">🟢 Safe</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {reports.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="mx-auto h-12 w-12 text-gray-300 mb-4" />
            <h2 className="text-lg font-medium text-gray-700 mb-1">
              No Reports Found
            </h2>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reports.map((r) => (
            <ReportCard
              key={r.id}
              report={r}
              getRiskStyle={getRiskStyle}
              onView={() => navigate(`/reports/${r.id}`)}
              onArchive={() => deleteMutation.mutate(r.id)}
              onAccept={() => handleAccept(r)}
              onModify={(notes) => handleModify(r, notes)}
              isArchiving={
                deleteMutation.isPending && deleteMutation.variables === r.id
              }
              isAccepting={acceptingId === r.id}
              isModifying={modifyingId === r.id}
              canArchive={isSafetyDept}
              isSafetyDept={isSafetyDept}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Report Card Component ──────────────────────────────────────────
function ReportCard({
  report,
  getRiskStyle,
  onView,
  onArchive,
  onAccept,
  onModify,
  isArchiving,
  isAccepting,
  isModifying,
  canArchive,
  isSafetyDept,
}: {
  report: SHEReportListItem;
  getRiskStyle: (level: string) => {
    bg: string;
    text: string;
    border: string;
    hirac?: string;
    label?: string;
  };
  onView: () => void;
  onArchive: () => void;
  onAccept: () => void;
  onModify: (notes: string) => void;
  isArchiving: boolean;
  isAccepting: boolean;
  isModifying: boolean;
  canArchive: boolean;
  isSafetyDept: boolean;
}) {
  const risk = getRiskStyle(report.overall_risk);

  const reportedByName =
    (report as any).reported_by_name ||
    (report as any).created_by?.full_name ||
    "Unknown";
  const reportedByDept =
    (report as any).reported_by_department ||
    (report as any).created_by?.department ||
    "";

  const reportNumber = (report as any).report_number || "";
  const uniqueId = report.id || (report as any)._id || "N/A";
  const shortUniqueId =
    uniqueId.length > 12 ? uniqueId.slice(0, 8) + "..." : uniqueId;
  const displayId = reportNumber ? reportNumber : `Report ID: ${shortUniqueId}`;

  const workflowStatus = report.workflow_status;
  const isAlreadyActioned =
    workflowStatus === "accepted" ||
    workflowStatus === "modification_requested";

  return (
    <Card
      className={`hover:shadow-md transition-shadow border ${risk.border || "border-gray-200"}`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className={`${risk.bg} ${risk.text}`}>
              {(risk.label || report.overall_risk).toUpperCase()}
            </Badge>
            {risk.hirac && (
              <span className="text-xs text-gray-400">{risk.hirac}</span>
            )}
          </div>
          <span className="text-xs text-gray-500">
            {new Date(report.created_at).toLocaleDateString()}
          </span>
        </div>

        <div className="mt-2">
          <p className="text-xs font-mono font-semibold text-blue-600 bg-blue-50 inline-block px-2 py-0.5 rounded">
            Report ID: {displayId}
          </p>
        </div>

        {(report as any).risk_label && (
          <p className="text-xs text-gray-500 mt-1">
            {(report as any).risk_label}
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {report.incident_title && (
          <p className="text-sm font-semibold text-gray-900 line-clamp-1">
            {report.incident_title}
          </p>
        )}
        <p className="text-sm text-gray-500">{report.department}</p>

        <div className="flex items-center gap-1 text-xs text-gray-400">
          <User className="h-3 w-3" />
          <span>
            Reported by: {reportedByName}
            {reportedByDept && ` (${reportedByDept})`}
          </span>
        </div>

        {report.location && (
          <p className="text-xs text-gray-500 flex items-center gap-1">
            <MapPin className="h-3 w-3" /> {report.location}
          </p>
        )}
        <p className="text-sm text-gray-700 line-clamp-2">
          {report.scene_description}
        </p>
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-3 w-3" />
            {report.total_findings} finding
            {report.total_findings !== 1 ? "s" : ""}
          </div>
          {workflowStatus && (
            <Badge
              className={`text-xs ${
                workflowStatus === "accepted"
                  ? "bg-green-100 text-green-800"
                  : workflowStatus === "modification_requested"
                    ? "bg-amber-100 text-amber-800"
                    : "bg-gray-100 text-gray-800"
              }`}
            >
              {workflowStatus.replace(/_/g, " ")}
            </Badge>
          )}
        </div>

        {/* ── Action Buttons ── */}
        <div className="pt-2 border-t space-y-2">
          {/* View button always visible */}
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={onView}
          >
            <Eye className="h-3.5 w-3.5 mr-1" /> View Details
          </Button>

          {/* Accept & Modify — only for Safety Officers, and only if not yet actioned */}
          {isSafetyDept && !isAlreadyActioned && (
            <div className="flex gap-2">
              <AcceptReportDialog
                report={report}
                onConfirm={onAccept}
                isLoading={isAccepting}
              />
              <ModifyReportDialog
                report={report}
                onConfirm={onModify}
                isLoading={isModifying}
              />
            </div>
          )}

          {/* Already actioned indicator */}
          {isSafetyDept && isAlreadyActioned && (
            <div
              className={`flex items-center justify-center gap-1.5 text-xs font-medium py-1.5 rounded-md ${
                workflowStatus === "accepted"
                  ? "bg-green-50 text-green-700"
                  : "bg-amber-50 text-amber-700"
              }`}
            >
              {workflowStatus === "accepted" ? (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5" /> Report Accepted
                </>
              ) : (
                <>
                  <PenLine className="h-3.5 w-3.5" /> Modification Requested
                </>
              )}
            </div>
          )}

          {/* Archive button */}
          {canArchive && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-red-500 hover:text-red-700 hover:bg-red-50"
                  disabled={isArchiving}
                >
                  {isArchiving ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5 mr-1" />
                  )}
                  Archive Report
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Archive Report?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will move the incident report to the archive.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={onArchive} className="bg-red-600">
                    Archive
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
