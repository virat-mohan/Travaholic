import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { useAuth, API } from "../App";
import { motion } from "framer-motion";
import { toast } from "sonner";
import axios from "axios";
import { getErrorMessage } from "@/lib/utils";

const LoginPage = () => {
  const { isAuthenticated, user, login } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState("login"); // "login" | "register"
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const endpoint = mode === "login" ? "/auth/login" : "/auth/register";
      const payload =
        mode === "login"
          ? { email: form.email, password: form.password }
          : { name: form.name, email: form.email, password: form.password };

      const response = await axios.post(`${API}${endpoint}`, payload);
      const { session_token, ...userData } = response.data;
      login(userData, session_token);

      if (userData.role === "admin") {
        navigate("/admin");
      } else if (userData.role === "owner") {
        navigate("/owner");
      } else {
        navigate("/login");
      }
    } catch (error) {
      toast.error(getErrorMessage(error, "Something went wrong"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleMakeAdmin = async () => {
    try {
      const token = localStorage.getItem("session_token");
      await axios.post(`${API}/make-admin`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("You are now an admin! Redirecting...");
      setTimeout(() => {
        window.location.href = "/admin";
      }, 1000);
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to set admin role"));
    }
  };

  const handleMakeOwner = async () => {
    try {
      const token = localStorage.getItem("session_token");
      const response = await axios.post(`${API}/make-owner`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(response.data.message + " Redirecting...");
      setTimeout(() => {
        window.location.href = "/owner";
      }, 1000);
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to set owner role"));
    }
  };

  // If already authenticated, show options
  if (isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <img
            src="/Travaholic_color_logo-removebg-preview.png"
            alt="Travaholic Stays"
            className="h-16 w-auto mx-auto mb-8"
          />
          <h2 className="font-heading text-2xl mb-2">Welcome, {user?.name}!</h2>
          <p className="text-muted-foreground mb-6">Your role: <span className="font-medium">{user?.role || 'guest'}</span></p>

          <div className="space-y-3">
            {user?.role === 'admin' ? (
              <Link to="/admin" className="block">
                <Button className="w-full btn-luxury">Go to Admin Dashboard</Button>
              </Link>
            ) : user?.role === 'owner' ? (
              <Link to="/owner" className="block">
                <Button className="w-full btn-luxury">Go to Owner Portal</Button>
              </Link>
            ) : (
              <>
                <Button onClick={handleMakeAdmin} className="w-full btn-luxury">
                  Become Admin (First-time Setup)
                </Button>
                <Button onClick={handleMakeOwner} variant="outline" className="w-full">
                  Become Villa Owner (Demo)
                </Button>
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  Select a role to access your dashboard
                </p>
              </>
            )}

            <Link to="/" className="block">
              <Button variant="outline" className="w-full">Back to Home</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex" data-testid="login-page">
      {/* Left - Image */}
      <div className="hidden lg:block lg:w-1/2 relative">
        <img
          src="https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=1200&q=80"
          alt="Luxury Villa"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-transparent to-background/20" />
      </div>

      {/* Right - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <Link to="/" className="block mb-12">
            <img
              src="/Travaholic_color_logo-removebg-preview.png"
              alt="Travaholic Stays"
              className="h-16 w-auto"
            />
          </Link>

          <h2 className="font-heading text-4xl mb-4">
            {mode === "login" ? "Welcome Back" : "Create Account"}
          </h2>
          <p className="text-muted-foreground mb-8">
            {mode === "login"
              ? "Sign in to access your admin dashboard or owner portal."
              : "Register to request admin or owner access."}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4" data-testid="login-form">
            {mode === "register" && (
              <div className="space-y-1.5">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  required
                  placeholder="Your name"
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                required
                placeholder="you@example.com"
                data-testid="login-email"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                value={form.password}
                onChange={handleChange}
                required
                minLength={6}
                placeholder="••••••••"
                data-testid="login-password"
              />
            </div>

            <Button
              type="submit"
              className="w-full btn-luxury"
              disabled={submitting}
              data-testid="login-submit-btn"
            >
              {submitting ? "Please wait..." : mode === "login" ? "Sign In" : "Create Account"}
            </Button>
          </form>

          <p className="text-sm text-muted-foreground text-center mt-6">
            {mode === "login" ? (
              <>
                Don&apos;t have an account?{" "}
                <button
                  type="button"
                  className="text-accent hover:underline"
                  onClick={() => setMode("register")}
                >
                  Create one
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button
                  type="button"
                  className="text-accent hover:underline"
                  onClick={() => setMode("login")}
                >
                  Sign in
                </button>
              </>
            )}
          </p>

          <p className="text-sm text-muted-foreground text-center mt-4">
            For admin or owner access only.
            <br />
            <Link to="/" className="text-accent hover:underline">
              Go back to home
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default LoginPage;
