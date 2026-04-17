import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { MetricCard } from "../components/ui/metric-card";
import {
  Download,
  Users,
  GraduationCap,
  AlertTriangle,
  CheckCircle,
  Clock,
  BookOpen,
} from "lucide-react";
import { useToast } from "../hooks/use-toast";
import type { ComplianceRecord, Incident } from "../shared/schema";

export default function HRDashboard() {
  const { toast } = useToast();

  const { data: complianceData, isLoading: complianceLoading } = useQuery<
    ComplianceRecord[]
  >({
    queryKey: ["/api/compliance"],
  });

  const { data: incidents } = useQuery<Incident[]>({
    queryKey: ["/api/incidents"],
  });

  const hrComplianceData = complianceData?.filter(
    (record) => record.department === "Human Resources",
  );

  const handleExportCompliance = () => {
    const csvContent = hrComplianceData?.map((record) => ({
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
      a.download = "hr-compliance-report.csv";
      a.click();

      toast({
        title: "Export Complete",
        description: "HR compliance report downloaded successfully",
      });
    }
  };

  const skillCompetencyMetrics = {
    totalEmployees: 247,
    trainedEmployees: 219,
    certificationsDue: 28,
    safetyTrainingRate: Math.round((219 / 247) * 100),
  };

  const trainingComplianceData = [
    {
      area: "Safety Protocol Training",
      compliance: 92,
      required: 247,
      completed: 227,
      status: "good",
    },
    {
      area: "Emergency Response",
      compliance: 88,
      required: 247,
      completed: 217,
      status: "warning",
    },
    {
      area: "PPE Usage Certification",
      compliance: 95,
      required: 247,
      completed: 235,
      status: "good",
    },
    {
      area: "Hazard Recognition",
      compliance: 85,
      required: 247,
      completed: 210,
      status: "warning",
    },
    {
      area: "First Aid Certification",
      compliance: 78,
      required: 247,
      completed: 192,
      status: "danger",
    },
  ];

  const personnelSafetyProtocols = [
    { protocol: "Daily Safety Briefings", adherence: 94, incidents: 2 },
    { protocol: "Pre-task Safety Checks", adherence: 89, incidents: 5 },
    { protocol: "Incident Reporting", adherence: 97, incidents: 1 },
    { protocol: "Safety Equipment Checks", adherence: 91, incidents: 3 },
    { protocol: "Emergency Procedures", adherence: 86, incidents: 4 },
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
              Human Resources Department
            </h1>
            <p className="text-gray-600 mt-2">
              Personnel Safety & Skill Competency Monitoring
            </p>
          </div>
          <Button
            onClick={handleExportCompliance}
            className="bg-primary hover:bg-blue-700"
          >
            <Download className="h-4 w-4 mr-2" />
            Export HR Compliance
          </Button>
        </div>

        {/* Overview Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Total Employees"
            value={skillCompetencyMetrics.totalEmployees}
            icon={Users}
            iconColor="primary"
          />
          <MetricCard
            title="Safety Trained"
            value={skillCompetencyMetrics.trainedEmployees}
            icon={GraduationCap}
            iconColor="success"
          />
          <MetricCard
            title="Training Rate"
            value={`${skillCompetencyMetrics.safetyTrainingRate}%`}
            icon={CheckCircle}
            iconColor="success"
          />
          <MetricCard
            title="Certifications Due"
            value={skillCompetencyMetrics.certificationsDue}
            icon={Clock}
            iconColor="warning"
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Skill Competency Compliance */}
          <Card className="bg-white rounded-xl shadow-sm border border-gray-200">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-gray-900 flex items-center">
                <BookOpen className="h-5 w-5 mr-2 text-blue-600" />
                Skill Competency Compliance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {trainingComplianceData.map((training, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-gray-700">
                        {training.area}
                      </span>
                      <div className="flex items-center space-x-2">
                        <Badge
                          variant={
                            training.status === "good"
                              ? "default"
                              : training.status === "warning"
                                ? "secondary"
                                : "destructive"
                          }
                        >
                          {training.compliance}%
                        </Badge>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          training.status === "good"
                            ? "bg-green-500"
                            : training.status === "warning"
                              ? "bg-yellow-500"
                              : "bg-red-500"
                        }`}
                        style={{ width: `${training.compliance}%` }}
                      ></div>
                    </div>
                    <div className="text-sm text-gray-500">
                      {training.completed} of {training.required} employees
                      completed
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Personnel Safety Protocol Adherence */}
          <Card className="bg-white rounded-xl shadow-sm border border-gray-200">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-gray-900 flex items-center">
                <AlertTriangle className="h-5 w-5 mr-2 text-orange-600" />
                Safety Protocol Adherence
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {personnelSafetyProtocols.map((protocol, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">
                        {protocol.protocol}
                      </div>
                      <div className="text-sm text-gray-500">
                        {protocol.incidents} incidents this month
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-lg text-gray-900">
                        {protocol.adherence}%
                      </div>
                      <div
                        className={`text-sm ${
                          protocol.adherence >= 95
                            ? "text-green-600"
                            : protocol.adherence >= 85
                              ? "text-yellow-600"
                              : "text-red-600"
                        }`}
                      >
                        {protocol.adherence >= 95
                          ? "Excellent"
                          : protocol.adherence >= 85
                            ? "Good"
                            : "Needs Improvement"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* HR-Related Incidents */}
        <Card className="bg-white rounded-xl shadow-sm border border-gray-200">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-gray-900">
              Recent HR-Related Incidents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {incidents
                ?.filter(
                  (incident) => incident.department === "Human Resources",
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
                  No HR-related incidents found
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
