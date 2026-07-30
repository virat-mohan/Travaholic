import { useState } from "react";
import { Lock } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose
} from "./ui/dialog";
import { toast } from "sonner";
import axios from "axios";
import { API } from "../App";
import { getErrorMessage } from "@/lib/utils";

const getAuthHeaders = () => {
  const token = localStorage.getItem("session_token");
  return { Authorization: `Bearer ${token}` };
};

const ChangePasswordDialog = ({ triggerClassName, testIdPrefix = "change-password" }) => {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });

  const resetForm = () => setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.newPassword !== form.confirmPassword) {
      toast.error("New passwords don't match");
      return;
    }
    if (form.newPassword.length < 6) {
      toast.error("New password must be at least 6 characters");
      return;
    }
    setSaving(true);
    try {
      await axios.post(
        `${API}/auth/change-password`,
        { current_password: form.currentPassword, new_password: form.newPassword },
        { headers: getAuthHeaders() }
      );
      toast.success("Password updated successfully");
      resetForm();
      setOpen(false);
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to update password"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) resetForm(); }}>
      <DialogTrigger asChild>
        <button
          className={triggerClassName || "flex items-center gap-2 text-sm text-background/60 hover:text-background"}
          data-testid={`${testIdPrefix}-btn`}
        >
          <Lock size={16} />
          Change Password
        </button>
      </DialogTrigger>
      <DialogContent data-testid={`${testIdPrefix}-dialog`}>
        <DialogHeader>
          <DialogTitle>Change Password</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="password"
            placeholder="Current password"
            value={form.currentPassword}
            onChange={(e) => setForm({ ...form, currentPassword: e.target.value })}
            required
            data-testid={`${testIdPrefix}-current`}
          />
          <Input
            type="password"
            placeholder="New password"
            value={form.newPassword}
            onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
            required
            minLength={6}
            data-testid={`${testIdPrefix}-new`}
          />
          <Input
            type="password"
            placeholder="Confirm new password"
            value={form.confirmPassword}
            onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
            required
            minLength={6}
            data-testid={`${testIdPrefix}-confirm`}
          />
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">Cancel</Button>
            </DialogClose>
            <Button type="submit" className="btn-luxury" disabled={saving} data-testid={`${testIdPrefix}-submit`}>
              {saving ? "Updating..." : "Update Password"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ChangePasswordDialog;
