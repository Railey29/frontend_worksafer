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
import { User, Lock, Mail, Building, Eye, EyeOff, Shield } from "lucide-react";
import { useToast } from "../hooks/use-toast";
import EmailOTPVerification from "../components/EmailOTPVerification";

const departments = [
  { value: "Safety Department", label: "Safety Department" },
  { value: "Human Resources", label: "Human Resources" },
  { value: "Quality Control", label: "Quality Control" },
  { value: "Environmental", label: "Environmental" },
  { value: "Field Operations Group", label: "Field Operations Group" },
];

export default function Registration() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    department: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  // ✅ NEW: OTP step state
  const [step, setStep] = useState<"form" | "otp">("form");

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.firstName.trim())
      newErrors.firstName = "First name is required.";
    if (!formData.lastName.trim())
      newErrors.lastName = "Last name is required.";
    if (!formData.email.includes("@"))
      newErrors.email = "Please enter a valid email.";
    if (formData.password.length < 6)
      newErrors.password = "Password must be at least 6 characters.";
    if (!formData.department) newErrors.department = "Select a department.";
    return newErrors;
  };

  // ✅ UPDATED: handleSubmit now goes to OTP step instead of directly registering
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const formErrors = validate();
    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors);
      toast({
        title: "Missing Information",
        description: "Please fill in all fields correctly",
        variant: "destructive",
      });
      return;
    }

    setErrors({});
    // ✅ Go to OTP verification step (EmailOTPVerification will auto-send the code)
    setStep("otp");
  };

  // ✅ NEW: Called after OTP is verified — now do the actual registration
  const handleVerified = async (verifiedToken: string) => {
    setIsLoading(true);
    try {
      const response = await fetch("https://backendworksafer-production.up.railway.app/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          password: formData.password,
          department: formData.department,
          verifiedToken, // ✅ pass the OTP-verified token
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Registration Successful",
          description: "You can now login.",
        });
        setLocation("/login");
      } else {
        let errorMessage = data.error || "Something went wrong";
        if (data.error && data.error.toLowerCase().includes("duplicate")) {
          errorMessage = "The email you entered is already registered.";
        }
        toast({
          title: "Registration Failed",
          description: errorMessage,
          variant: "destructive",
        });
        // Go back to form if registration fails
        setStep("form");
      }
    } catch {
      toast({
        title: "Error",
        description: "Unable to connect to server",
        variant: "destructive",
      });
      setStep("form");
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // ✅ NEW: Show OTP screen when on otp step
  if (step === "otp") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <EmailOTPVerification
              email={formData.email}
              onVerified={handleVerified}
              onBack={() => setStep("form")}
              apiBase="https://backendworksafer-production.up.railway.app"
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Original registration form (unchanged)
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-primary rounded-full flex items-center justify-center">
            <Shield className="h-8 w-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            REGISTER
          </CardTitle>
          <p className="text-gray-600">Create your WorkSAFER account</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex space-x-4">
              {/* First Name */}
              <div className="space-y-2 flex-1">
                <Label
                  htmlFor="firstName"
                  className="text-sm font-medium text-gray-700"
                >
                  First Name
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="firstName"
                    name="firstName"
                    type="text"
                    placeholder="First name"
                    value={formData.firstName}
                    onChange={handleChange}
                    className="pl-10 bg-gray-100 border-gray-200"
                  />
                </div>
                {errors.firstName && (
                  <span className="text-red-500 text-sm">{errors.firstName}</span>
                )}
              </div>

              {/* Last Name */}
              <div className="space-y-2 flex-1">
                <Label
                  htmlFor="lastName"
                  className="text-sm font-medium text-gray-700"
                >
                  Last Name
                </Label>
                <Input
                  id="lastName"
                  name="lastName"
                  type="text"
                  placeholder="Last name"
                  value={formData.lastName}
                  onChange={handleChange}
                  className="bg-gray-100 border-gray-200"
                />
                {errors.lastName && (
                  <span className="text-red-500 text-sm">{errors.lastName}</span>
                )}
              </div>
            </div>

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
                  name="email"
                  type="email"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={handleChange}
                  className="pl-10 bg-gray-100 border-gray-200"
                />
              </div>
              {errors.email && (
                <span className="text-red-500 text-sm">{errors.email}</span>
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
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleChange}
                  className="pl-10 pr-10 bg-gray-100 border-gray-200"
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
              {errors.password && (
                <span className="text-red-500 text-sm">{errors.password}</span>
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
                  onValueChange={(value) =>
                    setFormData({ ...formData, department: value })
                  }
                >
                  <SelectTrigger className="w-full pl-10 bg-gray-100 border-gray-200 text-gray-800">
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
              {errors.department && (
                <span className="text-red-500 text-sm">
                  {errors.department}
                </span>
              )}
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full bg-primary hover:bg-blue-700 text-white"
              disabled={isLoading}
            >
              {isLoading ? "Processing..." : "Register Account"}
            </Button>

            {/* Login Redirect */}
            <p className="text-center text-sm text-gray-600">
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => setLocation("/login")}
                className="text-blue-600 hover:underline"
              >
                Login here
              </button>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
