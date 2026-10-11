"use client";

import React, { useState } from "react";
import { toast } from "react-toastify";
import {
  HiOutlineSearch,
  HiOutlineCalendar,
  HiOutlineUserCircle,
  HiOutlineCreditCard,
  HiOutlineShieldCheck,
  HiOutlineHome,
  HiOutlineChevronDown,
  HiOutlineThumbUp,
  HiOutlineThumbDown,
  HiOutlineMail,
  HiOutlinePhone,
} from "react-icons/hi";

export default function HelpClient() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [expandedArticleId, setExpandedArticleId] = useState<string | null>("art_01");
  const [feedback, setFeedback] = useState<Record<string, "yes" | "no">>({});

  // Support Form state
  const [supportName, setSupportName] = useState("");
  const [supportEmail, setSupportEmail] = useState("");
  const [supportTopic, setSupportTopic] = useState("booking");
  const [supportMessage, setSupportMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const categories = [
    { id: "all", label: "All Topics", icon: HiOutlineSearch },
    { id: "booking", label: "Booking & reservations", icon: HiOutlineCalendar },
    { id: "account", label: "Account & verification", icon: HiOutlineUserCircle },
    { id: "payments", label: "Payments & refunds", icon: HiOutlineCreditCard },
    { id: "safety", label: "Trust & safety in Algeria", icon: HiOutlineShieldCheck },
    { id: "hosting", label: "Hosting on DARNA", icon: HiOutlineHome },
  ];

  const articles = [
    {
      id: "art_01",
      category: "booking",
      title: "How do I cancel a reservation and receive a refund in Algeria?",
      snippet: "Cancellation policies vary between Flexible, Moderate, and Strict.",
      content:
        "You can cancel your reservation directly from your Trips page. Stays marked with the 'Flexible' policy allow a full refund (excluding minor processing fees) if cancelled up to 48 hours before check-in. Refunds for Algerian CIB and Edahabia cards are processed within 3 to 5 business days back to your issuing bank.",
    },
    {
      id: "art_02",
      category: "payments",
      title: "What Algerian payment methods are supported on DARNA?",
      snippet: "DARNA supports SATIM interbank CIB cards, Algérie Poste Edahabia, and international cards.",
      content:
        "DARNA supports national Algerian payment cards via SATIM interbank gateway: CIB debit cards (all Algerian public and private banks: BNA, BEA, CPA, BDL, BADR, Gulf Bank, Natixis, Société Générale) and Algérie Poste Edahabia cards. For international diaspora travelers, Visa and Mastercard in Euros or USD are also supported.",
    },
    {
      id: "art_03",
      category: "account",
      title: "How does identity verification work for Algerian travelers?",
      snippet: "Verification protects hosts and travelers through Algerian biometric ID.",
      content:
        "To foster safety and mutual trust, hosts may require government ID verification. You can upload a photo of your Algerian Biometric National ID Card (CNIBE) or Algerian Passport. Our automated verification checks security holograms while encrypting your document under strict privacy standards.",
    },
    {
      id: "art_04",
      category: "safety",
      title: "Are desert 4x4 tours and Sahara expeditions guided by certified locals?",
      snippet: "All Sahara expeditions require certified local Tuareg or desert guide partnerships.",
      content:
        "Yes. In destinations like Djanet (Tassili n'Ajjer), Tamanrasset (Hoggar), and Taghit (Grand Erg Occidental), all licensed experiences and rental 4x4s with drivers are operated in accordance with Algerian tourism safety guidelines and national park regulations.",
    },
    {
      id: "art_05",
      category: "hosting",
      title: "How do I list my villa, apartment, or rental car on DARNA?",
      snippet: "Become a host in 10 minutes with instant wilaya location mapping.",
      content:
        "Click 'Become a host' at the top of any page to enter our listing creator. Provide your property type (Home, Vehicle, or Experience), specify your Wilaya and city, upload high-resolution photos, configure nightly pricing in Algerian Dinars (DZD), and publish. Your listing becomes instantly discoverable across Algeria and worldwide.",
    },
    {
      id: "art_06",
      category: "booking",
      title: "Can I book vehicle rentals and airport pickups with DARNA?",
      snippet: "DARNA provides multi-vertical rentals for SUVs, sedans, and desert-ready 4x4s.",
      content:
        "Yes! DARNA features vehicle rentals with verified agencies and individual hosts across Algiers Houari Boumediene Airport, Oran Ahmed Ben Bella Airport, Constantine, and southern gateway hubs. You can choose unlimited mileage, airport delivery, or driver options during checkout.",
    },
  ];

  const filteredArticles = articles.filter((a) => {
    if (activeCategory !== "all" && a.category !== activeCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return a.title.toLowerCase().includes(q) || a.content.toLowerCase().includes(q);
    }
    return true;
  });

  const handleFeedback = (artId: string, val: "yes" | "no") => {
    setFeedback((prev) => ({ ...prev, [artId]: val }));
    toast.success("Thank you for your feedback!");
  };

  const handleSupportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supportName || !supportEmail || !supportMessage) {
      toast.error("Please fill in all required fields.");
      return;
    }
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      toast.success("Support inquiry sent! A DARNA support agent will reply within 2 hours.");
      setSupportMessage("");
    }, 500);
  };

  return (
    <div className="space-y-12">
      {/* Hero Search Section */}
      <div className="bg-primary text-white rounded-3xl p-8 sm:p-14 text-center relative overflow-hidden shadow-lg">
        <div className="max-w-2xl mx-auto space-y-4 relative z-10">
          <span className="text-xs uppercase tracking-widest text-tertiary font-bold">
            DARNA Help Center & Support
          </span>
          <h1 className="text-2xl sm:text-4xl font-bold font-serif">
            How can we help your journey in Algeria?
          </h1>
          <p className="text-xs sm:text-sm text-neutral-300">
            Find answers on bookings, CIB/Edahabia payments, Sahara tour permits, and hosting
          </p>

          {/* Search Box */}
          <div className="relative pt-4 max-w-lg mx-auto">
            <HiOutlineSearch
              size={20}
              className="absolute start-4.5 top-[27px] text-neutral-400"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search help articles (e.g. CIB refund, check-in, Sahara permit)..."
              className="w-full ps-12 pe-4 py-3.5 bg-white text-primary rounded-2xl text-xs sm:text-sm placeholder-neutral-400 focus:outline-none focus:ring-4 focus:ring-accent/30 shadow-md"
            />
          </div>
        </div>

        {/* Decorative Background Elements */}
        <div className="absolute -top-12 -start-12 w-48 h-48 bg-white/5 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-12 -end-12 w-64 h-64 bg-accent/15 rounded-full blur-2xl pointer-events-none" />
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {categories.map((cat) => {
          const Icon = cat.icon;
          const isActive = activeCategory === cat.id;

          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategory(cat.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-semibold whitespace-nowrap transition border ${
                isActive
                  ? "bg-primary text-white border-primary shadow-xs"
                  : "bg-white text-neutral-700 border-tertiary/70 hover:bg-neutral-50"
              }`}
            >
              <Icon size={16} className={isActive ? "text-white" : "text-secondary"} />
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* Articles Accordion */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-primary font-serif">
            Frequently Asked Questions
          </h2>
          <span className="text-xs text-neutral-400">
            {filteredArticles.length} {filteredArticles.length === 1 ? "article" : "articles"}
          </span>
        </div>

        {filteredArticles.length === 0 ? (
          <div className="bg-white rounded-3xl p-10 border border-tertiary text-center text-xs text-neutral-500 shadow-xs">
            No matching help articles found for &ldquo;{searchQuery}&rdquo;. Try another keyword or contact customer support below.
          </div>
        ) : (
          <div className="space-y-3">
            {filteredArticles.map((art) => {
              const isExpanded = expandedArticleId === art.id;

              return (
                <div
                  key={art.id}
                  className="bg-white rounded-2xl border border-tertiary overflow-hidden shadow-xs transition"
                >
                  <button
                    type="button"
                    onClick={() => setExpandedArticleId(isExpanded ? null : art.id)}
                    className="w-full p-5 text-start flex items-center justify-between gap-4 hover:bg-neutral-50 transition"
                  >
                    <div>
                      <h3 className="font-bold text-primary text-sm sm:text-base">
                        {art.title}
                      </h3>
                      {!isExpanded && (
                        <p className="text-xs text-neutral-500 mt-0.5 line-clamp-1">
                          {art.snippet}
                        </p>
                      )}
                    </div>
                    <HiOutlineChevronDown
                      size={20}
                      className={`text-neutral-400 transition-transform shrink-0 ${
                        isExpanded ? "rotate-180 text-primary" : ""
                      }`}
                    />
                  </button>

                  {isExpanded && (
                    <div className="px-5 pb-5 pt-1 border-t border-tertiary/30 space-y-4">
                      <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed">
                        {art.content}
                      </p>

                      {/* "Was this helpful?" Widget */}
                      <div className="flex items-center justify-between pt-3 border-t border-tertiary/30 text-xs text-neutral-500">
                        <span>Was this article helpful?</span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleFeedback(art.id, "yes")}
                            className={`p-1.5 rounded-lg border flex items-center gap-1 transition ${
                              feedback[art.id] === "yes"
                                ? "bg-emerald-50 border-emerald-300 text-emerald-800"
                                : "border-tertiary hover:bg-neutral-50 text-neutral-600"
                            }`}
                          >
                            <HiOutlineThumbUp size={15} />
                            <span>Yes</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleFeedback(art.id, "no")}
                            className={`p-1.5 rounded-lg border flex items-center gap-1 transition ${
                              feedback[art.id] === "no"
                                ? "bg-rose-50 border-rose-300 text-rose-800"
                                : "border-tertiary hover:bg-neutral-50 text-neutral-600"
                            }`}
                          >
                            <HiOutlineThumbDown size={15} />
                            <span>No</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Contact Support Form & Emergency Channels */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-4">
        {/* Contact Form */}
        <div className="lg:col-span-8 bg-white rounded-3xl p-6 sm:p-8 border border-tertiary shadow-sm space-y-4">
          <div>
            <h3 className="text-xl font-bold text-primary font-serif">
              Still need assistance? Contact DARNA Support
            </h3>
            <p className="text-xs text-neutral-500 mt-1">
              Our bilingual Algerian team is available 7 days a week to support your bookings and hosting.
            </p>
          </div>

          <form onSubmit={handleSupportSubmit} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-neutral-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={supportName}
                  onChange={(e) => setSupportName(e.target.value)}
                  placeholder="Your name"
                  required
                  className="w-full px-3.5 py-2.5 bg-neutral-50 border border-tertiary/70 rounded-xl text-primary"
                />
              </div>
              <div>
                <label className="block font-semibold text-neutral-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={supportEmail}
                  onChange={(e) => setSupportEmail(e.target.value)}
                  placeholder="name@example.dz"
                  required
                  className="w-full px-3.5 py-2.5 bg-neutral-50 border border-tertiary/70 rounded-xl text-primary"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-neutral-700 mb-1">
                Inquiry Topic
              </label>
              <select
                value={supportTopic}
                onChange={(e) => setSupportTopic(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-neutral-50 border border-tertiary/70 rounded-xl text-primary"
              >
                <option value="booking">Booking / Reservation Issue</option>
                <option value="payments">CIB / Edahabia Payment Query</option>
                <option value="host">Hosting Support & Verification</option>
                <option value="safety">Trust, Security & Safety</option>
                <option value="other">General Inquiry</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-neutral-700 mb-1">
                Your Message
              </label>
              <textarea
                rows={4}
                value={supportMessage}
                onChange={(e) => setSupportMessage(e.target.value)}
                placeholder="Describe your issue with reservation details..."
                required
                className="w-full px-3.5 py-2.5 bg-neutral-50 border border-tertiary/70 rounded-xl text-primary"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 bg-primary text-white rounded-xl font-semibold hover:bg-primary/95 transition shadow-xs disabled:opacity-50"
            >
              {isSubmitting ? "Sending inquiry..." : "Send Message to Support"}
            </button>
          </form>
        </div>

        {/* Direct Channels Card */}
        <div className="lg:col-span-4 bg-tertiary/20 rounded-3xl p-6 sm:p-8 border border-tertiary/60 space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            <h4 className="font-bold text-primary font-serif text-base">
              Direct Contact Channels
            </h4>
            <div className="space-y-3 text-xs text-neutral-700">
              <div className="flex items-start gap-3 p-3 bg-white rounded-2xl border border-tertiary/60">
                <HiOutlinePhone size={20} className="text-secondary shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-primary">Algerian Hotline</div>
                  <div className="text-neutral-500 mt-0.5">+213 21 00 00 00</div>
                  <div className="text-[10px] text-neutral-400">Available 08:00 – 20:00 (Algiers Time)</div>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-white rounded-2xl border border-tertiary/60">
                <HiOutlineMail size={20} className="text-secondary shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-primary">Email Support</div>
                  <div className="text-neutral-500 mt-0.5">support@darna.dz</div>
                  <div className="text-[10px] text-neutral-400">Average response: &lt; 2 hours</div>
                </div>
              </div>
            </div>
          </div>

          <div className="p-3 bg-white/70 rounded-2xl border border-tertiary/50 text-[11px] text-neutral-500">
            For urgent check-in emergencies, hosts and guests can also communicate instantly via the in-app{" "}
            <span className="font-bold text-primary">Messages</span> tab.
          </div>
        </div>
      </div>
    </div>
  );
}
