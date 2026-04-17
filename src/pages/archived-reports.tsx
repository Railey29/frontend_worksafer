import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { useToast } from "../hooks/use-toast";
import {
  fetchArchivedReports,
  restoreReport,
  fetchDepartments,
} from "../components/lib/she-api";
import { getStoredUser } from "../utils/user";
import {
  isSafetyDepartmentAccount,
  resolveDepartmentKey,
} from "../utils/department";
import {
  FileText,
  AlertTriangle,
  RefreshCcw,
  MapPin,
  Eye,
  ArchiveRestore,
  Loader2,
} from "lucide-react";
import type {
  SHEReportsResponse,
  SHEReportListItem,
  RiskLevel,
  SHEDepartments,
} from "../components/lib/she-api-types";
import {
  RISK_COLORS,
  WORKFLOW_STATUS_COLORS,
} from "../components/lib/she-api-types";

// ── 5-Level Risk Config — aligned to OSHE HIRAC Worksheet ────────────
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

const DEPT_LABEL_TO_KEY: Record<string, string> = {
  "Field Operations Group": "field",
  "Field Operation Group": "field",
  "Field Operation": "field",
  "Field Operations": "field",
  "Quality Control": "quality",
  Environmental: "environmental",
  "Human Resources": "hr",
  HR: "hr",
};

export default function ArchivedReports() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const user = getStoredUser();
  const userDepartment = user?.department || "Safety Department";
  const isSafetyDept = isSafetyDepartmentAccount({
    department: userDepartment,
    role: typeof user?.role === "string" ? user.role : "",
  });

  const { data: departmentsData } = useQuery<SHEDepartments>({
    queryKey: ["she-departments"],
    queryFn: fetchDepartments,
  });

  const deptLabelToKey = useMemo(() => {
    const map: Record<string, string> = { ...DEPT_LABEL_TO_KEY };
    if (departmentsData) {
      for (const [key, cfg] of Object.entries(departmentsData)) {
        map[cfg.label] = key;
      }
    }
    return map;
  }, [departmentsData]);

  const userDeptKey = useMemo(() => {
    if (isSafetyDept) return "";
    const roleLabel = typeof user?.role === "string" ? user.role : "";
    return (
      resolveDepartmentKey(userDepartment, deptLabelToKey) ||
      resolveDepartmentKey(roleLabel, deptLabelToKey) ||
      ""
    );
  }, [deptLabelToKey, isSafetyDept, user?.role, userDepartment]);

  const allowedDeptKeys = useMemo(() => {
    return new Set(["field", "quality", "environmental", "hr"]);
  }, []);

  const canAccessArchived = isSafetyDept || allowedDeptKeys.has(userDeptKey);

  const [selectedDeptKey, setSelectedDeptKey] = useState<string>(
    isSafetyDept ? "all" : userDeptKey || "all",
  );

  useEffect(() => {
    if (!isSafetyDept && userDeptKey) setSelectedDeptKey(userDeptKey);
  }, [isSafetyDept, userDeptKey]);

  const departmentFilterKey = isSafetyDept
    ? selectedDeptKey !== "all"
      ? selectedDeptKey
      : ""
    : userDeptKey;

  const { data, isLoading, isError, refetch } = useQuery<SHEReportsResponse>({
    enabled: canAccessArchived,
    queryKey: ["she-archived-reports", departmentFilterKey || "all"],
    queryFn: () =>
      fetchArchivedReports(
        departmentFilterKey ? { department: departmentFilterKey } : undefined,
      ),
  });

  const restoreMutation = useMutation({
    mutationFn: restoreReport,
    onSuccess: (_result, restoredId) => {
      queryClient.invalidateQueries({ queryKey: ["she-reports"] });
      queryClient.invalidateQueries({ queryKey: ["she-archived-reports"] });
      toast({
        title: "Report Restored",
        description: `Report ${restoredId.slice(0, 8)}… has been restored to the main list.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Restore Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getRiskStyle = (level: string) => {
    return (
      RISK_LEVEL_CONFIG[level] ||
      RISK_COLORS[level as RiskLevel] ||
      RISK_COLORS.medium
    );
  };

  const reports = data?.reports || [];

  const departmentOptions = useMemo(() => {
    const fallback: Array<{ key: string; label: string }> = [
      { key: "field", label: "Field Operations Group" },
      { key: "quality", label: "Quality Control" },
      { key: "environmental", label: "Environmental" },
      { key: "hr", label: "Human Resources" },
    ];

    return fallback.map((d) => ({
      key: d.key,
      label: departmentsData?.[d.key]?.label || d.label,
    }));
  }, [departmentsData]);

  const filteredReports = useMemo(() => {
    if (!departmentFilterKey) return reports;
    return reports.filter(
      (r) =>
        resolveDepartmentKey(r.department, deptLabelToKey) ===
        departmentFilterKey,
    );
  }, [departmentFilterKey, deptLabelToKey, reports]);

  if (!canAccessArchived) {
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
            <Button className="mt-4" onClick={() => navigate("/dashboard")}>
              Return Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

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
              Failed to Load Archived Reports
            </h2>
            <p className="text-gray-600 mb-4">
              There was an error communicating with the server.
            </p>
            <Button onClick={() => refetch()}>
              <RefreshCcw className="mr-2 h-4 w-4" /> Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Archived Reports</h1>
          <p className="text-gray-600 mt-1">
            {filteredReports.length} report
            {filteredReports.length !== 1 ? "s" : ""} found
          </p>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full md:w-auto">
          {isSafetyDept ? (
            <select
              value={selectedDeptKey}
              onChange={(e) => setSelectedDeptKey(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
            >
              <option value="all">All Departments</option>
              {departmentOptions.map((d) => (
                <option key={d.key} value={d.key}>
                  {d.label}
                </option>
              ))}
            </select>
          ) : (
            <Badge variant="outline" className="px-3 py-2 text-sm bg-white">
              {departmentOptions.find((d) => d.key === userDeptKey)?.label ||
                userDepartment}
            </Badge>
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

      {/* Reports List */}
      {filteredReports.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="mx-auto h-12 w-12 text-gray-300 mb-4" />
            <h2 className="text-lg font-medium text-gray-700 mb-1">
              No Archived Reports Found
            </h2>
            <p className="text-sm text-gray-500">
              There are no incident reports matching your filter in the archive.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredReports.map((r) => (
            <ReportCard
              key={r.id}
              report={r}
              getRiskStyle={getRiskStyle}
              onView={() => navigate(`/reports/${r.id}`)}
              onRestore={() => restoreMutation.mutate(r.id)}
              isRestoring={
                restoreMutation.isPending && restoreMutation.variables === r.id
              }
              canRestore={isSafetyDept}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Report Card ──────────────────────────────────────────────────────
function ReportCard({
  report,
  getRiskStyle,
  onView,
  onRestore,
  isRestoring,
  canRestore,
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
  onRestore: () => void;
  isRestoring: boolean;
  canRestore: boolean;
}) {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const risk = getRiskStyle(report.overall_risk);

  const handleRestoreClick = () => {
    setShowConfirmDialog(true);
  };

  const handleConfirmRestore = () => {
    setShowConfirmDialog(false);
    onRestore();
  };

  const handleCancelRestore = () => {
    setShowConfirmDialog(false);
  };

  return (
    <>
      <Card
        className={`hover:shadow-md transition-shadow border ${risk.border || "border-gray-200"} relative opacity-80`}
      >
        <div className="absolute top-0 right-0 left-0 h-1 bg-gray-400 rounded-t-lg" />
        <CardHeader className="pb-3 pt-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className={`${risk.bg} ${risk.text}`}>
                {(risk.label || report.overall_risk).toUpperCase()}
              </Badge>
              {/* Show HIRAC classification below badge */}
              {risk.hirac && (
                <span className="text-xs text-gray-400">{risk.hirac}</span>
              )}
            </div>
            <span className="text-xs text-gray-500">
              {new Date(report.created_at).toLocaleDateString()}
            </span>
          </div>
          {/* Show risk_label if available from API */}
          {(report as any).risk_label && (
            <p className="text-xs text-gray-500 mt-1">
              {(report as any).risk_label}
            </p>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          {report.incident_title && (
            <p className="text-sm font-semibold text-gray-900 line-clamp-1 flex items-center gap-2">
              <Badge
                variant="outline"
                className="text-xs bg-gray-100 uppercase border-gray-300"
              >
                Archived
              </Badge>
              {report.incident_title}
            </p>
          )}
          <p className="text-sm text-gray-500">{report.department}</p>
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
            {report.workflow_status && (
              <Badge
                className={`text-xs ${(WORKFLOW_STATUS_COLORS[report.workflow_status] || { bg: "bg-gray-100", text: "text-gray-800" }).bg} ${(WORKFLOW_STATUS_COLORS[report.workflow_status] || { bg: "bg-gray-100", text: "text-gray-800" }).text}`}
              >
                {report.workflow_status.replace(/_/g, " ")}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 pt-2 border-t">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={onView}
            >
              <Eye className="h-3.5 w-3.5 mr-1" /> View
            </Button>
            {canRestore ? (
              <Button
                variant="outline"
                size="sm"
                className="flex-1 border-blue-200 text-blue-700 hover:bg-blue-50"
                onClick={handleRestoreClick}
                disabled={isRestoring}
              >
                {isRestoring ? (
                  <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                ) : (
                  <ArchiveRestore className="h-3.5 w-3.5 mr-1" />
                )}
                Restore
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <ArchiveRestore className="h-5 w-5 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Restore Report
                </h3>
              </div>

              <p className="text-gray-600 mb-2">
                Are you sure you want to restore this report?
              </p>

              <div className="bg-gray-50 rounded-md p-3 mb-4">
                <p className="text-sm font-medium text-gray-900">
                  {report.incident_title || "Untitled Report"}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Department: {report.department}
                </p>
                <p className="text-xs text-gray-500">
                  Date: {new Date(report.created_at).toLocaleDateString()}
                </p>
              </div>

              <p className="text-sm text-gray-500 mb-6">
                This report will be moved back to the active reports list and
                will no longer appear in the archive.
              </p>

              <div className="flex gap-3 justify-end">
                <Button
                  variant="outline"
                  onClick={handleCancelRestore}
                  disabled={isRestoring}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleConfirmRestore}
                  disabled={isRestoring}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isRestoring ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Restoring...
                    </>
                  ) : (
                    <>
                      <ArchiveRestore className="h-4 w-4 mr-2" />
                      Yes, Restore Report
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
