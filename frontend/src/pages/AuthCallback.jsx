import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../App";
import axios from "axios";
import { API } from "../App";

// REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
const AuthCallback = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const hasProcessed = useRef(false);

  useEffect(() => {
    // Prevent double processing in StrictMode
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const processAuth = async () => {
      try {
        // Extract session_id from URL fragment
        const hash = window.location.hash;
        const params = new URLSearchParams(hash.substring(1));
        const sessionId = params.get("session_id");

        if (!sessionId) {
          console.error("No session_id found");
          navigate("/login");
          return;
        }

        // Exchange session_id for user data and session_token
        const response = await axios.get(`${API}/auth/session`, {
          headers: { "X-Session-ID": sessionId },
        });

        const { session_token, ...userData } = response.data;

        // Store session and update auth context
        login(userData, session_token);

        // Redirect based on role
        if (userData.role === "admin") {
          navigate("/admin", { state: { user: userData } });
        } else if (userData.role === "owner") {
          navigate("/owner", { state: { user: userData } });
        } else {
          navigate("/", { state: { user: userData } });
        }
      } catch (error) {
        console.error("Auth callback error:", error);
        navigate("/login");
      }
    };

    processAuth();
  }, [navigate, login]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="w-12 h-12 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-muted-foreground">Authenticating...</p>
      </div>
    </div>
  );
};

export default AuthCallback;
