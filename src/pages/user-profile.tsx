import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Button } from "../components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../components/ui/form";
import { Input } from "../components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Switch } from "../components/ui/switch";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";
import { Avatar, AvatarFallback } from "../components/ui/avatar";
import { useToast } from "../hooks/use-toast";
import {
  User,
  Lock,
  Bell,
  Settings,
  Save,
  Camera,
  Shield,
  Loader2,
} from "lucide-react";

// Only Safety department users see the Role selector
const SAFETY_DEPARTMENT = "Safety";

// Schemas
const profileSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  department: z.string().min(1, "Department is required"),
  // role is optional — only sent for Safety dept users
  role: z.string().optional(),
  phoneNumber: z.string().optional(),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

const notificationSchema = z.object({
  emailNotifications: z.boolean(),
  smsAlerts: z.boolean(),
  pushNotifications: z.boolean(),
  incidentAlerts: z.boolean(),
  complianceReminders: z.boolean(),
  weeklyReports: z.boolean(),
});

const appSettingsSchema = z.object({
  autoSaveReports: z.boolean(),
  dataSharing: z.boolean(),
  language: z.string(),
  timeZone: z.string(),
});

// Types
type AppSettingsFormData = z.infer<typeof appSettingsSchema>;
type ProfileFormData = z.infer<typeof profileSchema>;
type PasswordFormData = z.infer<typeof passwordSchema>;
type NotificationFormData = z.infer<typeof notificationSchema>;

export default function UserProfile() {
  const [activeTab, setActiveTab] = useState("profile");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const [twoFactorLoading, setTwoFactorLoading] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [twoFactorMethod, setTwoFactorMethod] = useState<"email" | "app">(
    "email",
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const profileForm = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      department: "",
      role: "",
      phoneNumber: "",
    },
  });

  // Reactively watch department to show/hide Role field
  const watchedDepartment = profileForm.watch("department");
  const isSafetyDepartment = watchedDepartment === SAFETY_DEPARTMENT;

  const [appSettings, setAppSettings] = useState({
    autoSaveReports: false,
    dataSharing: false,
    language: "en",
    timeZone: "Asia/Manila",
  });
  const [loadingSettings, setLoadingSettings] = useState(true);

  // Fetch user app settings
  useEffect(() => {
    const fetchAppSettings = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) throw new Error("No token found");

        const res = await fetch(
          "https://backendworksafer-production.up.railway.app/auth/settings",
          {
            method: "GET",
            headers: { Authorization: `Bearer ${token}` },
          },
        );

        if (!res.ok) throw new Error("Failed to fetch app settings");

        const data = await res.json();

        setAppSettings({
          autoSaveReports: data.autoSaveReports,
          dataSharing: data.dataSharing,
          language: data.language || "en",
          timeZone: data.timeZone || "Asia/Manila",
        });
      } catch (error) {
        console.error("Error fetching app settings:", error);
      }
    };

    fetchAppSettings();
  }, []);

  const handleAppSettingChange = (
    field: keyof AppSettingsFormData,
    value: any,
  ) => {
    setAppSettings((prev) => ({ ...prev, [field]: value }));
  };

  const saveAppSettings = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("No token found");

      const res = await fetch(
        "https://backendworksafer-production.up.railway.app/auth/settings",
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(appSettings),
        },
      );

      const result = await res.json();
      if (!res.ok)
        throw new Error(result.error || "Failed to save app settings");

      toast({ title: "Success", description: "Settings saved successfully" });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Something went wrong",
      });
    }
  };

  const passwordForm = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const notificationForm = useForm<NotificationFormData>({
    resolver: zodResolver(notificationSchema),
    defaultValues: {
      emailNotifications: true,
      smsAlerts: true,
      pushNotifications: false,
      incidentAlerts: true,
      complianceReminders: true,
      weeklyReports: false,
    },
  });

  // Fetch user profile
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        setLoading(true);
        setError(null);

        const token = localStorage.getItem("token");
        if (!token) {
          setError("No authentication token found. Please login again.");
          setLoading(false);
          return;
        }

        const response = await fetch(
          "https://backendworksafer-production.up.railway.app/api/user/profile",
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          },
        );

        if (!response.ok) throw new Error("Failed to fetch user profile");

        const userData = await response.json();
        console.log("USER PROFILE RESPONSE:", userData);
        setProfilePhoto(userData.picture || null);
        setUserId(userData._id || userData.id || userData.user?._id || null);
        profileForm.reset({
          firstName: userData.firstName || "",
          lastName: userData.lastName || "",
          email: userData.email || "",
          department: userData.department || "",
          role: userData.role || "",
          phoneNumber: userData.phoneNumber || "",
        });

        if (userData.notifications) {
          notificationForm.reset({
            emailNotifications:
              userData.notifications.emailNotifications ?? true,
            smsAlerts: userData.notifications.smsAlerts ?? true,
            pushNotifications:
              userData.notifications.pushNotifications ?? false,
            incidentAlerts: userData.notifications.incidentAlerts ?? true,
            complianceReminders:
              userData.notifications.complianceReminders ?? true,
            weeklyReports: userData.notifications.weeklyReports ?? false,
          });
        }

        if (userData.twoFactorEnabled !== undefined) {
          setTwoFactorEnabled(userData.twoFactorEnabled);
        }
        if (userData.twoFactorMethod) {
          setTwoFactorMethod(userData.twoFactorMethod);
        }
      } catch (err) {
        console.error("Error fetching profile:", err);
        setError(err instanceof Error ? err.message : "Failed to load profile");
        toast({
          title: "Error",
          description: "Failed to load profile data",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, []);

  const onProfileSubmit = async (data: ProfileFormData) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        toast({
          title: "Error",
          description: "No authentication token found. Please login again.",
          variant: "destructive",
        });
        return;
      }

      // Build payload — only include role for Safety department users
      const payload: ProfileFormData = { ...data };
      if (payload.department !== SAFETY_DEPARTMENT) {
        delete payload.role;
      }

      const response = await fetch(
        "https://backendworksafer-production.up.railway.app/api/user/profile",
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        },
      );

      if (!response.ok) {
        throw new Error("Failed to update profile");
      }

      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
    } catch (err) {
      console.error("Error updating profile:", err);
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      });
    }
  };

  const onPasswordSubmit = async (data: PasswordFormData) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        toast({
          title: "Error",
          description: "No authentication token found. Please login again.",
          variant: "destructive",
        });
        return;
      }

      const response = await fetch(
        "https://backendworksafer-production.up.railway.app/api/user/change-password",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            currentPassword: data.currentPassword,
            newPassword: data.newPassword,
          }),
        },
      );

      if (!response.ok) {
        throw new Error("Failed to change password");
      }

      toast({
        title: "Success",
        description: "Password changed successfully",
      });
      passwordForm.reset();
    } catch (err) {
      console.error("Error changing password:", err);
      toast({
        title: "Error",
        description: "Failed to change password",
        variant: "destructive",
      });
    }
  };

  const onNotificationSubmit = async (data: NotificationFormData) => {
    if (!userId) {
      toast({
        title: "Error",
        description: "User ID not found. Please reload the page.",
        variant: "destructive",
      });
      return;
    }

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        toast({
          title: "Error",
          description: "No authentication token found. Please login again.",
          variant: "destructive",
        });
        return;
      }

      const response = await fetch(
        "https://backendworksafer-production.up.railway.app/api/user/notifications",
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(data),
        },
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Failed to save preferences");
      }

      toast({
        title: "Success",
        description: "Notification preferences saved!",
      });
    } catch (err: any) {
      console.error("Error updating notifications:", err);
      toast({
        title: "Error",
        description: err.message || "Failed to save preferences",
        variant: "destructive",
      });
    }
  };

  const handleEnable2FA = async () => {
    setTwoFactorLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("No authentication token found");

      const response = await fetch(
        "https://backendworksafer-production.up.railway.app/auth/generate-2fa",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!response.ok) throw new Error("Failed to generate 2FA setup");
      const data = await response.json();
      sessionStorage.setItem("2fa-setup", JSON.stringify(data));

      const enableRes = await fetch(
        "https://backendworksafer-production.up.railway.app/auth/enable-2fa",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!enableRes.ok) throw new Error("Failed to persist 2FA in profile");

      setTwoFactorEnabled(true);
      toast({
        title: "2FA Setup",
        description: "2FA enabled. Please configure your authenticator app.",
      });
    } catch (error: any) {
      console.error("Error enabling 2FA:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to enable 2FA",
        variant: "destructive",
      });
    } finally {
      setTwoFactorLoading(false);
    }
  };

  const handleDisable2FA = async () => {
    if (!window.confirm("Are you sure you want to disable 2FA?")) return;

    setTwoFactorLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("No authentication token found");

      const response = await fetch(
        "https://backendworksafer-production.up.railway.app/auth/disable-2fa",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!response.ok) throw new Error("Failed to disable 2FA");

      setTwoFactorEnabled(false);
      toast({ title: "Success", description: "2FA has been disabled." });
    } catch (error: any) {
      console.error("Error disabling 2FA:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to disable 2FA",
        variant: "destructive",
      });
    } finally {
      setTwoFactorLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-600">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">User Profile</h1>
        <p className="text-gray-600 mt-2">
          Manage your account settings and preferences
        </p>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-6"
      >
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="profile" className="flex items-center space-x-2">
            <User className="h-4 w-4" />
            <span>Profile</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center space-x-2">
            <Lock className="h-4 w-4" />
            <span>Security</span>
          </TabsTrigger>
          <TabsTrigger
            value="notifications"
            className="flex items-center space-x-2"
          >
            <Bell className="h-4 w-4" />
            <span>Notifications</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center space-x-2">
            <Settings className="h-4 w-4" />
            <span>Settings</span>
          </TabsTrigger>
        </TabsList>

        {/* ─── PROFILE TAB ─── */}
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Avatar + Photo Controls */}
              <div className="flex items-center space-x-6">
                <Avatar className="h-24 w-24">
                  {profilePhoto ? (
                    <img src={profilePhoto} alt="Profile Photo" />
                  ) : (
                    <AvatarFallback className="text-xl">
                      {(profileForm.watch("firstName")?.[0] || "") +
                        (profileForm.watch("lastName")?.[0] || "")}
                    </AvatarFallback>
                  )}
                </Avatar>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  ref={fileInputRef}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;

                    const MAX_SIZE = 1 * 1024 * 1024;
                    if (file.size > MAX_SIZE) {
                      toast({
                        title: "Error",
                        description:
                          "File is too large. Maximum allowed size is 1MB.",
                        variant: "destructive",
                      });
                      e.target.value = "";
                      return;
                    }

                    const token = localStorage.getItem("token");
                    if (!token) {
                      toast({
                        title: "Error",
                        description:
                          "No authentication token found. Please login again.",
                        variant: "destructive",
                      });
                      return;
                    }

                    const formData = new FormData();
                    formData.append("photo", file);

                    try {
                      const res = await fetch(
                        "https://backendworksafer-production.up.railway.app/api/user/upload-photo",
                        {
                          method: "POST",
                          headers: { Authorization: `Bearer ${token}` },
                          body: formData,
                        },
                      );

                      if (!res.ok)
                        throw new Error(
                          "File is too large. Maximum allowed size is 1MB.",
                        );

                      const data = await res.json();
                      toast({
                        title: "Success",
                        description: "Profile photo updated successfully",
                      });
                      setProfilePhoto(data.photoUrl);
                    } catch (error) {
                      console.error("Error uploading photo:", error);
                      toast({
                        title: "Error",
                        description: "Failed to upload photo",
                        variant: "destructive",
                      });
                    }
                  }}
                />
                <div>
                  {profilePhoto ? (
                    <Button
                      variant="outline"
                      className="flex items-center space-x-2"
                      onClick={async () => {
                        const token = localStorage.getItem("token");
                        if (!token) {
                          toast({
                            title: "Error",
                            description:
                              "No authentication token found. Please login again.",
                            variant: "destructive",
                          });
                          return;
                        }
                        try {
                          const res = await fetch(
                            "https://backendworksafer-production.up.railway.app/api/user/delete-photo",
                            {
                              method: "DELETE",
                              headers: { Authorization: `Bearer ${token}` },
                            },
                          );
                          const data = await res.json();
                          if (!res.ok)
                            throw new Error(
                              data.error || "Failed to delete photo",
                            );
                          toast({
                            title: "Success",
                            description: "Profile photo has been reset",
                          });
                          setProfilePhoto(null);
                        } catch (error: unknown) {
                          console.error("Error deleting photo:", error);
                          toast({
                            title: "Error",
                            description:
                              error instanceof Error
                                ? error.message
                                : "Failed to delete photo",
                            variant: "destructive",
                          });
                        }
                      }}
                    >
                      <span>Reset Photo</span>
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      className="flex items-center space-x-2"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Camera className="h-4 w-4" />
                      <span>Change Photo</span>
                    </Button>
                  )}
                  <p className="text-sm text-gray-500 mt-2">
                    JPG, JPEG or PNG. 1MB max.
                  </p>
                </div>
              </div>

              <Form {...profileForm}>
                <form
                  onSubmit={profileForm.handleSubmit(onProfileSubmit)}
                  className="space-y-4"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={profileForm.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={profileForm.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Last Name</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={profileForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email Address</FormLabel>
                          <FormControl>
                            <Input {...field} type="email" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={profileForm.control}
                      name="department"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Department</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              readOnly
                              placeholder="Department will appear here"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/*
                      Role selector is ONLY shown for Safety department users.
                      HR, Quality, Field Ops, and Environmental users will NOT see this field.
                      The department value comes from the backend (read-only) so users
                      cannot manipulate which department they belong to.
                    */}
                    {isSafetyDepartment && (
                      <FormField
                        control={profileForm.control}
                        name="role"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Role</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              value={field.value ?? ""}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select role" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="Safety Officer">
                                  Safety Officer
                                </SelectItem>
                                <SelectItem value="Safety Manager">
                                  Safety Manager
                                </SelectItem>
                                <SelectItem value="Safety Coordinator">
                                  Safety Coordinator
                                </SelectItem>
                                <SelectItem value="Compliance Officer">
                                  Compliance Officer
                                </SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    {/* Phone Number spans full width when Role is hidden */}
                    <FormField
                      control={profileForm.control}
                      name="phoneNumber"
                      render={({ field }) => (
                        <FormItem
                          className={isSafetyDepartment ? "" : "md:col-span-2"}
                        >
                          <FormLabel>Phone Number</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="+1 (555) 123-4567" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex justify-end">
                    <Button
                      type="submit"
                      className="flex items-center space-x-2"
                    >
                      <Save className="h-4 w-4" />
                      <span>Save Changes</span>
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── SECURITY TAB ─── */}
        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...passwordForm}>
                <form
                  onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}
                  className="space-y-4"
                >
                  <FormField
                    control={passwordForm.control}
                    name="currentPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Current Password</FormLabel>
                        <FormControl>
                          <Input {...field} type="password" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={passwordForm.control}
                    name="newPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>New Password</FormLabel>
                        <FormControl>
                          <Input {...field} type="password" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={passwordForm.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirm New Password</FormLabel>
                        <FormControl>
                          <Input {...field} type="password" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end">
                    <Button
                      type="submit"
                      className="flex items-center space-x-2"
                    >
                      <Lock className="h-4 w-4" />
                      <span>Change Password</span>
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── NOTIFICATIONS TAB ─── */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...notificationForm}>
                <form
                  onSubmit={notificationForm.handleSubmit(onNotificationSubmit)}
                  className="space-y-6"
                >
                  <div className="space-y-4">
                    <FormField
                      control={notificationForm.control}
                      name="emailNotifications"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">
                              Email Notifications
                            </FormLabel>
                            <p className="text-sm text-gray-500">
                              Receive notifications via email
                            </p>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={notificationForm.control}
                      name="pushNotifications"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">
                              Push Notifications
                            </FormLabel>
                            <p className="text-sm text-gray-500">
                              Receive push notifications in browser
                            </p>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={notificationForm.control}
                      name="incidentAlerts"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">
                              Incident Alerts
                            </FormLabel>
                            <p className="text-sm text-gray-500">
                              Get notified of new safety incidents
                            </p>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={notificationForm.control}
                      name="complianceReminders"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">
                              Compliance Reminders
                            </FormLabel>
                            <p className="text-sm text-gray-500">
                              Reminders for compliance deadlines
                            </p>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={notificationForm.control}
                      name="weeklyReports"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">
                              Weekly Reports
                            </FormLabel>
                            <p className="text-sm text-gray-500">
                              Receive weekly safety summary reports
                            </p>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex justify-end">
                    <Button
                      type="submit"
                      className="flex items-center space-x-2"
                    >
                      <Save className="h-4 w-4" />
                      <span>Save Preferences</span>
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── SETTINGS TAB ─── */}
        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Application Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <div className="text-base font-medium">
                      Auto-save Reports
                    </div>
                    <p className="text-sm text-gray-500">
                      Automatically save draft reports
                    </p>
                  </div>
                  <Switch
                    checked={appSettings.autoSaveReports}
                    onCheckedChange={(val) =>
                      handleAppSettingChange("autoSaveReports", val)
                    }
                  />
                </div>

                <div className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <div className="text-base font-medium">Data Sharing</div>
                    <p className="text-sm text-gray-500">
                      Share anonymized data for research
                    </p>
                  </div>
                  <Switch
                    checked={appSettings.dataSharing}
                    onCheckedChange={(val) =>
                      handleAppSettingChange("dataSharing", val)
                    }
                  />
                </div>

                {/* Two-Factor Authentication */}
                <div className="flex flex-row items-center justify-between rounded-lg border p-4 mb-4">
                  <div className="space-y-1">
                    <div className="text-base font-medium flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      Two-Factor Authentication
                    </div>
                    <p className="text-sm text-gray-500">
                      Secure your account with email verification
                    </p>
                    {twoFactorEnabled && (
                      <p className="text-xs text-gray-500 mt-1">
                        Verification Method:{" "}
                        {twoFactorMethod === "email"
                          ? "Email Verification"
                          : "Authenticator App"}
                      </p>
                    )}
                  </div>
                  <Switch
                    checked={twoFactorEnabled}
                    disabled={twoFactorLoading}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        handleEnable2FA();
                      } else {
                        handleDisable2FA();
                      }
                    }}
                  />
                </div>

                {twoFactorEnabled && (
                  <div className="flex flex-col space-y-2 rounded-lg border p-4 mb-4">
                    <p className="text-sm font-medium">
                      Change Verification Method
                    </p>
                    <Select
                      value={twoFactorMethod}
                      onValueChange={async (value: "email") => {
                        try {
                          const token = localStorage.getItem("token");
                          if (!token) return;

                          const res = await fetch(
                            "https://backendworksafer-production.up.railway.app/auth/update-2fa-method",
                            {
                              method: "POST",
                              headers: {
                                "Content-Type": "application/json",
                                Authorization: `Bearer ${token}`,
                              },
                              body: JSON.stringify({ method: value }),
                            },
                          );

                          if (!res.ok)
                            throw new Error("Failed to update 2FA method");

                          setTwoFactorMethod(value);
                          toast({
                            title: "Success",
                            description: "Email-based 2FA enabled",
                          });
                        } catch (error) {
                          toast({
                            title: "Error",
                            description: "Failed to update 2FA method",
                            variant: "destructive",
                          });
                        }
                      }}
                    >
                      <SelectTrigger className="w-64">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="email">
                          Email Verification
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500">
                      A 6-digit code will be sent to your email during login
                    </p>
                  </div>
                )}

                <div className="rounded-lg border p-4">
                  <div className="space-y-2">
                    <div className="text-base font-medium">Language</div>
                    <Select
                      value={appSettings.language}
                      onValueChange={(val) =>
                        handleAppSettingChange("language", val)
                      }
                    >
                      <SelectTrigger className="w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="es">Español</SelectItem>
                        <SelectItem value="fr">Français</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="rounded-lg border p-4">
                  <div className="space-y-2">
                    <div className="text-base font-medium">Time Zone</div>
                    <Select
                      value={appSettings.timeZone}
                      onValueChange={(val) =>
                        handleAppSettingChange("timeZone", val)
                      }
                    >
                      <SelectTrigger className="w-64">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pst">
                          Pacific Standard Time
                        </SelectItem>
                        <SelectItem value="est">
                          Eastern Standard Time
                        </SelectItem>
                        <SelectItem value="cst">
                          Central Standard Time
                        </SelectItem>
                        <SelectItem value="mst">
                          Mountain Standard Time
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  className="flex items-center space-x-2"
                  onClick={saveAppSettings}
                >
                  <Save className="h-4 w-4" />
                  <span>Save Settings</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
