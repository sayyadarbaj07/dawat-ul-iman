import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  BookOpen,
  CalendarCheck,
  FileSpreadsheet,
  Landmark,
  Home,
  Activity,
  UsersRound,
  Calendar,
  BarChart,
  LogOut,
  X,
  KeyRound,
  Settings,
} from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { useAuth, ROLE_PERMISSIONS } from "@/context/AuthContext";
import { authApi } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { BrandLogo } from "@/components/common/BrandLogo";
import { useLanguage } from "@/context/LanguageContext";

const ALL_NAV_ITEMS = [
  { href: "/", key: "dashboard", icon: LayoutDashboard },
  { href: "/students", key: "students", icon: Users },
  { href: "/teachers", key: "teachers", icon: GraduationCap },
  { href: "/curriculum", key: "curriculum", icon: BookOpen },
  { href: "/attendance", key: "attendance", icon: CalendarCheck },
  { href: "/exams", key: "exams", icon: FileSpreadsheet },
  { href: "/finance", key: "finance", icon: Landmark },
  { href: "/hostel", key: "hostel", icon: Home },
  { href: "/activities", key: "activities", icon: Activity },
  { href: "/meetings", key: "meetings", icon: UsersRound },
  { href: "/calendar", key: "calendar", icon: Calendar },
  { href: "/reports", key: "reports", icon: BarChart },
  { href: "/audit", key: "auditLogs", icon: Activity },
  { href: "/settings", key: "settings", icon: Settings },
];

export function Sidebar({ isOpen, setIsOpen, isMobile }) {
  const [location, setLocation] = useLocation();
  const { user, logout } = useAuth();
  const { t, tr } = useLanguage();
  
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "" });

  const handleChangePassword = async (e) => {
    e.preventDefault();
    try {
      await authApi.changePassword(passwordForm.currentPassword, passwordForm.newPassword);
      alert("Password changed successfully!");
      setIsPasswordModalOpen(false);
      setPasswordForm({ currentPassword: "", newPassword: "" });
    } catch (err) {
      console.error(err);
      alert(err.message || "Failed to change password");
    }
  };
  
  const allowedPaths = user ? ROLE_PERMISSIONS[user.role] : [];
  const navItems = ALL_NAV_ITEMS.filter((item) =>
    allowedPaths.includes(item.href),
  );

  const handleNavClick = () => {
    if (isMobile) setIsOpen(false);
  };

  const handleLogout = () => {
    logout();
    setLocation("/login");
  };

  const sidebarContent = (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground shadow-2xl">
      {/* Logo */}
      <div className="flex h-16 items-center px-6 justify-between border-b border-sidebar-border/50">
        <BrandLogo
          className="text-sidebar-foreground"
          size="lg"
          textClassName="text-sidebar-foreground font-bold tracking-tight"
          imageClassName="object-contain"
        />
        {isMobile && (
          <Button
            variant="ghost"
            size="icon"
            className="text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-white"
            onClick={() => setIsOpen(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        )}
      </div>

      {/* Nav */}
      <div className="flex-1 overflow-y-auto py-6 px-4 scrollbar-thin">
        <div className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/50">
          Main Menu
        </div>
        <nav className="space-y-1">
          {navItems.map((item) => {
            const isActive =
              location === item.href ||
              (item.href !== "/" && location.startsWith(item.href));
            return (
              <Link key={item.href} href={item.href} onClick={handleNavClick}>
                <div
                  data-testid={`nav-${item.key}`}
                  className={cn(
                    "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 cursor-pointer",
                    isActive
                      ? "bg-sidebar-primary/10 text-sidebar-primary shadow-sm"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                  )}
                >
                  {isActive && (
                    <motion.div
                      layoutId="sidebar-active"
                      className="absolute left-0 top-1/2 -translate-y-1/2 h-8 w-1 rounded-r-full bg-sidebar-primary"
                      initial={false}
                      transition={{
                        type: "spring",
                        stiffness: 300,
                        damping: 30,
                      }}
                    />
                  )}
                  <item.icon
                    className={cn(
                      "h-5 w-5 shrink-0 transition-colors",
                      isActive
                        ? "text-sidebar-primary"
                        : "text-sidebar-foreground/50 group-hover:text-sidebar-foreground/80"
                    )}
                  />
                  {tr("navigation", item.key)}
                </div>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* User footer */}
      <div className="p-4 mt-auto">
        <div className="rounded-xl bg-sidebar-accent/30 border border-sidebar-border/50 p-4 backdrop-blur-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-full bg-sidebar-primary/20 text-sidebar-primary flex items-center justify-center border border-sidebar-primary/30 shrink-0 shadow-sm">
              <span className="text-sm font-bold tracking-tight">
                {user?.initials ?? "?"}
              </span>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-semibold text-sidebar-foreground truncate">
                {user?.name ?? "Guest"}
              </span>
              <span className="text-xs font-medium text-sidebar-foreground/60 capitalize truncate">
                {user?.roleLabel ?? user?.role ?? "—"}
              </span>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Dialog open={isPasswordModalOpen} onOpenChange={setIsPasswordModalOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-start text-sidebar-foreground/80 hover:bg-sidebar-border/30 transition-colors"
                  size="sm"
                >
                  <KeyRound className="h-4 w-4 mr-2" />
                  Change Password
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Change Password</DialogTitle>
                  <DialogDescription>
                    Update your account password. You must know your current password.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleChangePassword} className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Current Password</Label>
                    <Input
                      type="password"
                      required
                      value={passwordForm.currentPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>New Password</Label>
                    <Input
                      type="password"
                      required
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                    />
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsPasswordModalOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">Save Changes</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>

            <Button
              variant="ghost"
              data-testid="button-logout"
              className="w-full justify-center text-sidebar-foreground/80 bg-sidebar-border/30 hover:bg-destructive/20 hover:text-red-400 transition-colors border border-transparent hover:border-destructive/30"
              size="sm"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4 mr-2" />
              {t("logout")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {isMobile && isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:block border-r border-sidebar-border/30",
          isOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {sidebarContent}
      </div>
    </>
  );
}
