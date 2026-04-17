import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { MetricCard } from "../components/ui/metric-card";
import {
  Download,
  ClipboardCheck,
  Target,
  AlertTriangle,
  CheckCircle,
  XCircle,
  TrendingDown,
} from "lucide-react";
import { useToast } from "../hooks/use-toast";
import type { ComplianceRecord, Incident } from "../shared/schema";

export default function QualityDashboard() {
  const { toast } = useToast();

  const { data: complianceData, isLoading: complianceLoading } = useQuery<
    ComplianceRecord[]
  >({
    queryKey: ["/api/compliance"],
  });

  const { data: incidents } = useQuery<Incident[]>({
    queryKey: ["/api/incidents"],
  });

  const qualityComplianceData = complianceData?.filter(
    (record) => record.department === "Quality Control"
  );

  const handleExportCompliance = () => {
    const csvContent = qualityComplianceData?.map((record) => ({
      Department: record.department,
      "Regulation Type": record.regulationType,
      "Compliance Score": record.complianceScore,
      Status: record.status,
      "Last Assessment": new Date(record.lastAssessment).toLocaleDateString(),
    }));

    if (csvContent) {
      const csv = [
        Object.keys(csvContent[0]).join(","),
        ...csvContent.map((row) => Object.values(row).join(",")),
      ].join("\n");

      const blob = new Blob([csv], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "quality-control-compliance-report.csv";
      a.click();

      toast({
        title: "Export Complete",
        description:
          "Quality Control compliance report downloaded successfully",
      });
    }
  };

  const qualityMetrics = {
    totalInspections: 324,
    passedInspections: 298,
    qualityScore: 92,
    defectRate: 2.1,
  };

  const qualityIssuesTracking = [
    {
      category: "Product Defects",
      incidents: 12,
      severity: "high",
      trend: "decreasing",
      compliance: 88,
    },
    {
      category: "Process Deviations",
      incidents: 8,
      severity: "medium",
      trend: "stable",
      compliance: 92,
    },
    {
      category: "Documentation Issues",
      incidents: 15,
      severity: "low",
      trend: "increasing",
      compliance: 85,
    },
    {
      category: "Equipment Calibration",
      incidents: 5,
      severity: "medium",
      trend: "decreasing",
      compliance: 95,
    },
    {
      category: "Material Quality",
      incidents: 9,
      severity: "high",
      trend: "stable",
      compliance: 89,
    },
  ];

  const qualityStandardsCompliance = [
    {
      standard: "ISO 9001:2015",
      compliance: 94,
      lastAudit: "2024-05-15",
      nextAudit: "2024-08-15",
      status: "compliant",
    },
    {
      standard: "ISO/TS 16949",
      compliance: 89,
      lastAudit: "2024-04-20",
      nextAudit: "2024-07-20",
      status: "minor-issues",
    },
    {
      standard: "FDA 21 CFR Part 820",
      compliance: 96,
      lastAudit: "2024-06-01",
      nextAudit: "2024-09-01",
      status: "compliant",
    },
    {
      standard: "AS9100D",
      compliance: 87,
      lastAudit: "2024-03-10",
      nextAudit: "2024-06-10",
      status: "action-required",
    },
  ];

  const qualityControlProcesses = [
    {
      process: "Incoming Material Inspection",
      effectiveness: 96,
      incidents: 2,
    },
    { process: "In-Process Quality Checks", effectiveness: 91, incidents: 5 },
    { process: "Final Product Testing", effectiveness: 98, incidents: 1 },
    {
      process: "Customer Complaint Resolution",
      effectiveness: 85,
      incidents: 8,
    },
    {
      process: "Corrective Action Implementation",
      effectiveness: 88,
      incidents: 6,
    },
  ];

  if (complianceLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Quality Control Department
            </h1>
            <p className="text-gray-600 mt-2">
              Quality Issues Tracking & Standards Compliance
            </p>
          </div>
          <Button
            onClick={handleExportCompliance}
            className="bg-primary hover:bg-blue-700"
          >
            <Download className="h-4 w-4 mr-2" />
            Export Quality Report
          </Button>
        </div>

        {/* Overview Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Total Inspections"
            value={qualityMetrics.totalInspections}
            icon={ClipboardCheck}
            iconColor="primary"
          />
          <MetricCard
            title="Quality Score"
            value={`${qualityMetrics.qualityScore}%`}
            icon={Target}
            iconColor="success"
          />
          <MetricCard
            title="Passed Inspections"
            value={qualityMetrics.passedInspections}
            icon={CheckCircle}
            iconColor="success"
          />
          <MetricCard
            title="Defect Rate"
            value={`${qualityMetrics.defectRate}%`}
            icon={TrendingDown}
            iconColor="warning"
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Quality Issues Tracking */}
          <Card className="bg-white rounded-xl shadow-sm border border-gray-200">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-gray-900 flex items-center">
                <AlertTriangle className="h-5 w-5 mr-2 text-red-600" />
                Quality Issues Tracking
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {qualityIssuesTracking.map((issue, index) => (
                  <div
                    key={index}
                    className="p-4 border border-gray-200 rounded-lg"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="font-medium text-gray-900">
                          {issue.category}
                        </div>
                        <div className="text-sm text-gray-500">
                          {issue.incidents} incidents this month
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge
                          variant={
                            issue.severity === "high"
                              ? "destructive"
                              : issue.severity === "medium"
                              ? "secondary"
                              : "default"
                          }
                        >
                          {issue.severity}
                        </Badge>
                        <div
                          className={`text-xs px-2 py-1 rounded ${
                            issue.trend === "decreasing"
                              ? "bg-green-100 text-green-700"
                              : issue.trend === "increasing"
                              ? "bg-red-100 text-red-700"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {issue.trend}
                        </div>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          issue.compliance >= 90
                            ? "bg-green-500"
                            : issue.compliance >= 80
                            ? "bg-yellow-500"
                            : "bg-red-500"
                        }`}
                        style={{ width: `${issue.compliance}%` }}
                      ></div>
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      {issue.compliance}% compliance rate
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quality Standards Compliance */}
          <Card className="bg-white rounded-xl shadow-sm border border-gray-200">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-gray-900 flex items-center">
                <Target className="h-5 w-5 mr-2 text-blue-600" />
                Quality Standards Compliance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {qualityStandardsCompliance.map((standard, index) => (
                  <div
                    key={index}
                    className="p-4 border border-gray-200 rounded-lg"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="font-medium text-gray-900">
                          {standard.standard}
                        </div>
                        <div className="text-sm text-gray-500">
                          Last audit:{" "}
                          {new Date(standard.lastAudit).toLocaleDateString()}
                        </div>
                      </div>
                      <Badge
                        variant={
                          standard.status === "compliant"
                            ? "default"
                            : standard.status === "minor-issues"
                            ? "secondary"
                            : "destructive"
                        }
                      >
                        {standard.compliance}%
                      </Badge>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                      <div
                        className={`h-2 rounded-full ${
                          standard.status === "compliant"
                            ? "bg-green-500"
                            : standard.status === "minor-issues"
                            ? "bg-yellow-500"
                            : "bg-red-500"
                        }`}
                        style={{ width: `${standard.compliance}%` }}
                      ></div>
                    </div>
                    <div className="text-sm text-gray-600">
                      Next audit:{" "}
                      {new Date(standard.nextAudit).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quality Control Processes */}
        <Card className="bg-white rounded-xl shadow-sm border border-gray-200">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-gray-900">
              Quality Control Process Effectiveness
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {qualityControlProcesses.map((process, index) => (
                <div
                  key={index}
                  className="p-4 border border-gray-200 rounded-lg"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-medium text-gray-900">
                      {process.process}
                    </div>
                    <div className="text-lg font-bold text-gray-900">
                      {process.effectiveness}%
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                    <div
                      className={`h-2 rounded-full ${
                        process.effectiveness >= 95
                          ? "bg-green-500"
                          : process.effectiveness >= 85
                          ? "bg-yellow-500"
                          : "bg-red-500"
                      }`}
                      style={{ width: `${process.effectiveness}%` }}
                    ></div>
                  </div>
                  <div className="text-sm text-gray-500">
                    {process.incidents} incidents this month
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quality-Related Incidents */}
        <Card className="bg-white rounded-xl shadow-sm border border-gray-200">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-gray-900">
              Recent Quality-Related Incidents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {incidents
                ?.filter(
                  (incident) => incident.department === "Quality Control"
                )
                .slice(0, 5)
                .map((incident, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <div
                        className={`w-3 h-3 rounded-full ${
                          incident.riskLevel === "high"
                            ? "bg-red-500"
                            : incident.riskLevel === "medium"
                            ? "bg-yellow-500"
                            : "bg-green-500"
                        }`}
                      ></div>
                      <div>
                        <div className="font-medium text-gray-900">
                          {incident.incidentId}
                        </div>
                        <div className="text-sm text-gray-500">
                          {incident.hazardType}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge
                        variant={
                          incident.riskLevel === "high"
                            ? "destructive"
                            : "secondary"
                        }
                      >
                        {incident.riskLevel}
                      </Badge>
                      <div className="text-sm text-gray-500 mt-1">
                        {new Date(incident.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                )) || (
                <div className="text-center py-8 text-gray-500">
                  No quality-related incidents found
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
