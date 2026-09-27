"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "@/navigation";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import axios from "axios";
import { toast } from "react-toastify";
import { FcGoogle } from "react-icons/fc";
import { AiFillGithub } from "react-icons/ai";
import { MdArrowBack, MdClose } from "react-icons/md";
import { useTranslations } from "next-intl";
import Image from "next/image";
import Logo from "@/components/navbar/Logo";

const POSTCARDS = [
  { city: "PARIS", color: "from-amber-200 to-rose-300", accent: "#E53E3E", desc: "Classic Haussmann & Seine" },
  { city: "CIUDAD DE MÉXICO", color: "from-orange-400 to-amber-500", accent: "#DD6B20", desc: "Coyoacán & Historic plazas" },
  { city: "PERTH", color: "from-teal-300 to-blue-500", accent: "#319795", desc: "Cottesloe beach & riverfront" },
  { city: "TORONTO", color: "from-sky-300 to-indigo-400", accent: "#3182CE", desc: "Skyline & Lake Ontario" },
  { city: "MEDELLÍN", color: "from-emerald-400 to-teal-600", accent: "#38A169", desc: "City of eternal spring" },
  { city: "MIAMI", color: "from-pink-400 to-rose-500", accent: "#D53F8C", desc: "Art deco & Ocean drive" },
  { city: "BUDAPEST", color: "from-yellow-300 to-amber-500", accent: "#D69E2E", desc: "Thermal baths & Danube" },
  { city: "MONTRÉAL", color: "from-red-300 to-rose-400", accent: "#E53E3E", desc: "Old port & cobblestone" },
  { city: "EDINBURGH", color: "from-indigo-300 to-purple-500", accent: "#805AD5", desc: "Historic royal mile" },
  { city: "SAN DIEGO", color: "from-orange-300 to-pink-500", accent: "#ED8936", desc: "Pacific sunset & surf" },
  { city: "KYOTO", color: "from-green-300 to-emerald-500", accent: "#38A169", desc: "Bamboo groves & shrines" },
  { city: "ROME", color: "from-amber-400 to-yellow-600", accent: "#B7791F", desc: "Ancient wonders & piazzas" },
];

import { SafeUser } from "@/types";
import { signOut } from "next-auth/react";

interface LoginClientProps {
  currentUser?: SafeUser | null;
}

export default function LoginClient({ currentUser }: LoginClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const paramMode = searchParams?.get("mode");
  const t = useTranslations("modals.login");
  const tRegister = useTranslations("modals.register");
  const tCommon = useTranslations("common");

  const [mode, setMode] = useState<"login" | "register">(
    paramMode === "register" ? "register" : "login"
  );
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (paramMode === "register" || paramMode === "login") {
      setMode(paramMode);
    }
  }, [paramMode]);

  // Form states
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [optOutPromo, setOptOutPromo] = useState(false);

  const handleQuickLogin = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword("password123");
    setIsLoading(true);
    signIn("credentials", {
      email: demoEmail,
      password: "password123",
      redirect: false,
    }).then((res) => {
      setIsLoading(false);
      if (res?.ok) {
        toast.success(t("success"));
        router.push("/");
        router.refresh();
      } else {
        toast.error(tCommon("error"));
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (mode === "register") {
      const fullName = `${firstName} ${lastName}`.trim();
      axios
        .post("/api/register", {
          name: fullName || "DARNA Guest",
          email,
          password,
        })
        .then(() => {
          toast.success(tRegister("success"));
          // Automatically log in after register
          signIn("credentials", {
            email,
            password,
            redirect: false,
          }).then((res) => {
            setIsLoading(false);
            if (res?.ok) {
              router.push("/");
              router.refresh();
            }
          });
        })
        .catch(() => {
          setIsLoading(false);
          toast.error(tCommon("error"));
        });
    } else {
      signIn("credentials", {
        email,
        password,
        redirect: false,
      }).then((res) => {
        setIsLoading(false);
        if (res?.ok) {
          toast.success(t("success"));
          router.push("/");
          router.refresh();
        } else {
          toast.error(tCommon("error"));
        }
      });
    }
  };

  return (
    <div className="min-h-screen relative w-full flex items-center justify-center overflow-x-hidden bg-background pt-0 sm:pt-24 pb-0 sm:pb-16">
      {/* --- DESKTOP BACKGROUND: Travel Postcards Grid (from Image 2) --- */}
      <div className="hidden sm:grid absolute inset-0 grid-cols-4 md:grid-cols-6 gap-3.5 p-4 pointer-events-none select-none opacity-90 scale-105">
        {POSTCARDS.map((card, i) => (
          <div
            key={i}
            className={`relative aspect-[3/4] rounded-3xl p-5 flex flex-col justify-between overflow-hidden shadow-lg bg-gradient-to-br ${card.color} text-neutral-900 border border-white/40`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-black tracking-widest uppercase opacity-75">
                DARNA
              </span>
              <div className="w-6 h-6 rounded-full bg-white/40 backdrop-blur-xs flex items-center justify-center text-[10px] font-bold">
                ★
              </div>
            </div>
            <div>
              <h3 className="text-xl sm:text-2xl font-black uppercase tracking-tight leading-none drop-shadow-xs">
                {card.city}
              </h3>
              <p className="text-[11px] font-medium text-neutral-800/80 mt-1">
                {card.desc}
              </p>
            </div>
            <div className="absolute bottom-3 end-3 opacity-30 w-6 h-6 relative">
              <Image
                src="/assets/logo.png"
                alt="DARNA"
                fill
                className="object-contain"
              />
            </div>
          </div>
        ))}
      </div>

      {/* Dark frosted overlay on desktop to let the center card pop */}
      <div className="hidden sm:block absolute inset-0 bg-neutral-900/35 backdrop-blur-[2px] z-0" />

      {/* --- THE CARD: FULL SCREEN ON MOBILE, CENTERED CARD ON DESKTOP --- */}
      <div className="relative z-10 w-full min-h-screen sm:min-h-0 sm:max-w-[480px] bg-white sm:rounded-3xl sm:shadow-2xl flex flex-col justify-between p-6 sm:p-8 my-0 sm:my-8 border-0 sm:border sm:border-neutral-200">
        <div>
          {/* Top Bar with Back Arrow */}
          <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-neutral-100">
            <button
              type="button"
              aria-label="Back"
              onClick={() => router.back()}
              className="w-10 h-10 -ms-2 flex items-center justify-center rounded-full hover:bg-neutral-100 transition cursor-pointer text-neutral-800 touch-manipulation"
            >
              <MdArrowBack size={22} className="rtl:rotate-180" />
            </button>
            <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
              {mode === "register" ? "Create Account" : "Log In"}
            </span>
            <button
              type="button"
              aria-label="Home"
              onClick={() => router.push("/")}
              className="w-10 h-10 -me-2 flex items-center justify-center rounded-full hover:bg-neutral-100 transition cursor-pointer text-neutral-800 touch-manipulation"
            >
              <MdClose size={20} />
            </button>
          </div>

          {/* Current User Session Banner (if already logged in) */}
          {currentUser && (
            <div className="mt-4 p-3 bg-neutral-100 border border-neutral-200 rounded-xl flex items-center justify-between text-xs text-neutral-700">
              <span className="truncate max-w-[180px] sm:max-w-[240px]">
                Signed in as <strong>{currentUser.name || currentUser.email}</strong>
              </span>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => router.push("/")}
                  className="font-bold underline text-neutral-900 hover:text-black cursor-pointer"
                >
                  Home
                </button>
                <span>•</span>
                <button
                  type="button"
                  onClick={() => signOut()}
                  className="font-bold underline text-neutral-900 hover:text-black cursor-pointer"
                >
                  Sign out
                </button>
              </div>
            </div>
          )}

          {/* Brand Logo & Heading Section (Matching Image 2) */}
          <div className="pt-2 sm:pt-3 pb-5">
            <div className="flex justify-center mb-3">
              <Logo variant="vertical" width={110} height={80} interactive={false} />
            </div>
            <h1 className="text-2xl sm:text-[26px] font-bold text-primary tracking-tight leading-snug text-center">
              {mode === "register" ? "Let&apos;s create your account" : "Welcome back to DARNA"}
            </h1>
            <p className="text-xs sm:text-sm text-neutral-500 mt-1.5 leading-relaxed text-center">
              {mode === "register"
                ? "This information is required to book or host."
                : "Enter your email and password to access your bookings and wishlist."}
            </p>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex bg-neutral-100 p-1 rounded-xl mb-4">
            <button
              type="button"
              onClick={() => setMode("login")}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                mode === "login"
                  ? "bg-white text-primary shadow-xs"
                  : "text-neutral-500 hover:text-primary"
              }`}
            >
              Log in
            </button>
            <button
              type="button"
              onClick={() => setMode("register")}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                mode === "register"
                  ? "bg-white text-primary shadow-xs"
                  : "text-neutral-500 hover:text-primary"
              }`}
            >
              Sign up
            </button>
          </div>

          {/* Quick Demo Accounts (1-Click Login) */}
          {mode === "login" && (
            <div className="mb-4 p-3 bg-neutral-50 rounded-xl border border-tertiary">
              <span className="text-[11px] font-semibold text-neutral-500 block mb-1.5">
                Quick Demo Accounts (1-Click Login):
              </span>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => handleQuickLogin("alex.morgan@darna.com")}
                  className="px-2.5 py-1 text-xs bg-white border border-tertiary hover:border-primary rounded-full font-medium transition cursor-pointer text-neutral-800"
                >
                  👑 Alex (Admin)
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickLogin("sophia.laurent@paris-villas.fr")}
                  className="px-2.5 py-1 text-xs bg-white border border-tertiary hover:border-primary rounded-full font-medium transition cursor-pointer text-neutral-800"
                >
                  🏡 Sophia (Host)
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickLogin("guest@darna.com")}
                  className="px-2.5 py-1 text-xs bg-white border border-tertiary hover:border-primary rounded-full font-medium transition cursor-pointer text-neutral-800"
                >
                  👤 Guest
                </button>
              </div>
            </div>
          )}

          {/* --- FORM FIELDS (Matching Image 2 inputs) --- */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "register" && (
              <>
                {/* Legal Name Segmented Box (Image 2) */}
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Legal name
                  </label>
                  <div className="border border-neutral-300 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-neutral-900 focus-within:border-transparent">
                    <input
                      type="text"
                      required
                      placeholder="First name"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm text-neutral-900 outline-none border-b border-neutral-200 bg-white placeholder-neutral-400"
                    />
                    <input
                      type="text"
                      required
                      placeholder="Last name"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm text-neutral-900 outline-none bg-white placeholder-neutral-400"
                    />
                  </div>
                  <p className="text-[11px] text-neutral-400 mt-1">
                    Make sure it matches the name on your government ID. If you go by another name, you can{" "}
                    <span className="underline cursor-pointer text-neutral-600">add a preferred first name</span>.
                  </p>
                </div>

                {/* Date of Birth Box (Image 2) */}
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Date of birth
                  </label>
                  <input
                    type="date"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    placeholder="Select a date"
                    className="w-full px-3.5 py-2.5 text-sm text-neutral-900 border border-neutral-300 rounded-xl outline-none focus:ring-2 focus:ring-neutral-900 bg-white"
                  />
                </div>
              </>
            )}

            {/* Email Field */}
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Email
              </label>
              <input
                type="email"
                required
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm text-neutral-900 border border-neutral-300 rounded-xl outline-none focus:ring-2 focus:ring-neutral-900 bg-white placeholder-neutral-400"
              />
              {mode === "register" && (
                <div className="space-y-0.5 mt-1">
                  <p className="text-[11px] text-neutral-400">
                    We&apos;ll email you trip confirmations and receipts.
                  </p>
                  <p className="text-[10px] text-neutral-400">
                    All pre-filled information came from Google.
                  </p>
                </div>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Password
              </label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm text-neutral-900 border border-neutral-300 rounded-xl outline-none focus:ring-2 focus:ring-neutral-900 bg-white placeholder-neutral-400"
              />
            </div>

            {/* Register Promotion Checkbox (Image 2) */}
            {mode === "register" && (
              <div className="bg-neutral-50 p-3.5 rounded-xl border border-neutral-200/80 space-y-2">
                <p className="text-[10.5px] text-neutral-500 leading-snug">
                  DARNA will send you promotions such as deals and marketing notifications. You can opt out anytime via account settings or within marketing emails.
                </p>
                <div className="flex items-center justify-between pt-1 border-t border-neutral-200/60">
                  <label htmlFor="promo" className="text-[11px] text-neutral-700 font-medium cursor-pointer select-none">
                    I don&apos;t want to receive DARNA promotions.
                  </label>
                  <input
                    type="checkbox"
                    id="promo"
                    checked={optOutPromo}
                    onChange={(e) => setOptOutPromo(e.target.checked)}
                    className="w-4 h-4 rounded text-primary accent-accent cursor-pointer"
                  />
                </div>
              </div>
            )}

            {/* Legal Disclaimer (Image 2) */}
            <p className="text-[11px] text-neutral-500 leading-relaxed pt-1">
              By selecting <strong>{mode === "register" ? "Agree and continue" : "Continue"}</strong>, I agree to DARNA&apos;s{" "}
              <span className="underline cursor-pointer font-semibold text-primary">
                Terms of Service
              </span>
              ,{" "}
              <span className="underline cursor-pointer font-semibold text-primary">
                Payments Terms of Service
              </span>
              , and{" "}
              <span className="underline cursor-pointer font-semibold text-primary">
                Nondiscrimination Policy
              </span>
              , and acknowledge the{" "}
              <span className="underline cursor-pointer font-semibold text-primary">
                Privacy Policy
              </span>
              .
            </p>

            {/* Big Charcoal CTA Button (Matching Design Tokens) */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full min-h-[48px] py-3.5 px-4 bg-primary hover:bg-primary-800 active:scale-[0.98] text-white font-bold text-sm rounded-xl transition shadow-sm cursor-pointer disabled:opacity-50 touch-manipulation flex items-center justify-center"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : mode === "register" ? (
                "Agree and continue"
              ) : (
                "Continue"
              )}
            </button>
          </form>

          {/* Social Logins Divider */}
          <div className="relative my-5 text-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-neutral-200" />
            </div>
            <span className="relative bg-white px-3 text-xs text-neutral-500 font-medium">
              or continue with
            </span>
          </div>

          {/* Social Sign-in Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => signIn("google")}
              className="flex items-center justify-center gap-2 min-h-[44px] py-2.5 px-3 border border-neutral-300 rounded-xl hover:bg-neutral-50 transition cursor-pointer text-xs font-semibold text-neutral-800 touch-manipulation"
            >
              <FcGoogle size={19} />
              <span>Google</span>
            </button>
            <button
              type="button"
              onClick={() => signIn("github")}
              className="flex items-center justify-center gap-2 min-h-[44px] py-2.5 px-3 border border-neutral-300 rounded-xl hover:bg-neutral-50 transition cursor-pointer text-xs font-semibold text-neutral-800 touch-manipulation"
            >
              <AiFillGithub size={19} />
              <span>GitHub</span>
            </button>
          </div>
        </div>

        {/* Footer switch prompt */}
        <div className="pt-6 pb-2 text-center text-xs text-neutral-500">
          {mode === "register" ? (
            <p>
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => setMode("login")}
                className="font-bold text-neutral-900 underline cursor-pointer hover:text-black"
              >
                Log in
              </button>
            </p>
          ) : (
            <p>
              Don&apos;t have an account?{" "}
              <button
                type="button"
                onClick={() => setMode("register")}
                className="font-bold text-neutral-900 underline cursor-pointer hover:text-black"
              >
                Sign up
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
