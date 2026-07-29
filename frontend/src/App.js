import { useEffect, useState, useRef, createContext, useContext, Suspense, lazy } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, useLocation, useNavigate, Link } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import axios from "axios";

// Pages - lazy-loaded per route so a villa-page visitor's browser never has
// to download the (much larger) admin/owner dashboard bundles, and vice
// versa. Was previously one single bundle for every page on the site.
//
// lazyWithReload wraps each import() so a chunk fetch that's stuck (hung
// network request, never resolves) or fails (e.g. the browser has an old
// cached page referencing a chunk file that no longer exists after a new
// deploy) triggers one automatic full-page reload instead of leaving the
// user stuck on the loading spinner forever. Only retries once per
// session, so a genuine persistent error still surfaces instead of
// reload-looping.
const RELOAD_FLAG = "travaholic_chunk_reload_attempted";

const withTimeout = (promise, ms) =>
  Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error("Chunk load timed out")), ms)),
  ]);

const lazyWithReload = (importFn) =>
  lazy(() =>
    withTimeout(importFn(), 15000).catch((err) => {
      if (!sessionStorage.getItem(RELOAD_FLAG)) {
        sessionStorage.setItem(RELOAD_FLAG, "1");
        window.location.reload();
        return new Promise(() => {}); // reload is in flight, never resolve
      }
      throw err;
    })
  );

const HomePage = lazyWithReload(() => import("./pages/HomePage"));
const VillasPage = lazyWithReload(() => import("./pages/VillasPage"));
const ServicesPage = lazyWithReload(() => import("./pages/ServicesPage"));
const VillaDetailPage = lazyWithReload(() => import("./pages/VillaDetailPage"));
const AboutPage = lazyWithReload(() => import("./pages/AboutPage"));
const ContactPage = lazyWithReload(() => import("./pages/ContactPage"));
const ListYourVillaPage = lazyWithReload(() => import("./pages/ListYourVillaPage"));
const BlogPage = lazyWithReload(() => import("./pages/BlogPage"));
const LoginPage = lazyWithReload(() => import("./pages/LoginPage"));
const AcceptInvitePage = lazyWithReload(() => import("./pages/AcceptInvitePage"));
const AdminDashboard = lazyWithReload(() => import("./pages/admin/AdminDashboard"));
const OwnerDashboard = lazyWithReload(() => import("./pages/owner/OwnerDashboard"));
const PrivateOfferPage = lazyWithReload(() => import("./pages/PrivateOfferPage"));
const BlogPostPage = lazyWithReload(() => import("./pages/BlogPostPage"));
const PrivacyPolicyPage = lazyWithReload(() => import("./pages/PrivacyPolicyPage"));
const TermsOfServicePage = lazyWithReload(() => import("./pages/TermsOfServicePage"));

// Components
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import { Toaster } from "./components/ui/sonner";
import SplashScreen, { shouldShowSplash } from "./components/SplashScreen";

export const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
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

import WhatsAppButton from "./components/WhatsAppButton";

// Layout wrapper for public pages
const PublicLayout = ({ children }) => {
  return (
    <>
      <Navbar />
      <main>{children}</main>
      <Footer />
      <WhatsAppButton />
    </>
  );
};

// Resets scroll position to the top on every route change - browsers don't
// do this automatically for client-side navigation.
const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
};

// App Router Component
const RouteLoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
  </div>
);

function AppRouter() {
  return (
    <Suspense fallback={<RouteLoadingFallback />}>
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
        path="/services"
        element={
          <PublicLayout>
            <ServicesPage />
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
      <Route
        path="/blog/:slug"
        element={
          <PublicLayout>
            <BlogPostPage />
          </PublicLayout>
        }
      />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/accept-invite/:token" element={<AcceptInvitePage />} />
      <Route
        path="/privacy"
        element={
          <PublicLayout>
            <PrivacyPolicyPage />
          </PublicLayout>
        }
      />
      <Route
        path="/terms"
        element={
          <PublicLayout>
            <TermsOfServicePage />
          </PublicLayout>
        }
      />

      {/* Private Offer Payment Page */}
      <Route
        path="/offer/:offerId"
        element={
          <PublicLayout>
            <PrivateOfferPage />
          </PublicLayout>
        }
      />

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
    </Suspense>
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

// The splash is the homepage's opening sequence, not a global overlay - it
// must only ever appear when someone actually lands on "/". Without this
// route check it was rendering on top of whatever page loaded first in a
// session (e.g. a villa page opened directly from the admin dashboard),
// making that page look like it had redirected to the homepage.
const SplashGate = () => {
  const location = useLocation();
  const [showSplash, setShowSplash] = useState(() => shouldShowSplash());

  if (!showSplash || location.pathname !== "/") return null;
  return <SplashScreen onComplete={() => setShowSplash(false)} />;
};

function App() {
  return (
    <HelmetProvider>
      <BrowserRouter>
        <AuthProvider>
          <div className="App min-h-screen bg-background">
            <ScrollToTop />
            <AppRouter />
            <Toaster position="top-right" richColors />
            <SplashGate />
          </div>
        </AuthProvider>
      </BrowserRouter>
    </HelmetProvider>
  );
}

export default App;
