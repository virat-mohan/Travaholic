import { Link, useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { useAuth, API } from "../App";
import { motion } from "framer-motion";
import { toast } from "sonner";
import axios from "axios";

const LoginPage = () => {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
  const handleLogin = () => {
    const redirectUrl = window.location.origin + '/dashboard';
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
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
      toast.error(error.response?.data?.detail || "Failed to set admin role");
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
      toast.error(error.response?.data?.detail || "Failed to set owner role");
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
                <p className="text-xs text-muted-foreground mt-2">
                  Click above to set yourself as admin for the first time
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

          <h2 className="font-heading text-4xl mb-4">Welcome Back</h2>
          <p className="text-muted-foreground mb-8">
            Sign in to access your admin dashboard or owner portal.
          </p>

          <Button
            onClick={handleLogin}
            className="w-full btn-luxury flex items-center justify-center gap-3"
            data-testid="google-login-btn"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continue with Google
          </Button>

          <p className="text-sm text-muted-foreground text-center mt-8">
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
