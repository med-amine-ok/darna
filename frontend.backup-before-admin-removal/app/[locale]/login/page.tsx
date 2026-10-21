"use client";

import React, { useState } from "react";
import Container from "@/components/Container";
import { Link, useRouter } from "@/navigation";
import { useRegisterModal } from "@/hook/useRegisterModal";
import { toast } from "react-toastify";
import {
  BrandGoogleIcon,
  BrandAppleIcon,
  BrandEyeIcon,
  BrandEyeOffIcon,
  BrandPhoneIcon,
  BrandLockIcon,
  BrandMailIcon,
  BrandChevronLeftIcon,
} from "@/components/icons";
import Image from "next/image";
import { switchUser, resetUserToGuest } from "@/lib/data/auth";

export default function LoginPage() {
  const router = useRouter();
  const registerModal = useRegisterModal();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please enter both email and password");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) throw new Error("Login failed");
      const data = await res.json();

      let targetUserId = data.user?.id || "usr_yacine";
      document.cookie = `darna_user_id=${targetUserId}; path=/; max-age=31536000`;
      await switchUser(targetUserId);

      toast.success("Welcome back to DARNA!");
      const callback =
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search).get("callbackUrl") || "/"
          : "/";
      window.location.href = callback;
    } catch {
      toast.error("Could not sign in. Please verify your credentials.");
      setIsLoading(false);
    }
  };

  const handleQuickDemo = async (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword("darna2026pass");
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: demoEmail }),
      });

      if (!res.ok) throw new Error("Demo login failed");
      const data = await res.json();
      const user = data.user;
      const isTraveler = demoEmail.includes("yacine");

      if (isTraveler) {
        document.cookie = "darna_host_type=; path=/; max-age=0";
        await resetUserToGuest("usr_yacine");
        if (typeof window !== "undefined") {
          localStorage.removeItem("darna_host_draft");
          localStorage.setItem("darna_mode", "traveler");
        }
      } else {
        document.cookie = "darna_host_type=individual; path=/; max-age=31536000";
        document.cookie = "darna_agency_id=; path=/; max-age=0";
        if (typeof window !== "undefined") {
          localStorage.setItem("darna_mode", "host");
        }
      }

      await switchUser(user.id);
      toast.success(
        `Logged in as ${isTraveler ? "Traveler (Yacine Cherif - Guest)" : "Host (Amina Benali)"}`
      );
      const callback =
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search).get("callbackUrl") || "/"
          : "/";
      window.location.href = callback;
    } catch {
      toast.error("Demo login error.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-light/60 py-12 flex flex-col justify-center">
      <Container className="max-w-md w-full">
        {/* Back Link */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-neutral-600 hover:text-primary mb-6 transition"
        >
          <BrandChevronLeftIcon size={18} className="rtl:rotate-180" />
          <span>Back to Home</span>
        </Link>

        {/* Card */}
        <div className="bg-white rounded-3xl p-8 sm:p-10 border border-tertiary shadow-xl">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <Image
                src="/assets/logo-horizontal.png"
                alt="DARNA"
                width={160}
                height={50}
                priority
                className="h-10 w-auto object-contain"
              />
            </div>
            <h1 className="text-2xl font-bold text-primary">Welcome Back</h1>
            <p className="text-sm text-neutral-500 mt-1.5">
              Log in to manage your stays, bookings, and host dashboard
            </p>
          </div>

          {/* Quick Demo Logins */}
          <div className="mb-6 p-3.5 bg-tertiary/20 rounded-2xl border border-tertiary/40">
            <div className="text-xs font-semibold text-primary mb-2 text-center">
              Quick One-Click Demo Access
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickDemo("yacine.traveler@darna.dz")}
                className="py-1.5 px-2 bg-white rounded-xl text-xs font-medium text-neutral-700 hover:bg-neutral-50 border border-tertiary/50 transition text-center"
              >
                Traveler (Yacine)
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemo("amina.benali@darna.dz")}
                className="py-1.5 px-2 bg-white rounded-xl text-xs font-medium text-neutral-700 hover:bg-neutral-50 border border-tertiary/50 transition text-center"
              >
                Host (Amina)
              </button>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <BrandMailIcon
                  size={18}
                  className="absolute start-3.5 top-1/2 -translate-y-1/2 text-neutral-400"
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.dz"
                  required
                  className="w-full ps-10 pe-4 py-2.5 bg-neutral-50 border border-tertiary/70 rounded-xl text-sm text-primary placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-semibold text-neutral-700">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => toast.info("Password reset instructions sent to your email.")}
                  className="text-xs text-secondary hover:underline"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <BrandLockIcon
                  size={18}
                  className="absolute start-3.5 top-1/2 -translate-y-1/2 text-neutral-400"
                />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="w-full ps-10 pe-10 py-2.5 bg-neutral-50 border border-tertiary/70 rounded-xl text-sm text-primary placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute end-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                >
                  {showPassword ? (
                    <BrandEyeOffIcon size={18} />
                  ) : (
                    <BrandEyeIcon size={18} />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="remember"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded text-primary border-tertiary focus:ring-primary"
              />
              <label htmlFor="remember" className="ms-2 text-xs text-neutral-600">
                Keep me signed in on this device
              </label>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-primary text-white rounded-xl font-semibold text-sm hover:bg-primary/95 transition shadow-sm disabled:opacity-50 mt-2"
            >
              {isLoading ? "Signing in..." : "Sign in to DARNA"}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6 text-center">
            <hr className="border-tertiary/60" />
            <span className="absolute left-1/2 -translate-x-1/2 -top-2.5 bg-white px-3 text-xs text-neutral-400">
              or continue with
            </span>
          </div>

          {/* Social Logins */}
          <div className="grid grid-cols-3 gap-2.5">
            <button
              type="button"
              onClick={() => toast.info("Google sign-in simulated.")}
              className="flex items-center justify-center py-2.5 px-3 border border-tertiary/70 rounded-xl hover:bg-neutral-50 transition"
              title="Sign in with Google"
            >
              <BrandGoogleIcon size={20} />
            </button>
            <button
              type="button"
              onClick={() => toast.info("Apple sign-in simulated.")}
              className="flex items-center justify-center py-2.5 px-3 border border-tertiary/70 rounded-xl hover:bg-neutral-50 transition"
              title="Sign in with Apple"
            >
              <BrandAppleIcon size={20} className="text-black" />
            </button>
            <button
              type="button"
              onClick={() => toast.info("Algerian Mobile OTP sign-in simulated.")}
              className="flex items-center justify-center py-2.5 px-3 border border-tertiary/70 rounded-xl hover:bg-neutral-50 transition text-neutral-700"
              title="Sign in with Phone / OTP"
            >
              <BrandPhoneIcon size={20} className="text-secondary" />
            </button>
          </div>

          {/* Sign up prompt */}
          <div className="text-center text-xs text-neutral-600 mt-8 pt-4 border-t border-tertiary/40">
            Don&apos;t have an account yet?{" "}
            <button
              type="button"
              onClick={registerModal.onOpen}
              className="text-primary font-semibold hover:underline"
            >
              Create account
            </button>
          </div>
        </div>
      </Container>
    </div>
  );
}
