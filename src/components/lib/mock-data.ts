import { DashboardMetrics, RecentIncident, Department, ChartData, HazardData } from "./types";

export const dashboardMetrics: DashboardMetrics = {
  totalIncidents: 24,
  commonHazard: "Poor PPE Maintenance",
  hazardCount: 8,
  complianceRate: 87,
  aiReports: 156,
  automationRate: 94
};

export const recentIncidents: RecentIncident[] = [
  {
    id: "1",
    title: "Electrical Hazard - Site A",
    timeAgo: "2 hours ago",
    severity: "high"
  },
  {
    id: "2", 
    title: "PPE Violation - Site B",
    timeAgo: "5 hours ago",
    severity: "medium"
  },
  {
    id: "3",
    title: "Resolved - Structural Issue",
    timeAgo: "1 day ago", 
    severity: "low"
  }
];

export const departments: Department[] = [
  { name: "Safety Department", status: "good", pendingReviews: 3 },
  { name: "Human Resources", status: "good", pendingReviews: 2 },
  { name: "Environmental", status: "warning", pendingReviews: 7 },
  { name: "Field Operations", status: "good", pendingReviews: 1 },
  { name: "Quality Control", status: "good", pendingReviews: 2 }
];

export const trendData: ChartData[] = [
  { name: "Week 1", value: 12 },
  { name: "Week 2", value: 19 },
  { name: "Week 3", value: 8 },
  { name: "Week 4", value: 15 }
];

export const hazardTrendsData: ChartData[] = [
  { name: "Jan", value: 8 },
  { name: "Feb", value: 12 },
  { name: "Mar", value: 15 },
  { name: "Apr", value: 11 },
  { name: "May", value: 9 },
  { name: "Jun", value: 14 }
];

export const hazardDistributionData: HazardData[] = [
  { name: "Electrical", value: 30, color: "#EF4444" },
  { name: "PPE Issues", value: 25, color: "#F59E0B" },
  { name: "Ergonomic", value: 15, color: "#10B981" },
  { name: "Mechanical", value: 20, color: "#3B82F6" },
  { name: "Structural", value: 10, color: "#8B5CF6" }
];