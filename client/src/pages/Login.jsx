import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, LogIn, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/context/LanguageContext";
import { BrandLogo } from "@/components/common/BrandLogo";

export default function Login() {
  const { login } = useAuth();
  const [, setLocation] = useLocation();
  const { language, setLanguage, t, tr } = useLanguage();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const schema = z.object({
    username: z.string().min(1, t("requiredUsername")),
    password: z.string().min(1, t("requiredPassword")),
  });

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: { username: "", password: "" },
  });

  const onSubmit = async (data) => {
    setIsLoading(true);
    setError("");
    const success = await login(data.username, data.password);
    if (success) {
      setLocation("/");
    } else {
      setError(t("invalidCredentials"));
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-sidebar/95 via-sidebar/80 to-primary/30 flex items-center justify-center p-4 sm:p-6 md:p-8">
      {/* Floating Language Toggle */}
      <div className="fixed top-4 right-4 z-50">
        <Button
          variant="outline"
          size="sm"
          className="bg-white/90 backdrop-blur-sm border-white/20 shadow-sm hover:bg-white transition-all rounded-full px-4"
          onClick={() => setLanguage(language === "en" ? "ur" : "en")}
        >
          {language === "en" ? t("urdu") : t("english")}
        </Button>
      </div>

      <div className="w-full max-w-5xl bg-white rounded-3xl shadow-2xl shadow-black/10 overflow-hidden flex flex-col lg:flex-row">

        {/* Left Panel - Branding (Hidden on Mobile) */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="lg:w-[45%] bg-sidebar text-sidebar-foreground p-8 lg:p-12 hidden lg:flex flex-col justify-between relative overflow-hidden"
        >
          {/* Subtle background pattern/gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/10 pointer-events-none" />

          <div className="relative z-10">
            <div className="mb-12">
              <BrandLogo
                className="text-sidebar-foreground"
                size="lg"
                textClassName="text-sidebar-foreground"
                imageClassName="object-cover"
              />
            </div>

            <h2 className="text-4xl font-bold tracking-tight leading-tight mb-4">
              {t("appSubtitle")}
            </h2>
            <p className="text-sidebar-foreground/80 text-base leading-relaxed mb-10 max-w-sm">
              {t("appTagline")}
            </p>

            <div className="space-y-4">
              {[
                tr("auth", "featureStudentTeacher"),
                tr("auth", "featureAttendance"),
                tr("auth", "featureExams"),
                tr("auth", "featureFinance"),
                tr("auth", "featureHostel"),
              ].map((item, i) => (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + i * 0.1 }}
                  key={item}
                  className="flex items-center gap-3 text-sm font-medium text-sidebar-foreground/90"
                >
                  <div className="h-2 w-2 rounded-full bg-primary shadow-[0_0_8px_rgba(var(--primary),0.6)]" />
                  {item}
                </motion.div>
              ))}
            </div>
          </div>

          <div className="relative z-10 text-sm text-sidebar-foreground/50 mt-12 font-medium">
            {t("copyright")}
          </div>
        </motion.div>

        {/* Right Panel - Login Form */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
          className="flex-1 p-8 sm:p-10 lg:p-12 flex flex-col justify-center bg-white"
        >
          {/* Mobile Logo */}
          <div className="mb-8 lg:hidden flex justify-center">
            <BrandLogo
              className="text-gray-900"
              size="md"
              textClassName="text-gray-900"
              imageClassName="object-cover"
            />
          </div>

          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
              {tr("auth", "welcomeBack")}
            </h1>
            <p className="text-gray-500 mt-2 text-sm">
              {tr("auth", "signInToContinue")}
            </p>
          </div>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-sm font-semibold text-gray-700">
                {tr("auth", "username")}
              </Label>
              <Input
                id="username"
                data-testid="input-username"
                placeholder={tr("auth", "enterUsername")}
                autoComplete="username"
                {...form.register("username")}
                className={`h-12 bg-gray-50/50 border-gray-200 transition-all focus-visible:ring-primary focus-visible:bg-white ${form.formState.errors.username ? "border-destructive focus-visible:ring-destructive" : ""
                  }`}
              />
              {form.formState.errors.username && (
                <p className="text-xs font-medium text-destructive mt-1">
                  {form.formState.errors.username.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm font-semibold text-gray-700">
                  {tr("auth", "password")}
                </Label>
                {/* Optional: Add a "Forgot Password?" link here if needed in the future */}
              </div>
              <div className="relative">
                <Input
                  id="password"
                  data-testid="input-password"
                  type={showPassword ? "text" : "password"}
                  placeholder={tr("auth", "enterPassword")}
                  autoComplete="current-password"
                  {...form.register("password")}
                  className={`h-12 bg-gray-50/50 border-gray-200 pr-12 transition-all focus-visible:ring-primary focus-visible:bg-white ${form.formState.errors.password ? "border-destructive focus-visible:ring-destructive" : ""
                    }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-gray-700 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {form.formState.errors.password && (
                <p className="text-xs font-medium text-destructive mt-1">
                  {form.formState.errors.password.message}
                </p>
              )}
            </div>

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-4 py-3 font-medium">
                    {error}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <Button
              type="submit"
              data-testid="button-login"
              className="w-full h-12 text-base font-semibold shadow-md hover:shadow-lg transition-all duration-200"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="animate-spin h-5 w-5" />
                  {tr("auth", "signingIn")}
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <LogIn className="h-5 w-5" />
                  {tr("auth", "signIn")}
                </span>
              )}
            </Button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}