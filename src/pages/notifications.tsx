import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { ScrollArea } from "../components/ui/scroll-area";
import {
  Bell,
  AlertTriangle,
  CheckCircle,
  Clock,
  X,
  Eye,
  Settings,
  Building2,
} from "lucide-react";
import { useLocation } from "wouter";
import { getStoredUser } from "../utils/user";
import { useNotifications } from "../hooks/useNotifications";

// Department name constants
const DEPT = {
  SAFETY: "Safety Department",
  HR: "Human Resources",
  ENV: "Environmental",
  QUALITY: "Quality Control",
  FIELD: "Field Operations Group",
};

const DEPT_BADGE_COLORS: Record<string, string> = {
  [DEPT.HR]: "bg-purple-100 text-purple-800",
  [DEPT.ENV]: "bg-green-100 text-green-800",
  [DEPT.QUALITY]: "bg-blue-100 text-blue-800",
  [DEPT.FIELD]: "bg-orange-100 text-orange-800",
  [DEPT.SAFETY]: "bg-gray-100 text-gray-700",
};

export default function Notifications() {
  const [, setLocation] = useLocation();
  const user = getStoredUser<{ role?: string; department?: string }>();

  const userDepartment = user?.department || "";
  const userRole = user?.role || "";

  const isSafetyDept =
    userDepartment === DEPT.SAFETY ||
    userRole === "admin" ||
    userRole === "all department" ||
    userRole === "Safety Department";

  const isAdmin = userRole === "admin" || userRole === "all department";

  const { notifications: rawNotifications, isLoading, markAsRead, markAllAsRead } = useNotifications();

  // Local state to track purely UI-deleted items (since we can't delete them from the backend without affecting others)
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());

  // Filter out UI-deleted notifications
  const activeNotifications = rawNotifications.filter(n => !deletedIds.has(n.id));

  const [filter, setFilter] = useState<"all" | "unread" | "high">("all");

  const deleteNotification = (id: string) => {
    setDeletedIds(prev => new Set(prev).add(id));
  };

  const getFilteredNotifications = () => {
    switch (filter) {
      case "unread":
        return activeNotifications.filter((n) => !n.read);
      case "high":
        return activeNotifications.filter((n) => n.priority === "high");
      default:
        return activeNotifications;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "incident":
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case "compliance":
        return <CheckCircle className="h-4 w-4 text-blue-500" />;
      case "system":
        return <Bell className="h-4 w-4 text-green-500" />;
      case "reminder":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <Bell className="h-4 w-4 text-gray-500" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "low":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "incident":
        return "bg-red-50 border-red-200";
      case "compliance":
        return "bg-blue-50 border-blue-200";
      case "system":
        return "bg-green-50 border-green-200";
      case "reminder":
        return "bg-yellow-50 border-yellow-200";
      default:
        return "bg-gray-50 border-gray-200";
    }
  };

  const unreadCount = activeNotifications.filter((n) => !n.read).length;
  const filteredNotifications = getFilteredNotifications();

  // Subtitle based on role
  const subtitle = isSafetyDept && !isAdmin
    ? "Showing confirmations of incident reports you submitted and compliance actions for review"
    : isAdmin
      ? "Showing all notifications across all departments"
      : `Showing notifications for ${userDepartment || userRole || "your department"}`;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Bell className="h-8 w-8 mr-3 text-primary" />
            Notifications
            {unreadCount > 0 && (
              <Badge className="ml-3 bg-red-500 text-white">
                {unreadCount} new
              </Badge>
            )}
          </h1>
          <p className="text-gray-600 mt-2">{subtitle}</p>
        </div>
        <Button variant="outline">
          <Settings className="h-4 w-4 mr-2" />
          Settings
        </Button>
      </div>

      {/* Filter and Actions */}
      <Card className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex space-x-2">
              <Button
                variant={filter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter("all")}
              >
                All ({activeNotifications.length})
              </Button>
              <Button
                variant={filter === "unread" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter("unread")}
              >
                Unread ({unreadCount})
              </Button>
              <Button
                variant={filter === "high" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter("high")}
              >
                High Priority (
                {activeNotifications.filter((n) => n.priority === "high").length})
              </Button>
            </div>

            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" onClick={() => markAllAsRead(activeNotifications.map(n => n.id))}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Mark All Read
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Notifications List */}
      <Card className="bg-white rounded-xl shadow-sm border border-gray-200">
        <CardHeader>
          <CardTitle>Recent Notifications</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[600px]">
            {filteredNotifications.length > 0 ? (
              <div className="space-y-1">
                {filteredNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 border-l-4 transition-colors hover:bg-gray-100 cursor-pointer ${notification.read ? "bg-gray-50" : "bg-white"
                      } ${getTypeColor(notification.type)}`}
                    onClick={(e) => {
                      // Don't trigger link if they click an action button
                      if ((e.target as HTMLElement).closest('button')) return;

                      markAsRead(notification.id);
                      if (notification.link) {
                        setLocation(notification.link);
                      }
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3 flex-1">
                        <div className="mt-1">
                          {getTypeIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center flex-wrap gap-2 mb-1">
                            <h4
                              className={`text-sm font-medium ${notification.read
                                ? "text-gray-700"
                                : "text-gray-900"
                                }`}
                            >
                              {notification.title}
                            </h4>
                            <Badge
                              className={getPriorityColor(
                                notification.priority
                              )}
                            >
                              {notification.priority}
                            </Badge>
                            {/* Department badge — always visible for Safety Dept clarity */}
                            {isSafetyDept && (
                              <span
                                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${DEPT_BADGE_COLORS[
                                  notification.sourceDepartment
                                ] || "bg-gray-100 text-gray-700"
                                  }`}
                              >
                                <Building2 className="h-3 w-3" />
                                {notification.sourceDepartment}
                              </span>
                            )}
                            {!notification.read && (
                              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            )}
                          </div>
                          <p
                            className={`text-sm ${notification.read
                              ? "text-gray-500"
                              : "text-gray-700"
                              }`}
                          >
                            {notification.message}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {new Date(notification.timestamp).toLocaleString()}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 ml-4">
                        {!notification.read && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => markAsRead(notification.id)}
                            title="Mark as read"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteNotification(notification.id)}
                          title="Delete notification"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Bell className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No notifications
                </h3>
                <p className="text-gray-500">
                  {filter === "all"
                    ? "You're all caught up!"
                    : `No ${filter} notifications found.`}
                </p>
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
