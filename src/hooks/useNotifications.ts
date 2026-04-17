import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { fetchReports, fetchComplianceActions } from "../components/lib/she-api";
import { getStoredUser } from "../utils/user";

export interface AppNotification {
    id: string;
    title: string;
    message: string;
    type: "incident" | "compliance" | "system" | "reminder" | "confirmation";
    priority: "high" | "medium" | "low";
    timestamp: string;
    read: boolean;
    targetDepartment: string;
    sourceDepartment: string;
    link?: string;
}

export const DEPT = {
    SAFETY: "Safety Department",
    HR: "Human Resources",
    ENV: "Environmental",
    QUALITY: "Quality Control",
    FIELD: "Field Operations Group",
} as const;

// Helper to map DB department keys to display names
const getDeptDisplayName = (key: string) => {
    switch (key?.toLowerCase()) {
        case "hr":
            return DEPT.HR;
        case "environmental":
            return DEPT.ENV;
        case "quality":
            return DEPT.QUALITY;
        case "field":
            return DEPT.FIELD;
        default:
            return key || "Unknown Department";
    }
};

export function useNotifications() {
    const queryClient = useQueryClient();
    const user = getStoredUser<{ role?: string; department?: string }>();
    const userDept = user?.department || "";
    const userRole = user?.role || "";

    const isSafetyDept =
        userDept === DEPT.SAFETY ||
        userRole === "admin" ||
        userRole === "all department" ||
        userRole === "Safety Department";

    const isAdmin = userRole === "admin" || userRole === "all department";

    // 1. Fetch Incidents (Reports)
    // If Admin -> fetch all. If Env/HR/Field/QC -> fetch only theirs.
    // Safety Dept doesn't *receive* incidents, they report them, but we fetch all
    // for them anyway to show confirmations of what they sent.
    const fetchDeptParam = isAdmin || isSafetyDept ? undefined : userDept;

    const { data: reportsData, isLoading: isLoadingReports } = useQuery({
        queryKey: ["notifications-reports", fetchDeptParam],
        queryFn: () => fetchReports(fetchDeptParam ? { department: fetchDeptParam } : undefined),
        refetchInterval: 10000, // Poll every 10s
    });

    // 2. Fetch Compliance Actions
    // Safety Dept sees ALL compliance actions submitted by others.
    // Other depts don't receive compliance notifications natively.
    const { data: complianceData, isLoading: isLoadingCompliance } = useQuery({
        queryKey: ["notifications-compliance"],
        queryFn: () => fetchComplianceActions(),
        enabled: isSafetyDept || isAdmin, // Only Safety/Admin needs to see these incoming
        refetchInterval: 10000,
    });

    // 3. LocalStorage for Read State
    const [readIds, setReadIds] = useState<Set<string>>(new Set());

    // Load read state from localStorage on mount
    useEffect(() => {
        const stored = localStorage.getItem(`read_notifs_${user?.role || "anon"}`);
        if (stored) {
            try {
                setReadIds(new Set(JSON.parse(stored)));
            } catch (e) {
                console.error("Failed to parse read notifs");
            }
        }
    }, [user?.role]);

    const markAsRead = (id: string) => {
        setReadIds((prev) => {
            const next = new Set(prev);
            next.add(id);
            localStorage.setItem(`read_notifs_${user?.role || "anon"}`, JSON.stringify(Array.from(next)));
            return next;
        });
    };

    const markAllAsRead = (ids: string[]) => {
        setReadIds((prev) => {
            const next = new Set(prev);
            ids.forEach((id) => next.add(id));
            localStorage.setItem(`read_notifs_${user?.role || "anon"}`, JSON.stringify(Array.from(next)));
            return next;
        });
    };

    // 4. Map DB records to Notification interface
    const notifications: AppNotification[] = [];

    // Map Reports -> Incident Notifications
    if (reportsData?.reports) {
        reportsData.reports.forEach((report) => {
            const displayDept = getDeptDisplayName(report.department);

            // Safety Dept sees this as a "Report Sent" confirmation
            if (isSafetyDept && !isAdmin) {
                notifications.push({
                    id: `report-${report.id}`,
                    title: `Report Sent to ${displayDept}`,
                    message: `Your incident report (${report.incident_title || report.scene_description?.substring(0, 50)}...) was submitted.`,
                    type: "confirmation",
                    priority: report.overall_risk === "critical" || report.overall_risk === "high" ? "high" : report.overall_risk === "medium" ? "medium" : "low",
                    timestamp: report.created_at,
                    read: readIds.has(`report-${report.id}`),
                    targetDepartment: displayDept,
                    sourceDepartment: DEPT.SAFETY,
                });
            }
            // Target Depts (and Admin) see this as an incoming Incident Notification
            else if (isAdmin || displayDept === userDept) {
                notifications.push({
                    id: `report-${report.id}`,
                    title: report.incident_title || "New Incident Reported",
                    message: report.scene_description || "An incident was routed to your department.",
                    type: "incident",
                    priority: report.overall_risk === "critical" || report.overall_risk === "high" ? "high" : report.overall_risk === "medium" ? "medium" : "low",
                    timestamp: report.created_at,
                    read: readIds.has(`report-${report.id}`),
                    targetDepartment: displayDept,
                    sourceDepartment: DEPT.SAFETY,
                });
            }
        });
    }

    // Map Compliance Actions -> Compliance Notifications for Safety Dept
    if (complianceData?.actions && (isSafetyDept || isAdmin)) {
        complianceData.actions.forEach((action) => {
            // Only notify about PENDING reviews
            if (action.status === "pending_review") {
                const displayDept = getDeptDisplayName(action.department);
                notifications.push({
                    id: `compliance-${action.id}`,
                    title: `Compliance Action Submitted — ${displayDept}`,
                    message: `${action.submitted_by} submitted: "${action.action_text}" for review.`,
                    type: "compliance",
                    priority: "medium", // Compliance approvals are usually medium priority
                    timestamp: action.submitted_at,
                    read: readIds.has(`compliance-${action.id}`),
                    targetDepartment: DEPT.SAFETY, // Sent TO safety
                    sourceDepartment: displayDept, // Uploaded BY target dept
                });
            }
        });
    }

    // Sort newest first
    notifications.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return {
        notifications,
        isLoading: isLoadingReports || isLoadingCompliance,
        markAsRead,
        markAllAsRead,
    };
}

export function getPriorityDotColor(priority: AppNotification["priority"]): string {
    switch (priority) {
        case "high": return "bg-red-500";
        case "medium": return "bg-yellow-500";
        case "low": return "bg-blue-500";
        default: return "bg-gray-400";
    }
}
