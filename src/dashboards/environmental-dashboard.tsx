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
  Leaf,
  Droplet,
  Wind,
  AlertTriangle,
  CheckCircle,
  TreePine,
  Factory,
} from "lucide-react";
import { useToast } from "../hooks/use-toast";
import type { ComplianceRecord, Incident } from "../shared/schema";

export default function EnvironmentalDashboard() {
  const { toast } = useToast();

  const { data: complianceData, isLoading: complianceLoading } = useQuery<
    ComplianceRecord[]
  >({
    queryKey: ["/api/compliance"],
  });

  const { data: incidents } = useQuery<Incident[]>({
    queryKey: ["/api/incidents"],
  });

  const environmentalComplianceData = complianceData?.filter(
    (record) => record.department === "Environmental",
  );

  const handleExportCompliance = () => {
    const csvContent = environmentalComplianceData?.map((record) => ({
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
      a.download = "environmental-compliance-report.csv";
      a.click();

      toast({
        title: "Export Complete",
        description: "Environmental compliance report downloaded successfully",
      });
    }
  };

  const environmentalMetrics = {
    carbonFootprint: 2.4,
    wasteReduction: 18,
    ecoCompliance: 94,
    hazardousIncidents: 3,
  };

  const ecologicalPlanCompliance = [
    {
      plan: "Carbon Emission Reduction",
      target: 25,
      achieved: 22,
      compliance: 88,
      status: "on-track",
    },
    {
      plan: "Waste Management Program",
      target: 20,
      achieved: 18,
      compliance: 90,
      status: "on-track",
    },
    {
      plan: "Water Conservation Initiative",
      target: 15,
      achieved: 19,
      compliance: 127,
      status: "exceeded",
    },
    {
      plan: "Renewable Energy Adoption",
      target: 30,
      achieved: 24,
      compliance: 80,
      status: "behind",
    },
    {
      plan: "Biodiversity Protection",
      target: 100,
      achieved: 95,
      compliance: 95,
      status: "on-track",
    },
  ];

  const environmentalHazardMonitoring = [
    {
      hazard: "Air Quality Index",
      level: "Good",
      value: 45,
      threshold: 50,
      status: "safe",
    },
    {
      hazard: "Water Contamination",
      level: "Low",
      value: 12,
      threshold: 20,
      status: "safe",
    },
    {
      hazard: "Soil Pollution",
      level: "Moderate",
      value: 35,
      threshold: 30,
      status: "warning",
    },
    {
      hazard: "Noise Pollution",
      level: "High",
      value: 85,
      threshold: 70,
      status: "danger",
    },
    {
      hazard: "Chemical Exposure",
      level: "Low",
      value: 8,
      threshold: 15,
      status: "safe",
    },
  ];

  const environmentalRegulations = [
    {
      regulation: "EPA Clean Air Act",
      compliance: 96,
      lastInspection: "2024-05-20",
      status: "compliant",
    },
    {
      regulation: "Clean Water Act",
      compliance: 92,
      lastInspection: "2024-04-15",
      status: "compliant",
    },
    {
      regulation: "Resource Conservation",
      compliance: 88,
      lastInspection: "2024-06-01",
      status: "minor-issues",
    },
    {
      regulation: "Hazardous Waste Management",
      compliance: 94,
      lastInspection: "2024-05-10",
      status: "compliant",
    },
    {
      regulation: "Environmental Impact Assessment",
      compliance: 85,
      lastInspection: "2024-03-25",
      status: "action-required",
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
              Environmental Department
            </h1>
            <p className="text-gray-600 mt-2">
              Ecological Plan Compliance & Environmental Hazard Monitoring
            </p>
          </div>
          <Button
            onClick={handleExportCompliance}
            className="bg-primary hover:bg-blue-700"
          >
            <Download className="h-4 w-4 mr-2" />
            Export Environmental Report
          </Button>
        </div>

        {/* Overview Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Carbon Footprint"
            value={`${environmentalMetrics.carbonFootprint}t CO₂`}
            icon={Factory}
            iconColor="warning"
          />
          <MetricCard
            title="Waste Reduction"
            value={`${environmentalMetrics.wasteReduction}%`}
            icon={Leaf}
            iconColor="success"
          />
          <MetricCard
            title="Eco Compliance"
            value={`${environmentalMetrics.ecoCompliance}%`}
            icon={CheckCircle}
            iconColor="success"
          />
          <MetricCard
            title="Environmental Incidents"
            value={environmentalMetrics.hazardousIncidents}
            icon={AlertTriangle}
            iconColor="destructive"
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Ecological Plan Compliance */}
          <Card className="bg-white rounded-xl shadow-sm border border-gray-200">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-gray-900 flex items-center">
                <TreePine className="h-5 w-5 mr-2 text-green-600" />
                Ecological Plan Compliance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {ecologicalPlanCompliance.map((plan, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-gray-700">
                        {plan.plan}
                      </span>
                      <div className="flex items-center space-x-2">
                        <Badge
                          variant={
                            plan.status === "exceeded"
                              ? "default"
                              : plan.status === "on-track"
                                ? "secondary"
                                : "destructive"
                          }
                        >
                          {plan.compliance}%
                        </Badge>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          plan.status === "exceeded"
                            ? "bg-blue-500"
                            : plan.status === "on-track"
                              ? "bg-green-500"
                              : "bg-red-500"
                        }`}
                        style={{ width: `${Math.min(plan.compliance, 100)}%` }}
                      ></div>
                    </div>
                    <div className="text-sm text-gray-500">
                      Achieved: {plan.achieved}% | Target: {plan.target}%
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Environmental Hazard Monitoring */}
          <Card className="bg-white rounded-xl shadow-sm border border-gray-200">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-gray-900 flex items-center">
                <Wind className="h-5 w-5 mr-2 text-blue-600" />
                Environmental Hazard Monitoring
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {environmentalHazardMonitoring.map((hazard, index) => (
                  <div
                    key={index}
                    className="p-4 border border-gray-200 rounded-lg"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="font-medium text-gray-900">
                          {hazard.hazard}
                        </div>
                        <div className="text-sm text-gray-500">
                          Current: {hazard.value} | Threshold:{" "}
                          {hazard.threshold}
                        </div>
                      </div>
                      <Badge
                        variant={
                          hazard.status === "safe"
                            ? "default"
                            : hazard.status === "warning"
                              ? "secondary"
                              : "destructive"
                        }
                      >
                        {hazard.level}
                      </Badge>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          hazard.status === "safe"
                            ? "bg-green-500"
                            : hazard.status === "warning"
                              ? "bg-yellow-500"
                              : "bg-red-500"
                        }`}
                        style={{
                          width: `${(hazard.value / hazard.threshold) * 100}%`,
                        }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Environmental Regulations Compliance */}
        <Card className="bg-white rounded-xl shadow-sm border border-gray-200">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-gray-900">
              Environmental Regulations Compliance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {environmentalRegulations.map((regulation, index) => (
                <div
                  key={index}
                  className="p-4 border border-gray-200 rounded-lg"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-medium text-gray-900">
                      {regulation.regulation}
                    </div>
                    <Badge
                      variant={
                        regulation.status === "compliant"
                          ? "default"
                          : regulation.status === "minor-issues"
                            ? "secondary"
                            : "destructive"
                      }
                    >
                      {regulation.compliance}%
                    </Badge>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                    <div
                      className={`h-2 rounded-full ${
                        regulation.status === "compliant"
                          ? "bg-green-500"
                          : regulation.status === "minor-issues"
                            ? "bg-yellow-500"
                            : "bg-red-500"
                      }`}
                      style={{ width: `${regulation.compliance}%` }}
                    ></div>
                  </div>
                  <div className="text-sm text-gray-500">
                    Last inspection:{" "}
                    {new Date(regulation.lastInspection).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Environmental Incidents */}
        <Card className="bg-white rounded-xl shadow-sm border border-gray-200">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-gray-900">
              Recent Environmental Incidents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {incidents
                ?.filter((incident) => incident.department === "Environmental")
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
                  No environmental incidents found
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
