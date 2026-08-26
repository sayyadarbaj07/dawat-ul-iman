import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { authApi } from "@/lib/api";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { KeyRound, LogOut, AlertTriangle } from "lucide-react";
import { BrandLogo } from "@/components/common/BrandLogo";

export default function ForceChangePassword() {
  const { user, logout, login } = useAuth();
  const [formData, setFormData] = useState({ currentPassword: "", newPassword: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await authApi.changePassword(formData.currentPassword, formData.newPassword);
      // Re-login to get updated token without mustChangePassword flag
      await login(user.username, formData.newPassword);
      // A full page reload ensures state resets properly, but we can also just wait for the context to update.
      window.location.reload();
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to change password. Please check your current password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-white rounded-xl shadow-xl overflow-hidden border border-gray-100"
      >
        <div className="p-8">
          <div className="flex justify-center mb-6">
            <BrandLogo size="lg" />
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800">
              <strong className="block mb-1">Temporary Password Detected</strong>
              You are using a temporary password. For security reasons, you must change your password before accessing the dashboard.
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 p-3 rounded-lg text-center font-medium">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label>Current (Temporary) Password</Label>
              <Input
                type="password"
                required
                value={formData.currentPassword}
                onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                placeholder="Enter current password"
              />
            </div>

            <div className="space-y-2">
              <Label>New Password</Label>
              <Input
                type="password"
                required
                value={formData.newPassword}
                onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                placeholder="Enter new password"
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              <KeyRound className="mr-2 h-4 w-4" />
              {loading ? "Updating..." : "Update Password"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <Button variant="ghost" className="text-gray-500 hover:text-gray-700" onClick={logout}>
              <LogOut className="mr-2 h-4 w-4" />
              Logout and return later
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
