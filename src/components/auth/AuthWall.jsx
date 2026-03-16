import { useState } from "react";
import { signup, login, getDomain, getOrgName } from "@/lib/localAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Building2, Mail, Lock, User, Eye, EyeOff, CheckCircle2 } from "lucide-react";

const FEATURES = [
  "Deal pipeline & acquisition tracking",
  "Project management with Gantt charts",
  "Financial dashboards & proformas",
  "GIS mapping & site analysis",
  "Domain-based team collaboration",
  "Analytics, reports & strategy hub",
];

export default function AuthWall({ onAuth }) {
  const [mode, setMode] = useState("signin"); // "signin" | "signup"
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const domain = email.includes("@") ? getDomain(email) : null;
  const orgName = domain ? getOrgName(domain) : null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (mode === "signup") {
      if (!name.trim()) return setError("Please enter your full name.");
      if (!email.trim()) return setError("Please enter your email address.");
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setError("Please enter a valid email address.");
      if (password.length < 8) return setError("Password must be at least 8 characters.");
      if (password !== confirmPassword) return setError("Passwords do not match.");
    } else {
      if (!email.trim()) return setError("Please enter your email address.");
      if (!password) return setError("Please enter your password.");
    }

    setLoading(true);
    try {
      let user;
      if (mode === "signup") {
        user = signup({ name, email, password });
      } else {
        user = login(email, password, remember);
      }
      onAuth(user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-slate-900 flex-col justify-between p-12 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500 rounded-full -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-indigo-500 rounded-full translate-x-1/2 translate-y-1/2" />
        </div>

        <div className="relative">
          <div className="flex items-center gap-3 mb-12">
            <img src="/parcelr-logo.png" alt="Parcelr" className="h-10 w-10 rounded-lg object-contain bg-white p-1" />
            <span className="text-white text-xl font-bold">Parcelr</span>
          </div>

          <h1 className="text-4xl font-bold text-white leading-tight mb-4">
            Real estate development,<br />
            <span className="text-blue-400">built for teams.</span>
          </h1>
          <p className="text-slate-400 text-lg">
            The enterprise platform for land acquisition, project management, and financial analysis.
          </p>
        </div>

        <div className="relative space-y-3">
          {FEATURES.map((f) => (
            <div key={f} className="flex items-center gap-3">
              <CheckCircle2 className="h-4 w-4 text-blue-400 shrink-0" />
              <span className="text-slate-300 text-sm">{f}</span>
            </div>
          ))}
        </div>

        <div className="relative">
          <p className="text-slate-500 text-xs">
            © 2025 Parcelr. Enterprise real estate development platform.
          </p>
        </div>
      </div>

      {/* Right panel — auth form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <img src="/parcelr-logo.png" alt="Parcelr" className="h-7 w-7 object-contain" />
            <span className="font-bold text-slate-900 text-lg">Parcelr</span>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900">
              {mode === "signin" ? "Welcome back" : "Create your account"}
            </h2>
            <p className="text-slate-500 mt-1 text-sm">
              {mode === "signin"
                ? "Sign in to access your workspace."
                : "Sign up to get started. Your email domain defines your organization."}
            </p>
          </div>

          {/* Mode toggle */}
          <div className="flex bg-slate-100 rounded-lg p-1 mb-6">
            <button
              type="button"
              onClick={() => { setMode("signin"); setError(""); }}
              className={cn("flex-1 py-2 text-sm font-medium rounded-md transition-all", mode === "signin" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700")}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setMode("signup"); setError(""); }}
              className={cn("flex-1 py-2 text-sm font-medium rounded-md transition-all", mode === "signup" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700")}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <div>
                <Label htmlFor="name">Full Name</Label>
                <div className="relative mt-1">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input id="name" placeholder="Jane Smith" value={name}
                    onChange={e => setName(e.target.value)} className="pl-9" />
                </div>
              </div>
            )}

            <div>
              <Label htmlFor="email">Work Email</Label>
              <div className="relative mt-1">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input id="email" type="email" placeholder="you@yourcompany.com" value={email}
                  onChange={e => setEmail(e.target.value)} className="pl-9" />
              </div>
              {mode === "signup" && domain && (
                <p className="text-xs text-blue-600 mt-1.5 flex items-center gap-1">
                  <Building2 className="h-3 w-3" />
                  You'll join the <strong>{orgName}</strong> organization ({domain})
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="password">Password</Label>
              <div className="relative mt-1">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input id="password" type={showPassword ? "text" : "password"}
                  placeholder={mode === "signup" ? "At least 8 characters" : "Your password"}
                  value={password} onChange={e => setPassword(e.target.value)} className="pl-9 pr-10" />
                <button type="button" onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {mode === "signup" && (
              <div>
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative mt-1">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input id="confirmPassword" type={showPassword ? "text" : "password"}
                    placeholder="Re-enter password" value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)} className="pl-9" />
                </div>
              </div>
            )}

            {mode === "signin" && (
              <div className="flex items-center gap-2">
                <input id="remember" type="checkbox" checked={remember}
                  onChange={e => setRemember(e.target.checked)}
                  className="rounded border-slate-300" />
                <label htmlFor="remember" className="text-sm text-slate-600 cursor-pointer">
                  Remember me for 30 days
                </label>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <Button type="submit" disabled={loading}
              className="w-full bg-slate-900 hover:bg-slate-800 h-11 text-base mt-2">
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : mode === "signin" ? "Sign In" : "Create Account"}
            </Button>
          </form>

          {mode === "signup" && (
            <p className="text-xs text-slate-400 text-center mt-6">
              The first person to sign up from a domain becomes the organization admin.
              Colleagues who sign up with the same domain will automatically join your org.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
