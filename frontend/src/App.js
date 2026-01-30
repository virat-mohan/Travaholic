import { useEffect, useState, useRef, createContext, useContext } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, useLocation, useNavigate, Link } from "react-router-dom";
import axios from "axios";

// Pages
import HomePage from "./pages/HomePage";
import VillasPage from "./pages/VillasPage";
import VillaDetailPage from "./pages/VillaDetailPage";
import AboutPage from "./pages/AboutPage";
import ContactPage from "./pages/ContactPage";
import ListYourVillaPage from "./pages/ListYourVillaPage";
import BlogPage from "./pages/BlogPage";
import LoginPage from "./pages/LoginPage";
import AuthCallback from "./pages/AuthCallback";
import AdminDashboard from "./pages/admin/AdminDashboard";
import OwnerDashboard from "./pages/owner/OwnerDashboard";

// Components
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import { Toaster } from "./components/ui/sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

// Auth Context
const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const checkAuth = async () => {
    try {
      const sessionToken = localStorage.getItem("session_token");
      if (!sessionToken) {
        setLoading(false);
        return;
      }

      const response = await axios.get(`${API}/auth/me`, {
        headers: { Authorization: `Bearer ${sessionToken}` },
        withCredentials: true,
      });

      setUser(response.data);
      setIsAuthenticated(true);
    } catch (error) {
      console.error("Auth check failed:", error);
      localStorage.removeItem("session_token");
    } finally {
      setLoading(false);
    }
  };

  const login = (userData, sessionToken) => {
    localStorage.setItem("session_token", sessionToken);
    setUser(userData);
    setIsAuthenticated(true);
  };

  const logout = async () => {
    try {
      const sessionToken = localStorage.getItem("session_token");
      await axios.post(
        `${API}/auth/logout`,
        {},
        {
          headers: { Authorization: `Bearer ${sessionToken}` },
          withCredentials: true,
        }
      );
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      localStorage.removeItem("session_token");
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, loading, isAuthenticated, login, logout, checkAuth }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Protected Route Component
const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { user, loading, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate("/login", { state: { from: location.pathname } });
    } else if (
      !loading &&
      isAuthenticated &&
      allowedRoles.length > 0 &&
      !allowedRoles.includes(user?.role)
    ) {
      navigate("/");
    }
  }, [loading, isAuthenticated, user, navigate, location, allowedRoles]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;
  if (allowedRoles.length > 0 && !allowedRoles.includes(user?.role)) return null;

  return children;
};

// Layout wrapper for public pages
const PublicLayout = ({ children }) => {
  return (
    <>
      <Navbar />
      <main>{children}</main>
      <Footer />
    </>
  );
};

// App Router Component
function AppRouter() {
  const location = useLocation();

  // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
  // Handle auth callback - check for session_id in URL fragment
  if (location.hash?.includes("session_id=")) {
    return <AuthCallback />;
  }

  return (
    <Routes>
      {/* Public Routes */}
      <Route
        path="/"
        element={
          <PublicLayout>
            <HomePage />
          </PublicLayout>
        }
      />
      <Route
        path="/villas"
        element={
          <PublicLayout>
            <VillasPage />
          </PublicLayout>
        }
      />
      <Route
        path="/villas/:slug"
        element={
          <PublicLayout>
            <VillaDetailPage />
          </PublicLayout>
        }
      />
      <Route
        path="/about"
        element={
          <PublicLayout>
            <AboutPage />
          </PublicLayout>
        }
      />
      <Route
        path="/contact"
        element={
          <PublicLayout>
            <ContactPage />
          </PublicLayout>
        }
      />
      <Route
        path="/list-your-villa"
        element={
          <PublicLayout>
            <ListYourVillaPage />
          </PublicLayout>
        }
      />
      <Route
        path="/blog"
        element={
          <PublicLayout>
            <BlogPage />
          </PublicLayout>
        }
      />
      <Route path="/login" element={<LoginPage />} />

      {/* Admin Routes */}
      <Route
        path="/admin/*"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />

      {/* Owner Routes */}
      <Route
        path="/owner/*"
        element={
          <ProtectedRoute allowedRoles={["owner", "admin"]}>
            <OwnerDashboard />
          </ProtectedRoute>
        }
      />

      {/* Dashboard redirect based on role */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardRedirect />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

// Dashboard Redirect Component
const DashboardRedirect = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user?.role === "admin") {
      navigate("/admin");
    } else if (user?.role === "owner") {
      navigate("/owner");
    } else {
      navigate("/");
    }
  }, [user, navigate]);

  return null;
};

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="App min-h-screen bg-background">
          <AppRouter />
          <Toaster position="top-right" richColors />
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
