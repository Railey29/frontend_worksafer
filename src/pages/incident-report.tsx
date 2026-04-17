import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Label } from "../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import { useToast } from "../hooks/use-toast";
import {
  Camera,
  Upload,
  Loader2,
  FileText,
  Shield,
  Download,
  ChevronDown,
  AlertTriangle,
  HardHat,
  Eye,
  ShieldAlert,
  XCircle,
  CheckCircle2,
  ArrowLeft,
  Users,
  Flame,
  Ban,
  ClipboardList,
  Brain,
  MapPin,
  User,
  ArrowRight,
  FileCheck,
} from "lucide-react";
import type {
  SHEReport,
  SHEDepartments,
  RiskLevel,
} from "../components/lib/she-api-types";
import {
  RISK_COLORS,
  SEVERITY_COLORS,
  PPE_LABELS,
} from "../components/lib/she-api-types";
import {
  analyzeIncidentImage,
  fetchDepartments,
} from "../components/lib/she-api";
import {
  downloadCSV,
  downloadExcel,
  downloadPDF,
  downloadJSON,
} from "../components/lib/she-export";
import { getStoredUser } from "../utils/user";

// ── Navigation Prompt Banner ──────────────────────────────────────────
function NavigationPromptBanner({
  onGoToReports,
}: {
  onGoToReports: () => void;
}) {
  return (
    <div className="rounded-xl border-2 border-blue-400 bg-blue-50 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100">
          <FileCheck className="h-5 w-5 text-blue-600" />
        </div>
        <div>
          <p className="font-semibold text-blue-900">
            Incident Report Generated Successfully
          </p>
          <p className="text-sm text-blue-700 mt-0.5">
            The report has been saved and is ready for officer review. Head to
            the <strong>Reports page</strong> where the Safety Officer can
            verify, <strong>Accept</strong> or <strong>Modify</strong> the
            report to ensure accuracy before compliance actions are taken.
          </p>
        </div>
      </div>
      <Button
        onClick={onGoToReports}
        className="shrink-0 bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
      >
        Go to Reports
        <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </div>
  );
}

export default function IncidentReport() {
  const [, navigate] = useLocation();

  const user = getStoredUser();
  const isSafetyDept = user?.department === "Safety Department";

  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [department, setDepartment] = useState<string>("field");
  const [report, setReport] = useState<SHEReport | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [description, setDescription] = useState("");
  const [showDescriptionError, setShowDescriptionError] = useState(false);
  const [location, setLocation] = useState("");
  const [incidentDate, setIncidentDate] = useState("");
  const [incidentTime, setIncidentTime] = useState("");
  const { toast } = useToast();

  const { data: departments } = useQuery<SHEDepartments>({
    queryKey: ["she-departments"],
    queryFn: fetchDepartments,
  });

  const analyzeMutation = useMutation({
    mutationFn: (file: File) =>
      analyzeIncidentImage({
        file,
        department,
        description: description || undefined,
        location: location || undefined,
        incident_date: incidentDate || undefined,
        incident_time: incidentTime || undefined,
      }),
    onSuccess: (data: SHEReport) => {
      setReport(data);
      setShowResults(true);
      toast({
        title: "Analysis Complete",
        description: "AI has generated your EEI SHE incident report",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Analysis Failed",
        description:
          error.message || "Failed to analyze the photo. Please try again.",
        variant: "destructive",
      });
    },
  });

  const processFile = (file: File) => {
    const validTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      toast({
        title: "Invalid File",
        description: "Please upload a JPG, PNG, or WebP image.",
        variant: "destructive",
      });
      return;
    }
    setSelectedImage(file);
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmitAnalysis = () => {
    if (!description.trim()) {
      setShowDescriptionError(true);
      toast({
        title: "Required Field Missing",
        description: "Please provide an Incident Description before analyzing.",
        variant: "destructive",
      });
      return;
    }
    setShowDescriptionError(false);
    if (selectedImage) {
      analyzeMutation.mutate(selectedImage);
    }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
  };

  const resetForm = () => {
    setSelectedImage(null);
    setImagePreview(null);
    setReport(null);
    setShowResults(false);
    setDescription("");
    setShowDescriptionError(false);
    setLocation("");
    setIncidentDate("");
    setIncidentTime("");
  };

  const handleExport = (format: string) => {
    if (!report) return;
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

  const riskLevel = (report?.summary?.overall_risk_level ||
    "medium") as RiskLevel;
  const riskStyle = RISK_COLORS[riskLevel] || RISK_COLORS.medium;

  const getUserDisplayName = () => {
    if (!user) return "Unknown User";
    return (
      user.name || user.full_name || user.email?.split("@")[0] || "Unknown"
    );
  };

  const getUserDepartment = () => {
    if (!user) return "Unknown Department";
    return user.department || "Unknown";
  };

  // ── ACCESS GUARD ──
  if (!isSafetyDept) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardContent className="p-12 text-center">
            <Shield className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Access Restricted
            </h2>
            <p className="text-gray-600 mb-4">
              Only the Safety Department can file incident reports. You can view
              reports filed about your department in the Reports tab.
            </p>
            <Button onClick={() => navigate("/reports")}>Go to Reports</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── UPLOAD VIEW ──
  if (!showResults) {
    const hasPhoto = !!selectedImage;

    const handleRemovePhoto = () => {
      setSelectedImage(null);
      setImagePreview(null);
      const input = document.getElementById("photo-upload") as HTMLInputElement;
      if (input) input.value = "";
    };

    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <Shield className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  AI-Powered Incident Reporting
                </h1>
                <p className="text-lg text-gray-600">
                  Upload a photo — AI analyzes PPE, hazards &amp; behaviors
                </p>
              </div>
            </div>
            {user && (
              <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-4 py-2">
                <User className="h-4 w-4 text-gray-600" />
                <div className="text-sm">
                  <p className="font-semibold text-gray-900">
                    {getUserDisplayName()}
                  </p>
                  <p className="text-xs text-gray-500">{getUserDepartment()}</p>
                </div>
              </div>
            )}
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>How it works:</strong> Fill in the incident details below,
              upload a photo of the incident scene, then click Analyze. The AI
              will analyze PPE compliance, environmental hazards, and unsafe
              behaviors, then generate a complete EEI SHE incident report.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* LEFT: Form Fields */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="h-5 w-5" />
                Incident Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label className="block text-sm font-medium text-gray-700 mb-2">
                  Department (Where incident occurred)
                </Label>
                <Select value={department} onValueChange={setDepartment}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments ? (
                      Object.entries(departments).map(([key, val]) => (
                        <SelectItem key={key} value={key}>
                          {val.label}
                        </SelectItem>
                      ))
                    ) : (
                      <>
                        <SelectItem value="field">
                          Field Operations Group
                        </SelectItem>
                        <SelectItem value="quality">Quality Control</SelectItem>
                        <SelectItem value="environmental">
                          Environmental
                        </SelectItem>
                        <SelectItem value="hr">Human Resources</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label
                  htmlFor="description"
                  className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1"
                >
                  Incident Description <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="description"
                  placeholder="Brief description of the incident..."
                  value={description}
                  onChange={(e) => {
                    setDescription(e.target.value);
                    if (showDescriptionError && e.target.value.trim())
                      setShowDescriptionError(false);
                  }}
                  className={`w-full ${showDescriptionError ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                  rows={4}
                  required
                />
              </div>

              <div>
                <Label
                  htmlFor="location"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Location (optional)
                </Label>
                <Input
                  id="location"
                  placeholder="e.g., Building A, Floor 3, Section C"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label
                    htmlFor="incident-date"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Incident Date (optional)
                  </Label>
                  <Input
                    id="incident-date"
                    type="date"
                    value={incidentDate}
                    onChange={(e) => setIncidentDate(e.target.value)}
                    className="w-full"
                  />
                </div>
                <div>
                  <Label
                    htmlFor="incident-time"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Incident Time (optional)
                  </Label>
                  <Input
                    id="incident-time"
                    type="time"
                    value={incidentTime}
                    onChange={(e) => setIncidentTime(e.target.value)}
                    className="w-full"
                  />
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                <p className="text-xs text-gray-500 mb-1">
                  This report will be filed by:
                </p>
                <p className="text-sm font-semibold text-gray-900">
                  {getUserDisplayName()}
                </p>
                <p className="text-xs text-gray-500">{getUserDepartment()}</p>
              </div>
            </CardContent>
          </Card>

          {/* RIGHT: Photo Upload */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Upload Incident Photo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div
                className={`border-2 border-dashed rounded-lg p-10 transition-colors ${
                  hasPhoto
                    ? "border-gray-200 bg-gray-50 cursor-not-allowed opacity-60"
                    : isDragging
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-300 hover:border-blue-400 hover:bg-blue-50/30"
                }`}
                onDrop={hasPhoto ? undefined : handleDrop}
                onDragOver={hasPhoto ? undefined : handleDragOver}
                onDragLeave={hasPhoto ? undefined : handleDragLeave}
              >
                <div className="text-center">
                  {isDragging && !hasPhoto ? (
                    <>
                      <Upload className="mx-auto h-14 w-14 text-blue-500 animate-bounce" />
                      <p className="mt-4 text-lg font-medium text-blue-700">
                        Drop image here
                      </p>
                    </>
                  ) : imagePreview ? (
                    <img
                      src={imagePreview}
                      alt="Incident preview"
                      className="mx-auto max-h-56 rounded-lg shadow-md object-contain"
                    />
                  ) : (
                    <>
                      <Camera className="mx-auto h-14 w-14 text-gray-400" />
                      <div className="mt-4">
                        <span className="block text-base font-medium text-gray-900">
                          Drag &amp; drop or click to upload
                        </span>
                        <span className="mt-1 block text-sm text-gray-500">
                          JPG, PNG, WebP
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <input
                id="photo-upload"
                type="file"
                accept=".jpg,.jpeg,.png,.webp"
                onChange={handleImageUpload}
                className="hidden"
                disabled={hasPhoto}
              />

              <div className="flex gap-3">
                {!hasPhoto ? (
                  <Button className="flex-1" asChild>
                    <label htmlFor="photo-upload" className="cursor-pointer">
                      <Upload className="mr-2 h-4 w-4" />
                      Choose Photo
                    </label>
                  </Button>
                ) : (
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={handleRemovePhoto}
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    Remove Photo
                  </Button>
                )}
              </div>

              {hasPhoto && !analyzeMutation.isPending && (
                <Button
                  size="lg"
                  onClick={handleSubmitAnalysis}
                  className="w-full"
                >
                  <Shield className="mr-2 h-5 w-5" />
                  Analyze Incident
                </Button>
              )}

              {analyzeMutation.isPending && (
                <div className="text-center py-4">
                  <Loader2 className="mx-auto h-10 w-10 animate-spin text-blue-600" />
                  <p className="mt-3 text-base font-medium text-gray-900">
                    AI Analyzing Incident Scene...
                  </p>
                  <p className="mt-1 text-sm text-gray-600">
                    Checking PPE compliance, environmental hazards, and unsafe
                    behaviors
                  </p>
                  <div className="mt-3 flex justify-center flex-wrap gap-3 text-xs text-gray-500">
                    <span>PPE Detection</span>
                    <span>·</span>
                    <span>Hazard Analysis</span>
                    <span>·</span>
                    <span>Behavior Assessment</span>
                    <span>·</span>
                    <span>Report Generation</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="mt-8 text-center text-sm text-gray-500">
          <p>
            Powered by AI - Compliant with EEI Corporation SHE Department
            Standards
          </p>
        </div>
      </div>
    );
  }

  // ── RESULTS VIEW ──
  if (!report) return null;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={resetForm}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Upload New Photo
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export Report
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

      {/* ── NAVIGATION PROMPT — top of results ── */}
      <NavigationPromptBanner onGoToReports={() => navigate("/reports")} />

      {/* Report Header */}
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
                {report.report_header.department_name} -{" "}
                {report.report_header.analyzed_department}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {report.report_header.report_date} at{" "}
                {report.report_header.report_time}
              </p>
              {report.created_by && (
                <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                  <User className="h-3 w-3" />
                  <span>
                    Reported by: {report.created_by.full_name} (
                    {report.created_by.department})
                  </span>
                </div>
              )}
            </div>
            <div className="flex flex-col items-center gap-2">
              <Badge
                className={`text-lg px-4 py-2 ${riskStyle.bg} ${riskStyle.text}`}
              >
                {riskLevel.toUpperCase()} RISK
              </Badge>
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
        </CardContent>
      </Card>

      {/* AI Summary */}
      {report.ai_summary && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Brain className="h-4 w-4" />
              AI Incident Summary
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

      {/* Incident Details */}
      {report.incident_details && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MapPin className="h-4 w-4" />
              Incident Details
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

      {/* AI Classification */}
      {report.ai_classification && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Eye className="h-4 w-4" />
              AI Department Classification
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

      {/* Analyzed Image */}
      {(report.incident_image?.data_url || imagePreview) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Camera className="h-4 w-4" />
              Analyzed Image
            </CardTitle>
          </CardHeader>
          <CardContent>
            <img
              src={report.incident_image?.data_url || imagePreview!}
              alt="Analyzed incident scene"
              className="w-full max-h-80 object-contain rounded-lg"
            />
          </CardContent>
        </Card>
      )}

      {/* Scene Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4" />
            Scene Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-700 mb-4">
            {report.summary.scene_description}
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              icon={<Users className="h-5 w-5 text-blue-600" />}
              label="Workers"
              value={report.summary.worker_count}
            />
            <StatCard
              icon={<AlertTriangle className="h-5 w-5 text-red-500" />}
              label="Total Findings"
              value={report.summary.total_findings}
            />
            <StatCard
              icon={<HardHat className="h-5 w-5 text-orange-500" />}
              label="PPE Violations"
              value={report.summary.ppe_violations}
            />
            <StatCard
              icon={<Flame className="h-5 w-5 text-yellow-600" />}
              label="Env. Hazards"
              value={report.summary.environmental_hazards}
            />
          </div>
        </CardContent>
      </Card>

      {/* PPE Compliance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <HardHat className="h-4 w-4" />
            PPE Compliance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {Object.entries(report.ppe_compliance.ppe_status)
              .filter(([key]) => key !== "no_safety_gear")
              .map(([key, val]) => (
                <div
                  key={key}
                  className={`flex items-center gap-2 p-3 rounded-lg border ${val === 1 ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}
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
                    <SeverityBadge severity={h.severity} />
                    <div>
                      <p className="text-sm font-medium">{h.hazard}</p>
                      <p className="text-xs text-gray-500">
                        Missing: {h.missing_ppe}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Environmental Hazards */}
      {report.environmental_hazards.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Flame className="h-4 w-4" />
              Environmental Hazards ({report.environmental_hazards.length})
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

      {/* Unsafe Behaviors */}
      {report.unsafe_behaviors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Ban className="h-4 w-4" />
              Unsafe Behaviors ({report.unsafe_behaviors.length})
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

      {/* Corrective Actions */}
      {report.corrective_actions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ClipboardList className="h-4 w-4" />
              Corrective Actions ({report.corrective_actions.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-3 font-semibold text-gray-700">
                      Priority
                    </th>
                    <th className="text-left py-2 px-3 font-semibold text-gray-700">
                      Category
                    </th>
                    <th className="text-left py-2 px-3 font-semibold text-gray-700">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {report.corrective_actions.map((a, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="py-2 px-3">
                        <SeverityBadge severity={a.priority} />
                      </td>
                      <td className="py-2 px-3 text-gray-600">{a.category}</td>
                      <td className="py-2 px-3">{a.action}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Risk Assessment */}
      <Card className={`border-2 ${riskStyle.border}`}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldAlert className="h-4 w-4" />
            Overall Risk Assessment
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-center">
            <Badge
              className={`text-base px-4 py-2 ${riskStyle.bg} ${riskStyle.text}`}
            >
              {report.risk_assessment.overall_risk.toUpperCase()}
            </Badge>
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

      {/* Bottom Navigation Prompt (repeated for long reports) */}
      <NavigationPromptBanner onGoToReports={() => navigate("/reports")} />

      <div className="text-center text-sm text-gray-500 pb-4">
        <p>
          Powered by AI - EEI Corporation SHE Department - Report generated{" "}
          {report.report_header.report_date} at{" "}
          {report.report_header.report_time}
        </p>
      </div>
    </div>
  );
}

// ── Helper Components ──────────────────────────────────────────────────

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
  const s = SEVERITY_COLORS[severity] || SEVERITY_COLORS.medium;
  return <Badge className={`${s.bg} ${s.text} text-xs`}>{severity}</Badge>;
}
