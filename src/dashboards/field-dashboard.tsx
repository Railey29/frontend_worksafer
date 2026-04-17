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
  Wrench,
  HardHat,
  Cog,
  AlertTriangle,
  CheckCircle,
  Clock,
  Settings,
} from "lucide-react";
import { useToast } from "../hooks/use-toast";
import type { ComplianceRecord, Incident } from "../shared/schema";

export default function FieldDashboard() {
  const { toast } = useToast();

  const { data: complianceData, isLoading: complianceLoading } = useQuery<
    ComplianceRecord[]
  >({
    queryKey: ["/api/compliance"],
  });

  const { data: incidents } = useQuery<Incident[]>({
    queryKey: ["/api/incidents"],
  });

  const fieldComplianceData = complianceData?.filter(
    (record) => record.department === "Field Operations",
  );

  const handleExportCompliance = () => {
    const csvContent = fieldComplianceData?.map((record) => ({
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
      a.download = "field-operations-compliance-report.csv";
      a.click();

      toast({
        title: "Export Complete",
        description:
          "Field Operations compliance report downloaded successfully",
      });
    }
  };

  const operationalMetrics = {
    totalEquipment: 156,
    equipmentOperational: 142,
    maintenanceDue: 14,
    safetyComplianceRate: 91,
  };

  const operationalSafetyData = [
    {
      procedure: "Pre-Operation Safety Checks",
      compliance: 94,
      incidents: 2,
      status: "good",
    },
    {
      procedure: "Equipment Lockout/Tagout",
      compliance: 89,
      incidents: 4,
      status: "warning",
    },
    {
      procedure: "Personal Protective Equipment",
      compliance: 96,
      incidents: 1,
      status: "good",
    },
    {
      procedure: "Emergency Shutdown Procedures",
      compliance: 87,
      incidents: 3,
      status: "warning",
    },
    {
      procedure: "Hazardous Material Handling",
      compliance: 82,
      incidents: 6,
      status: "danger",
    },
  ];

  const equipmentMaintenanceData = [
    {
      equipment: "Heavy Machinery",
      totalUnits: 45,
      operational: 42,
      maintenanceDue: 3,
      complianceRate: 93,
    },
    {
      equipment: "Safety Equipment",
      totalUnits: 78,
      operational: 76,
      maintenanceDue: 2,
      complianceRate: 97,
    },
    {
      equipment: "Monitoring Devices",
      totalUnits: 23,
      operational: 19,
      maintenanceDue: 4,
      complianceRate: 83,
    },
    {
      equipment: "Emergency Systems",
      totalUnits: 10,
      operational: 5,
      maintenanceDue: 5,
      complianceRate: 50,
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
              Field Operations Group
            </h1>
            <p className="text-gray-600 mt-2">
              Operational Safety & Equipment Maintenance Compliance
            </p>
          </div>
          <Button
            onClick={handleExportCompliance}
            className="bg-primary hover:bg-blue-700"
          >
            <Download className="h-4 w-4 mr-2" />
            Export Field Operations Report
          </Button>
        </div>

        {/* Overview Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Total Equipment"
            value={operationalMetrics.totalEquipment}
            icon={Cog}
            iconColor="primary"
          />
          <MetricCard
            title="Operational"
            value={operationalMetrics.equipmentOperational}
            icon={CheckCircle}
            iconColor="success"
          />
          <MetricCard
            title="Safety Compliance"
            value={`${operationalMetrics.safetyComplianceRate}%`}
            icon={HardHat}
            iconColor="success"
          />
          <MetricCard
            title="Maintenance Due"
            value={operationalMetrics.maintenanceDue}
            icon={Clock}
            iconColor="warning"
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Operational Safety Procedures */}
          <Card className="bg-white rounded-xl shadow-sm border border-gray-200">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-gray-900 flex items-center">
                <HardHat className="h-5 w-5 mr-2 text-orange-600" />
                Operational Safety Procedures
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {operationalSafetyData.map((procedure, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-gray-700">
                        {procedure.procedure}
                      </span>
                      <div className="flex items-center space-x-2">
                        <Badge
                          variant={
                            procedure.status === "good"
                              ? "default"
                              : procedure.status === "warning"
                                ? "secondary"
                                : "destructive"
                          }
                        >
                          {procedure.compliance}%
                        </Badge>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          procedure.status === "good"
                            ? "bg-green-500"
                            : procedure.status === "warning"
                              ? "bg-yellow-500"
                              : "bg-red-500"
                        }`}
                        style={{ width: `${procedure.compliance}%` }}
                      ></div>
                    </div>
                    <div className="text-sm text-gray-500">
                      {procedure.incidents} incidents related to this procedure
                      this month
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Equipment Maintenance Compliance */}
          <Card className="bg-white rounded-xl shadow-sm border border-gray-200">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-gray-900 flex items-center">
                <Wrench className="h-5 w-5 mr-2 text-blue-600" />
                Equipment Maintenance Compliance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {equipmentMaintenanceData.map((equipment, index) => (
                  <div
                    key={index}
                    className="p-4 border border-gray-200 rounded-lg"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="font-medium text-gray-900">
                          {equipment.equipment}
                        </div>
                        <div className="text-sm text-gray-500">
                          {equipment.operational} of {equipment.totalUnits}{" "}
                          operational
                        </div>
                      </div>
                      <Badge
                        variant={
                          equipment.complianceRate >= 90
                            ? "default"
                            : equipment.complianceRate >= 75
                              ? "secondary"
                              : "destructive"
                        }
                      >
                        {equipment.complianceRate}%
                      </Badge>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                      <div
                        className={`h-2 rounded-full ${
                          equipment.complianceRate >= 90
                            ? "bg-green-500"
                            : equipment.complianceRate >= 75
                              ? "bg-yellow-500"
                              : "bg-red-500"
                        }`}
                        style={{ width: `${equipment.complianceRate}%` }}
                      ></div>
                    </div>
                    {equipment.maintenanceDue > 0 && (
                      <div className="text-sm text-orange-600 font-medium">
                        {equipment.maintenanceDue} units require maintenance
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Field Operations Incidents */}
        <Card className="bg-white rounded-xl shadow-sm border border-gray-200">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-gray-900">
              Recent Field Operations Incidents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {incidents
                ?.filter(
                  (incident) => incident.department === "Field Operations",
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
                  No field operations incidents found
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
