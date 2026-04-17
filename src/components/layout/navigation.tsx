import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import {
  Shield,
  BarChart3,
  Camera,
  FileText,
  PieChart,
  ClipboardCheck,
  Bell,
  User,
  LogOut,
  Settings,
  UserCircle,
  History,
  ArchiveRestore,
} from "lucide-react";
import { getStoredUser } from "../../utils/user";
import { isSafetyDepartmentAccount, resolveDepartmentKey } from "../../utils/department";
import { useNotifications, getPriorityDotColor } from "../../hooks/useNotifications";

export default function Navigation() {
  const [location, setLocation] = useLocation();

  // Get user info from localStorage
  const user = getStoredUser();
  const isAdmin = user?.role === "admin";
  const isSafetyDept = user?.department === "Safety Department";
  const userId = user?.id;

  const deptKey = resolveDepartmentKey(user?.department || "", {
    "Field Operations Group": "field",
    "Field Operation Group": "field",
    "Field Operation": "field",
    "Quality Control": "quality",
    Environmental: "environmental",
    "Human Resources": "hr",
    HR: "hr",
  });

  const allowedArchivedDeptKeys = new Set(["field", "quality", "environmental", "hr"]);

  const canAccessArchivedReports =
    isSafetyDepartmentAccount({
      department: user?.department || "",
      role: typeof user?.role === "string" ? user.role : "",
    }) || allowedArchivedDeptKeys.has(deptKey);

  // Fetch user email from database
  const { data: userData } = useQuery({
    queryKey: ["/api/user", userId],
    enabled: !!userId,
    queryFn: async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("No authentication token");
      }

      const response = await fetch(`https://backendworksafer-production.up.railway.app/auth/user-profile`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch user data");
      }

      return response.json();
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Use email from database, fallback to localStorage
  const userEmail = userData?.email || user?.email || "Unknown";

  const navItems = [
    { path: "/dashboard", label: "Dashboard", icon: BarChart3 },
    ...(isSafetyDept
      ? [{ path: "/incident-report", label: "Report Incident", icon: Camera }]
      : []),
    { path: "/reports", label: "Reports", icon: FileText },
    ...(canAccessArchivedReports
      ? [{ path: "/archived-reports", label: "Archived Reports", icon: ArchiveRestore }]
      : []),
    { path: "/analytics", label: "Analytics", icon: PieChart },
    { path: "/compliance", label: "Compliance", icon: ClipboardCheck },
  ];

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-4 lg:gap-6 min-w-0 flex-1">
            <div className="flex items-center space-x-2 shrink-0">
              <Shield className="h-6 w-6 text-primary" />
              <span className="text-xl font-semibold text-gray-900 whitespace-nowrap">
                WorkSAFER
              </span>
              {user?.department && (
                <span className="text-xl font-semibold text-gray-500 ml-2 border-l-2 border-gray-300 pl-2 whitespace-nowrap">
                  {user.department}
                </span>
              )}
            </div>

            <div className="hidden md:flex items-center gap-1 lg:gap-2 xl:gap-3 min-w-0 overflow-x-auto">
              {navItems.map((item) => {
                const isActive =
                  location === item.path ||
                  (location === "/" && item.path === "/dashboard");
                const Icon = item.icon;

                return (
                  <Link key={item.path} href={item.path}>
                    <Button
                      variant="ghost"
                      className={`flex items-center space-x-2 px-2 lg:px-3 py-2 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${isActive
                        ? "text-primary border-primary bg-blue-50"
                        : "text-gray-500 hover:text-gray-700 border-transparent hover:border-gray-300"
                        }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </Button>
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="flex items-center space-x-4 shrink-0 pl-3">
            {(() => {
              const { notifications: userNotifs, isLoading, markAsRead } = useNotifications();
              const unreadNotifs = userNotifs.filter((n) => !n.read);
              const unreadCount = unreadNotifs.length;
              // Show top 3 unread; fallback to top 3 overall if all read
              const preview =
                unreadNotifs.length > 0
                  ? unreadNotifs.slice(0, 3)
                  : userNotifs.slice(0, 3);

              return (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="relative">
                      <Bell className="h-5 w-5 text-gray-500" />
                      {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                          {unreadCount > 9 ? "9+" : unreadCount}
                        </span>
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-80">
                    <div className="p-3 border-b">
                      <h4 className="font-medium text-gray-900">Notifications</h4>
                      <p className="text-sm text-gray-500">
                        {unreadCount > 0
                          ? `You have ${unreadCount} unread notification${unreadCount !== 1 ? "s" : ""}`
                          : "You're all caught up!"}
                      </p>
                    </div>
                    {isLoading ? (
                      <div className="p-4 text-sm text-gray-500 text-center">
                        Loading...
                      </div>
                    ) : preview.length > 0 ? (
                      preview.map((notif) => (
                        <DropdownMenuItem
                          key={notif.id}
                          className="p-3 flex flex-col items-start space-y-1 cursor-pointer"
                          onClick={() => {
                            if (notif.link) {
                              setLocation(notif.link);
                            }
                            markAsRead(notif.id);
                          }}
                        >
                          <div className="flex items-center space-x-2">
                            <div
                              className={`w-2 h-2 rounded-full ${getPriorityDotColor(notif.priority)}`}
                            ></div>
                            <span className={`font-medium text-sm line-clamp-1 ${!notif.read ? 'text-gray-900' : 'text-gray-600'}`}>
                              {notif.title}
                            </span>
                          </div>
                          <span className="text-xs text-gray-500 line-clamp-1 pl-4">
                            {notif.message}
                          </span>
                        </DropdownMenuItem>
                      ))
                    ) : (
                      <div className="p-4 text-sm text-gray-500 text-center">
                        No notifications
                      </div>
                    )}
                    <DropdownMenuSeparator />
                    <Link href="/notifications">
                      <DropdownMenuItem className="p-3 text-center text-primary cursor-pointer">
                        View All Notifications
                      </DropdownMenuItem>
                    </Link>
                  </DropdownMenuContent>
                </DropdownMenu>
              );
            })()}

            {/* User Profile Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex items-center space-x-2"
                >
                  <User className="h-5 w-5 text-gray-500" />
                  <span className="hidden md:block text-sm text-gray-700">
                    {user?.name || "User"}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="p-3 border-b">
                  <p className="font-medium text-gray-900">
                    {user?.name || "Unknown User"}
                  </p>
                  <p className="text-sm text-gray-500">
                    {user?.department || "Department"}
                  </p>
                  <p className="text-xs text-gray-400">{userEmail}</p>
                </div>
                <Link href="/user-profile">
                  <DropdownMenuItem className="cursor-pointer">
                    <UserCircle className="h-4 w-4 mr-2" />
                    Profile Settings
                  </DropdownMenuItem>
                </Link>
                {isAdmin && (
                  <Link href="/audit-logs">
                    <DropdownMenuItem className="cursor-pointer">
                      <History className="h-4 w-4 mr-2" />
                      Audit Logs
                    </DropdownMenuItem>
                  </Link>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-red-600 cursor-pointer"
                  onClick={() => {
                    localStorage.removeItem("user");
                    localStorage.removeItem("token");
                    window.location.href = "/login";
                  }}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </nav>
  );
}
