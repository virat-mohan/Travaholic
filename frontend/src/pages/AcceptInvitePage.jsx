import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { useAuth, API } from "../App";
import { toast } from "sonner";
import axios from "axios";
import { getErrorMessage } from "@/lib/utils";

const AcceptInvitePage = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const { login } = useAuth();

  const [invite, setInvite] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchInvite = async () => {
      try {
        const response = await axios.get(`${API}/auth/invite/${token}`);
        setInvite(response.data);
      } catch (err) {
        setError(getErrorMessage(err, "This invite link is invalid or has expired."));
      } finally {
        setLoading(false);
      }
    };
    fetchInvite();
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error("Passwords don't match");
      return;
    }
    setSubmitting(true);
    try {
      const response = await axios.post(`${API}/auth/accept-invite`, { token, password });
      const { session_token, ...userData } = response.data;
      login(userData, session_token);
      toast.success("Account activated!");
      navigate(userData.role === "admin" ? "/admin" : "/owner");
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to activate account"));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-12 h-12 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-8">
        <div className="text-center max-w-md">
          <h2 className="font-heading text-2xl mb-4">Invite Link Invalid</h2>
          <p className="text-muted-foreground mb-6">{error}</p>
          <Link to="/login">
            <Button variant="outline">Go to Login</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-8">
      <div className="w-full max-w-md">
        <img
          src="/Travaholic_color_logo-removebg-preview.png"
          alt="Travaholic Stays"
          className="h-16 w-auto mx-auto mb-8"
        />
        <h2 className="font-heading text-3xl mb-2 text-center">Welcome, {invite.name}</h2>
        <p className="text-muted-foreground mb-8 text-center">
          Set a password for <strong>{invite.email}</strong> to activate your {invite.role} account.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              placeholder="••••••••"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              placeholder="••••••••"
            />
          </div>
          <Button type="submit" className="w-full btn-luxury" disabled={submitting}>
            {submitting ? "Activating..." : "Activate Account"}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default AcceptInvitePage;
