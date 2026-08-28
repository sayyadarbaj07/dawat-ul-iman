import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { LogOut, X, KeyRound } from "lucide-react";
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
import { BrandLogo } from "@/components/common/BrandLogo";
import { useLanguage } from "@/context/LanguageContext";
import { NAV_GROUPS, NAV_ITEMS } from "./nav";

export function Sidebar({ isOpen, setIsOpen, isMobile }) {
  const [location, setLocation] = useLocation();
  const { user, logout } = useAuth();
  const { t, tr } = useLanguage();

  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
  });

  const handleChangePassword = async (e) => {
    e.preventDefault();
    try {
      await authApi.changePassword(
        passwordForm.currentPassword,
        passwordForm.newPassword,
      );
      alert(tr("common", "passwordChanged"));
      setIsPasswordModalOpen(false);
      setPasswordForm({ currentPassword: "", newPassword: "" });
    } catch (err) {
      console.error(err);
      alert(err.message || tr("common", "passwordChangeFailed"));
    }
  };

  const allowedPaths = user ? ROLE_PERMISSIONS[user.role] : [];
  const navItems = NAV_ITEMS.filter((item) => allowedPaths.includes(item.href));

  const handleNavClick = () => {
    if (isMobile) setIsOpen(false);
  };

  const handleLogout = () => {
    logout();
    setLocation("/login");
  };

  const sidebarContent = (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex h-16 items-center justify-between border-b border-sidebar-border/70 px-4 sm:px-5">
        <BrandLogo
          className="min-w-0 text-sidebar-foreground"
          size="md"
          textClassName="text-sidebar-foreground font-semibold tracking-tight"
          imageClassName="object-contain"
        />
        {isMobile && (
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
            onClick={() => setIsOpen(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        )}
      </div>

      <div className="scrollbar-thin flex-1 overflow-y-auto px-3 py-5">
        <nav className="space-y-6">
          {NAV_GROUPS.map((group) => {
            const items = navItems.filter((item) => item.group === group.id);
            if (!items.length) return null;

            return (
              <div key={group.id}>
                <div className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-sidebar-foreground/45">
                  {tr("navigation", group.labelKey)}
                </div>
                <div className="space-y-0.5">
                  {items.map((item) => {
                    const isActive =
                      location === item.href ||
                      (item.href !== "/" && location.startsWith(item.href));
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={handleNavClick}
                      >
                        <div
                          data-testid={`nav-${item.key}`}
                          className={cn(
                            "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-150 cursor-pointer",
                            isActive
                              ? "bg-white/80 text-sidebar-primary shadow-sm"
                              : "text-sidebar-foreground/70 hover:bg-sidebar-accent/80 hover:text-sidebar-foreground",
                          )}
                        >
                          {isActive && (
                            <motion.div
                              layoutId="sidebar-active"
                              className="absolute start-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-e-full bg-sidebar-primary"
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
                              "h-[18px] w-[18px] shrink-0",
                              isActive
                                ? "text-sidebar-primary"
                                : "text-sidebar-foreground/45 group-hover:text-sidebar-foreground/80",
                            )}
                          />
                          <span className="truncate">
                            {tr("navigation", item.key)}
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>
      </div>

      <div className="border-t border-sidebar-border/70 p-3">
        <div className="rounded-xl border border-sidebar-border/60 bg-white/40 p-3">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-sidebar-primary/20 bg-sidebar-primary/10 text-sidebar-primary">
              <span className="text-sm font-semibold tracking-tight">
                {user?.initials ?? "?"}
              </span>
            </div>
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-sm font-semibold text-sidebar-foreground">
                {user?.name ?? t("guest")}
              </span>
              <span className="truncate text-xs font-medium capitalize text-sidebar-foreground/55">
                {user?.roleLabel ?? user?.role ?? "—"}
              </span>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Dialog
              open={isPasswordModalOpen}
              onOpenChange={setIsPasswordModalOpen}
            >
              <DialogTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-start text-sidebar-foreground/80 hover:bg-sidebar-accent"
                  size="sm"
                >
                  <KeyRound className="mr-2 h-4 w-4" />
                  {tr("common", "changePassword")}
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>{tr("common", "changePassword")}</DialogTitle>
                  <DialogDescription>
                    {tr("common", "changePasswordHint")}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleChangePassword} className="space-y-4 py-2">
                  <div className="space-y-2">
                    <Label>{tr("common", "currentPassword")}</Label>
                    <Input
                      type="password"
                      required
                      value={passwordForm.currentPassword}
                      onChange={(e) =>
                        setPasswordForm({
                          ...passwordForm,
                          currentPassword: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{tr("common", "newPassword")}</Label>
                    <Input
                      type="password"
                      required
                      value={passwordForm.newPassword}
                      onChange={(e) =>
                        setPasswordForm({
                          ...passwordForm,
                          newPassword: e.target.value,
                        })
                      }
                    />
                  </div>
                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsPasswordModalOpen(false)}
                    >
                      {tr("common", "cancel")}
                    </Button>
                    <Button type="submit">{tr("common", "saveChanges")}</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>

            <Button
              variant="ghost"
              data-testid="button-logout"
              className="w-full justify-center border border-transparent text-sidebar-foreground/80 hover:border-destructive/20 hover:bg-destructive/10 hover:text-destructive"
              size="sm"
              onClick={handleLogout}
            >
              <LogOut className="mr-2 h-4 w-4" />
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
          className="fixed inset-0 z-40 bg-foreground/40 backdrop-blur-[2px] transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}
      <div
        className={cn(
          "fixed inset-y-0 start-0 z-50 w-[272px] border-e border-sidebar-border/60 shadow-sm transition-transform duration-300 ease-in-out lg:static lg:translate-x-0",
          isOpen
            ? "translate-x-0"
            : "-translate-x-full rtl:translate-x-full",
        )}
      >
        {sidebarContent}
      </div>
    </>
  );
}
