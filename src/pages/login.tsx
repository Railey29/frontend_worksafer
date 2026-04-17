import { GoogleLogin } from "@react-oauth/google";
import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import {
  Shield,
  User,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  Building,
  Mail,
  AlertCircle,
} from "lucide-react";
import { useToast } from "../hooks/use-toast";

const departments = [
  { value: "Safety Department", label: "Safety Department" },
  { value: "Human Resources", label: "Human Resources" },
  { value: "Quality Control", label: "Quality Control" },
  { value: "Environmental", label: "Environmental" },
  { value: "Field Operations Group", label: "Field Operations Group" },
];

const departmentRouteMap: Record<string, string> = {
  "Safety Department": "/dashboard",
  "Human Resources": "/dashboard",
  "Quality Control": "/dashboard",
  Environmental: "/dashboard",
  "Field Operations Group": "/dashboard",
};

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // State for 2FA verification
  const [requiresTwoFactor, setRequiresTwoFactor] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [tempToken, setTempToken] = useState("");
  const [twoFactorEmail, setTwoFactorEmail] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("");

  // State for Google login department selection
  const [googleUser, setGoogleUser] = useState<any>(null);
  const [showGoogleDepartmentSelect, setShowGoogleDepartmentSelect] =
    useState(false);
  const [googleSelectedDepartment, setGoogleSelectedDepartment] = useState("");
  const [isNewGoogleUser, setIsNewGoogleUser] = useState(false);

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    department: "",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // -------------------------------
  // Validation
  // -------------------------------
  const validate = () => {
    const errors: Record<string, string> = {};
    if (!formData.email.trim()) errors.email = "Email is required";
    if (!formData.password) errors.password = "Password is required";
    if (!formData.department) errors.department = "Please select a department";
    return errors;
  };

  // -------------------------------
  // Form Login
  // -------------------------------
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const formErrors = validate();
    if (Object.keys(formErrors).length > 0) {
      setFormErrors(formErrors);
      toast({
        title: "Missing Information",
        description: "Please fill in all fields correctly",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    toast({ title: "Logging In...", description: "Please wait..." });

    try {
      const response = await fetch("https://backendworksafer-production.up.railway.app/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          department: formData.department,
        }),
      });
      const data = await response.json();

      if (response.ok) {
        // If 2FA is required, show 2FA verification screen
        if (data.requiresTwoFactor && data.tempToken) {
          setTempToken(data.tempToken);
          setTwoFactorEmail(formData.email);
          setSelectedDepartment(formData.department);
          setRequiresTwoFactor(true);
          toast({
            title: "Enter 2FA Code",
            description: "Check your email for the 6-digit code",
          });
        }
        // If no 2FA, login normally
        else if (data.token && data.user) {
          // Verify department matches
          if (data.user.department !== formData.department) {
            toast({
              title: "Department Mismatch",
              description: `Your account is registered with ${data.user.department}, but you selected ${formData.department}. Please select the correct department.`,
              variant: "destructive",
            });
            return;
          }

          localStorage.setItem("token", data.token);
          localStorage.setItem("user", JSON.stringify(data.user));
          toast({
            title: "Login Successful",
            description: `Welcome ${data.user.name}`,
          });

          const targetUrl = departmentRouteMap[formData.department];
          setTimeout(() => setLocation(targetUrl), 1000);
        }
      } else {
        toast({
          title: "Login Failed",
          description:
            data.error || "Incorrect credentials or department mismatch",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Error",
        description: "Unable to connect to server",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------
  // Verify 2FA Code
  // -------------------------------
  const handleVerify2FA = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!twoFactorCode || twoFactorCode.length !== 6) {
      toast({
        title: "Invalid Code",
        description: "Please enter a 6-digit code",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        "https://backendworksafer-production.up.railway.app/auth/verify-2fa-code",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tempToken,
            code: twoFactorCode.toString(), // ✅ ensure it's a string
          }),
        }
      );

      const data = await response.json();

      if (response.ok && data.token && data.user) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));

        toast({
          title: "Login Successful",
          description: `Welcome ${data.user.name}`,
        });

        const targetUrl = departmentRouteMap[selectedDepartment];
        setTimeout(() => setLocation(targetUrl), 1000);
      } else {
        toast({
          title: "Invalid Code",
          description:
            data.error || "The code you entered is invalid or expired",
          variant: "destructive",
        });
        setTwoFactorCode("");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Unable to verify code",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------
  // Google Login - Step 1: Show Department Selection (only for new users)
  // -------------------------------
  const handleGoogleSuccess = (credentialResponse: any) => {
    const credential = credentialResponse.credential;
    if (!credential) return;

    // Decode the JWT to get user info
    try {
      const base64Url = credential.split(".")[1];
      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split("")
          .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
          .join("")
      );
      const userPayload = JSON.parse(jsonPayload);

      // Check if user exists in database
      checkUserExists(userPayload.email, credential);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to process Google login",
        variant: "destructive",
      });
    }
  };

  // Decode Google JWT to get user info
  const decodeGoogleToken = (token: string) => {
    try {
      const base64Url = token.split(".")[1];
      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split("")
          .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
          .join("")
      );
      return JSON.parse(jsonPayload);
    } catch (error) {
      console.error("Error decoding token:", error);
      return null;
    }
  };

  // Check if Google user exists in database
  const checkUserExists = async (email: string, credential: string) => {
    try {
      console.log("Checking if user exists:", email);

      const response = await fetch("https://backendworksafer-production.up.railway.app/check-google-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      console.log("Response status:", response.status);
      const data = await response.json();
      console.log("Response data:", data);

      if (data.exists && data.user && data.user.department) {
        // User exists with department - proceed with login directly
        console.log(
          "User exists, logging in with department:",
          data.user.department
        );
        await handleGoogleLoginWithDepartment(
          credential,
          data.user.department,
          false
        );
      } else {
        // New user - show department selection
        console.log("New user, showing department selection");
        const userPayload = decodeGoogleToken(credential);

        if (!userPayload) {
          toast({
            title: "Error",
            description: "Failed to process Google login",
            variant: "destructive",
          });
          return;
        }

        setGoogleUser({
          ...userPayload,
          credential,
        });
        setIsNewGoogleUser(true);
        setShowGoogleDepartmentSelect(true);
      }
    } catch (error) {
      console.error("Check user error:", error);
      toast({
        title: "Error",
        description: "Failed to check user. Please try again.",
        variant: "destructive",
      });
    }
  };

  // -------------------------------
  // Google Login - Step 2: Submit with Department
  // -------------------------------
  const handleGoogleDepartmentSubmit = async () => {
    if (!googleSelectedDepartment) {
      toast({
        title: "Missing Department",
        description: "Please select a department to continue",
        variant: "destructive",
      });
      return;
    }

    await handleGoogleLoginWithDepartment(
      googleUser.credential,
      googleSelectedDepartment,
      true
    );
  };

  // Handle Google login with department
  const handleGoogleLoginWithDepartment = async (
    credential: string,
    department: string,
    isNewUser: boolean = false
  ) => {
    setLoading(true);
    try {
      console.log("Submitting Google login with department:", department);

      const response = await fetch("https://backendworksafer-production.up.railway.app/google-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: credential,
          department,
        }),
      });

      const data = await response.json();
      console.log("Google login response:", data);

      if (!response.ok) {
        throw new Error(data.error || "Login failed");
      }

      if (data.requiresTwoFactor && data.tempToken) {
        // 2FA required
        console.log("2FA required");
        setTempToken(data.tempToken);
        setTwoFactorEmail(data.user?.email || "");
        setSelectedDepartment(department);
        setRequiresTwoFactor(true);
        setShowGoogleDepartmentSelect(false);
        toast({
          title: "Enter 2FA Code",
          description: "Check your authenticator app",
        });
      } else if (data.token && data.user) {
        // Direct login successful
        console.log("Login successful");
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));

        toast({
          title: "Success",
          description: `Welcome ${data.user.name}`,
        });

        setShowGoogleDepartmentSelect(false);

        const targetUrl = departmentRouteMap[department];
        setTimeout(() => setLocation(targetUrl), 1000);
      } else {
        throw new Error(data.error || "Login failed");
      }
    } catch (error) {
      console.error("Google login error:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to login with Google",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleError = () => {
    toast({
      title: "Google Login Failed",
      description: "Please try again.",
      variant: "destructive",
    });
  };

  const handleRegister = () => setLocation("/register");

  // Show Google Department Selection Screen
  if (showGoogleDepartmentSelect && googleUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-primary rounded-full flex items-center justify-center">
              <Building className="h-8 w-8 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900">
              Select Department
            </CardTitle>
            <p className="text-gray-600 text-sm">
              {isNewGoogleUser
                ? "Choose your department to create your account"
                : "Choose your department to continue"}
            </p>
            <p className="text-gray-500 text-xs">{googleUser.email}</p>
          </CardHeader>

          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label
                  htmlFor="google-department"
                  className="text-sm font-medium text-gray-700"
                >
                  Department
                </Label>
                <Select
                  value={googleSelectedDepartment}
                  onValueChange={setGoogleSelectedDepartment}
                >
                  <SelectTrigger
                    id="google-department"
                    className="bg-gray-100 border-gray-200"
                  >
                    <SelectValue placeholder="Select your department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept.value} value={dept.value}>
                        {dept.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={handleGoogleDepartmentSubmit}
                className="w-full bg-primary hover:bg-blue-700 text-white flex items-center justify-center"
                disabled={loading || !googleSelectedDepartment}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />{" "}
                    Processing...
                  </>
                ) : (
                  "Continue"
                )}
              </Button>

              <button
                onClick={() => {
                  setShowGoogleDepartmentSelect(false);
                  setGoogleUser(null);
                  setGoogleSelectedDepartment("");
                  setIsNewGoogleUser(false);
                }}
                className="w-full text-center text-sm text-blue-600 hover:underline"
              >
                Back to Login
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show 2FA verification screen
  if (requiresTwoFactor) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-primary rounded-full flex items-center justify-center">
              <Shield className="h-8 w-8 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900">
              Two-Factor Authentication
            </CardTitle>
            <p className="text-gray-600 text-sm">
              Enter the 6-digit code from your authenticator app
            </p>
            <p className="text-gray-500 text-xs">{twoFactorEmail}</p>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleVerify2FA} className="space-y-4">
              <div className="space-y-2">
                <Label
                  htmlFor="twoFactorCode"
                  className="text-sm font-medium text-gray-700"
                >
                  Authentication Code
                </Label>
                <Input
                  id="twoFactorCode"
                  type="text"
                  maxLength={6}
                  placeholder="000000"
                  value={twoFactorCode}
                  onChange={(e) =>
                    setTwoFactorCode(e.target.value.replace(/\D/g, ""))
                  }
                  className="text-center text-4xl tracking-widest font-mono bg-gray-100 border-gray-200"
                  disabled={loading}
                  onKeyPress={(e) =>
                    e.key === "Enter" && handleVerify2FA(e as any)
                  }
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-primary hover:bg-blue-700 text-white flex items-center justify-center"
                disabled={loading || twoFactorCode.length !== 6}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />{" "}
                    Verifying...
                  </>
                ) : (
                  "Verify Code"
                )}
              </Button>

              <button
                type="button"
                onClick={() => {
                  setRequiresTwoFactor(false);
                  setTwoFactorCode("");
                  setTempToken("");
                  setFormData({ email: "", password: "", department: "" });
                }}
                className="w-full text-center text-sm text-blue-600 hover:underline"
              >
                Back to Login
              </button>
            </form>

            <div className="mt-4 p-3 bg-blue-50 rounded border border-blue-200">
              <p className="text-xs text-blue-800">
                <strong>Tip:</strong> If you've lost access to your
                authenticator app, use one of your backup codes instead.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show normal login screen
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-primary rounded-full flex items-center justify-center">
            <Shield className="h-8 w-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            LOGIN
          </CardTitle>
          <p className="text-gray-600">
            Access your WorkSAFER department portal
          </p>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            {/* Email */}
            <div className="space-y-2">
              <Label
                htmlFor="email"
                className="text-sm font-medium text-gray-700"
              >
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={(e) => {
                    setFormData({ ...formData, email: e.target.value });
                    if (formErrors.email) {
                      setFormErrors({ ...formErrors, email: "" });
                    }
                  }}
                  className={`pl-10 bg-gray-100 border-gray-200 ${
                    formErrors.email ? "border-red-500 border-2" : ""
                  }`}
                />
              </div>
              {formErrors.email && (
                <span className="text-red-500 text-sm flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {formErrors.email}
                </span>
              )}
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label
                htmlFor="password"
                className="text-sm font-medium text-gray-700"
              >
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={(e) => {
                    setFormData({ ...formData, password: e.target.value });
                    if (formErrors.password) {
                      setFormErrors({ ...formErrors, password: "" });
                    }
                  }}
                  className={`pl-10 pr-10 bg-gray-100 border-gray-200 ${
                    formErrors.password ? "border-red-500 border-2" : ""
                  }`}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-2 h-6 w-6 p-0"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {formErrors.password && (
                <span className="text-red-500 text-sm flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {formErrors.password}
                </span>
              )}
            </div>

            {/* Department */}
            <div className="space-y-2">
              <Label
                htmlFor="department"
                className="text-sm font-medium text-gray-700"
              >
                Choose your department
              </Label>
              <div className="relative">
                <Building className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Select
                  value={formData.department}
                  onValueChange={(value) => {
                    setFormData({ ...formData, department: value });
                    if (formErrors.department) {
                      setFormErrors({ ...formErrors, department: "" });
                    }
                  }}
                >
                  <SelectTrigger
                    className={`pl-10 bg-gray-100 border-gray-200 ${
                      formErrors.department ? "border-red-500 border-2" : ""
                    }`}
                  >
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept.value} value={dept.value}>
                        {dept.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {formErrors.department && (
                <span className="text-red-500 text-sm flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {formErrors.department}
                </span>
              )}
            </div>

            {/* Login Button */}
            <Button
              type="submit"
              className="w-full bg-primary hover:bg-blue-700 text-white flex items-center justify-center"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Logging
                  in...
                </>
              ) : (
                "Login to Dashboard"
              )}
            </Button>

            {/* Google Login */}
            <div className="mt-4 flex justify-center">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={handleGoogleError}
              />
            </div>

            {/* Register Redirect */}
            <p className="text-center text-sm text-gray-600 mt-2">
              Don't have an account?{" "}
              <button
                type="button"
                onClick={handleRegister}
                className="text-blue-600 hover:underline"
              >
                Register here
              </button>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
