import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import {
  Download,
  Search,
  Filter,
  Eye,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
} from "lucide-react";
import { useToast } from "../hooks/use-toast";

interface AuditLog {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  resource: string;
  details: string;
  status: "success" | "failed" | "pending";
  ipAddress: string;
  userAgent: string;
}

const mockAuditLogs: AuditLog[] = [
  {
    id: "1",
    timestamp: "2024-02-03T14:30:25Z",
    user: "john.smith@company.com",
    action: "CREATE_INCIDENT",
    resource: "Incident Report INC-2024-003",
    details: "Created new electrical hazard incident report",
    status: "success",
    ipAddress: "192.168.1.100",
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  },
  {
    id: "2",
    timestamp: "2024-02-03T14:25:15Z",
    user: "sarah.johnson@company.com",
    action: "UPDATE_COMPLIANCE",
    resource: "OSHA Compliance Record",
    details: "Updated compliance score to 89%",
    status: "success",
    ipAddress: "192.168.1.101",
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
  },
  {
    id: "3",
    timestamp: "2024-02-03T14:20:45Z",
    user: "mike.wilson@company.com",
    action: "EXPORT_REPORT",
    resource: "Safety Analytics Report",
    details: "Exported quarterly safety analytics to CSV",
    status: "success",
    ipAddress: "192.168.1.102",
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  },
  {
    id: "4",
    timestamp: "2024-02-03T14:15:30Z",
    user: "admin@company.com",
    action: "LOGIN_FAILED",
    resource: "User Authentication",
    details: "Failed login attempt - invalid credentials",
    status: "failed",
    ipAddress: "192.168.1.200",
    userAgent: "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36",
  },
  {
    id: "5",
    timestamp: "2024-02-03T14:10:12Z",
    user: "lisa.chen@company.com",
    action: "UPDATE_PROFILE",
    resource: "User Profile",
    details: "Updated notification preferences",
    status: "success",
    ipAddress: "192.168.1.103",
    userAgent:
      "Mozilla/5.0 (iPad; CPU OS 15_0 like Mac OS X) AppleWebKit/605.1.15",
  },
  {
    id: "6",
    timestamp: "2024-02-03T14:05:55Z",
    user: "david.brown@company.com",
    action: "AI_ANALYSIS",
    resource: "Photo Analysis Engine",
    details: "Processed incident photo - detected electrical hazard",
    status: "success",
    ipAddress: "192.168.1.104",
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  },
  {
    id: "7",
    timestamp: "2024-02-03T14:00:33Z",
    user: "system",
    action: "BACKUP_CREATED",
    resource: "Database Backup",
    details: "Automatic daily backup completed successfully",
    status: "success",
    ipAddress: "localhost",
    userAgent: "System/Scheduler",
  },
  {
    id: "8",
    timestamp: "2024-02-03T13:55:20Z",
    user: "jennifer.white@company.com",
    action: "DELETE_ATTEMPT",
    resource: "Incident Report INC-2024-001",
    details: "Attempted to delete archived incident report",
    status: "failed",
    ipAddress: "192.168.1.105",
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
  },
];

export default function AuditLogs() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterAction, setFilterAction] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filteredLogs, setFilteredLogs] = useState(mockAuditLogs);
  const { toast } = useToast();

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    filterLogs(term, filterAction, filterStatus);
  };

  const handleActionFilter = (action: string) => {
    setFilterAction(action);
    filterLogs(searchTerm, action, filterStatus);
  };

  const handleStatusFilter = (status: string) => {
    setFilterStatus(status);
    filterLogs(searchTerm, filterAction, status);
  };

  const filterLogs = (search: string, action: string, status: string) => {
    let filtered = mockAuditLogs;

    if (search) {
      filtered = filtered.filter(
        (log) =>
          log.user.toLowerCase().includes(search.toLowerCase()) ||
          log.action.toLowerCase().includes(search.toLowerCase()) ||
          log.resource.toLowerCase().includes(search.toLowerCase()) ||
          log.details.toLowerCase().includes(search.toLowerCase())
      );
    }

    if (action !== "all") {
      filtered = filtered.filter((log) => log.action === action);
    }

    if (status !== "all") {
      filtered = filtered.filter((log) => log.status === status);
    }

    setFilteredLogs(filtered);
  };

  const handleExportLogs = () => {
    const headers = [
      "Timestamp",
      "User",
      "Action",
      "Resource",
      "Details",
      "Status",
      "IP Address",
    ];
    const csvData = filteredLogs.map((log) => [
      new Date(log.timestamp).toLocaleString(),
      log.user,
      log.action,
      log.resource,
      log.details,
      log.status,
      log.ipAddress,
    ]);

    const csvContent = [headers, ...csvData]
      .map((row) => row.map((field) => `"${field}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "audit_logs.csv";
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);

    toast({
      title: "Success",
      description: "Audit logs exported successfully",
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-600" />;
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "success":
        return "bg-green-100 text-green-800";
      case "failed":
        return "bg-red-100 text-red-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case "CREATE_INCIDENT":
      case "UPDATE_COMPLIANCE":
      case "UPDATE_PROFILE":
        return "bg-blue-100 text-blue-800";
      case "EXPORT_REPORT":
      case "AI_ANALYSIS":
        return "bg-green-100 text-green-800";
      case "LOGIN_FAILED":
      case "DELETE_ATTEMPT":
        return "bg-red-100 text-red-800";
      case "BACKUP_CREATED":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Audit Logs</h1>
          <p className="text-gray-600 mt-2">
            Track all system actions for accountability and security
          </p>
        </div>
        <Button
          onClick={handleExportLogs}
          className="bg-green-600 text-white hover:bg-green-700"
        >
          <Download className="h-4 w-4 mr-2" />
          Export Logs CSV
        </Button>
      </div>

      {/* Search and Filters */}
      <Card className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search logs by user, action, or resource..."
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <Select value={filterAction} onValueChange={handleActionFilter}>
                <SelectTrigger>
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by Action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  <SelectItem value="CREATE_INCIDENT">
                    Create Incident
                  </SelectItem>
                  <SelectItem value="UPDATE_COMPLIANCE">
                    Update Compliance
                  </SelectItem>
                  <SelectItem value="EXPORT_REPORT">Export Report</SelectItem>
                  <SelectItem value="LOGIN_FAILED">Login Failed</SelectItem>
                  <SelectItem value="AI_ANALYSIS">AI Analysis</SelectItem>
                  <SelectItem value="UPDATE_PROFILE">Update Profile</SelectItem>
                  <SelectItem value="DELETE_ATTEMPT">Delete Attempt</SelectItem>
                  <SelectItem value="BACKUP_CREATED">Backup Created</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Select value={filterStatus} onValueChange={handleStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Audit Logs Table */}
      <Card className="bg-white rounded-xl shadow-sm border border-gray-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>System Activity Log</CardTitle>
            <div className="text-sm text-gray-500">
              Showing {filteredLogs.length} of {mockAuditLogs.length} entries
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Resource</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>IP Address</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="font-mono text-sm">
                    {new Date(log.timestamp).toLocaleString()}
                  </TableCell>
                  <TableCell>{log.user}</TableCell>
                  <TableCell>
                    <Badge className={getActionColor(log.action)}>
                      {log.action.replace("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-xs truncate" title={log.resource}>
                    {log.resource}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(log.status)}
                      <Badge className={getStatusColor(log.status)}>
                        {log.status}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {log.ipAddress}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      title={`${log.details}\n\nUser Agent: ${log.userAgent}`}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredLogs.length === 0 && (
            <div className="text-center py-8">
              <AlertCircle className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500">
                No audit logs match your search criteria
              </p>
            </div>
          )}

          {/* Pagination */}
          <div className="flex items-center justify-between mt-6">
            <div className="flex items-center">
              <p className="text-sm text-gray-700">
                Showing <span className="font-medium">1</span> to{" "}
                <span className="font-medium">{filteredLogs.length}</span> of{" "}
                <span className="font-medium">{filteredLogs.length}</span>{" "}
                results
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" disabled>
                Previous
              </Button>
              <Button variant="default" size="sm">
                1
              </Button>
              <Button variant="outline" size="sm" disabled>
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
