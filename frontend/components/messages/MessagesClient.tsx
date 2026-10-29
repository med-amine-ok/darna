"use client";

import React, { useState, useRef, useEffect, useId } from "react";
import Image from "next/image";
import { useFormatter, useTranslations } from "next-intl";
import { Link, usePathname } from "@/navigation";
import { Conversation, Message, User } from "@/types";
import Avatar from "@/components/Avatar";
import {
  getConversationMessagesAction,
  markConversationReadAction,
  sendMessageAction,
} from "@/app/actions/messages";
import { toast } from "react-toastify";
import {
  WelcomeArchIcon,
  BrandSearchIcon,
  BrandSettingsIcon,
  BrandMessageIcon,
  BrandMoreIcon,
  BrandPaperclipIcon,
  BrandSendIcon,
  BrandCheckIcon,
  BrandCheckDoubleIcon,
  BrandChevronLeftIcon,
} from "@/components/icons";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2";

interface MessagesClientProps {
  initialConversations: Conversation[];
  initialMessages?: Message[];
  selectedConversationId?: string;
  currentUser?: User | null;
}

export default function MessagesClient({
  initialConversations,
  initialMessages = [],
  selectedConversationId,
  currentUser,
}: MessagesClientProps) {
  const t = useTranslations("messages");
  const format = useFormatter();
  const pathname = usePathname();
  const isHostMode = pathname?.includes("/host");
  const currentUserId = currentUser?.id || "";
  const baseId = useId();
  const searchId = `${baseId}-search`;
  const composerId = `${baseId}-composer`;

  const [conversations, setConversations] = useState<Conversation[]>(initialConversations);
  const [activeId, setActiveId] = useState<string | null>(
    selectedConversationId || (initialConversations.length > 0 ? initialConversations[0].id : null)
  );
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [newMessageText, setNewMessageText] = useState("");
  const [isSending, setIsSending] = useState(false);

  // Filters & Search
  const [filterType, setFilterType] = useState<"all" | "unread">("all");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Mobile navigation state
  const [mobileShowThread, setMobileShowThread] = useState(Boolean(selectedConversationId));

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeConversation = conversations.find((c) => c.id === activeId);
  const otherName = (conv?: Conversation) => conv?.otherUser?.name || t("defaultHostName");

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, activeId]);

  // Sync mobile-thread-open class on body to hide website header on mobile phones inside threads
  useEffect(() => {
    if (typeof document !== "undefined") {
      if (mobileShowThread) {
        document.body.classList.add("mobile-thread-open");
      } else {
        document.body.classList.remove("mobile-thread-open");
      }
    }
    return () => {
      if (typeof document !== "undefined") {
        document.body.classList.remove("mobile-thread-open");
      }
    };
  }, [mobileShowThread]);

  // Handle select conversation
  const handleSelectConversation = (conv: Conversation) => {
    setActiveId(conv.id);
    setMobileShowThread(true);

    if (conv.id !== activeId) {
      setMessages([]);
      getConversationMessagesAction(conv.id)
        .then((result) => {
          if (result.ok) setMessages(result.data);
          else toast.error(t("loadFailed"));
        })
        .catch(() => toast.error(t("loadFailed")));
    }
    markConversationReadAction(conv.id).catch(() => {});

    // Clear unread count locally
    setConversations((prev) =>
      prev.map((c) =>
        c.id === conv.id && c.unreadCount ? { ...c, unreadCount: { ...c.unreadCount, [currentUserId]: 0 } } : c
      )
    );
  };

  // Filter conversations
  const filteredConversations = conversations.filter((c) => {
    if (filterType === "unread") {
      const unread = c.unreadCount?.[currentUserId] || 0;
      if (unread === 0) return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLocaleLowerCase();
      const name = c.otherUser?.name?.toLocaleLowerCase() || "";
      const lastMsg = c.lastMessage?.toLocaleLowerCase() || "";
      const listingTitle = c.listing?.title?.toLocaleLowerCase() || "";
      if (!name.includes(q) && !lastMsg.includes(q) && !listingTitle.includes(q)) {
        return false;
      }
    }
    return true;
  });

  const handleSendMessage = async (e?: React.FormEvent, customText?: string) => {
    if (e) e.preventDefault();
    const textToSend = customText || newMessageText;
    if (!textToSend.trim() || !activeId) return;

    setIsSending(true);
    const sentText = textToSend.trim();
    if (!customText) setNewMessageText("");

    // Optimistic message
    const tempMsg: Message = {
      id: `tmp_${globalThis.crypto.randomUUID()}`,
      conversationId: activeId,
      senderId: currentUserId,
      receiverId: activeConversation?.otherUser?.id || "usr_host",
      text: sentText,
      createdAt: new Date().toISOString(),
      read: false,
    };

    setMessages((prev) => [...prev, tempMsg]);

    // Update conversation last message preview
    setConversations((prev) =>
      prev.map((c) => (c.id === activeId ? { ...c, lastMessage: sentText, lastMessageAt: tempMsg.createdAt } : c))
    );

    try {
      // Sender and receiver are derived from the session on the server.
      const result = await sendMessageAction(activeId, sentText);
      if (!result.ok) {
        setMessages((prev) => prev.filter((m) => m.id !== tempMsg.id));
        toast.error(t("sendFailed"));
        return;
      }
      setMessages((prev) => prev.map((m) => (m.id === tempMsg.id ? result.data : m)));
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== tempMsg.id));
      toast.error(t("sendFailed"));
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatListDate = (value?: string) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return format.dateTime(date, { month: "short", day: "numeric" });
  };

  const formatMessageTime = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return format.dateTime(date, { hour: "2-digit", minute: "2-digit" });
  };

  const currentMessages = messages.filter((m) => m.conversationId === activeId);
  const openers = [t("openerStay"), t("openerCheckIn"), t("openerDirections")];

  return (
    <div className="w-full h-full flex-1 flex flex-col md:flex-row overflow-hidden bg-white">
      {/* START COLUMN: Conversation List */}
      <div
        className={`w-full md:w-[360px] lg:w-[400px] shrink-0 border-e border-tertiary/60 flex flex-col h-full overflow-hidden bg-white ${
          mobileShowThread ? "hidden md:flex" : "flex"
        }`}
      >
        {/* Header Row 1: Title + Action Icons */}
        <div className="p-4 sm:p-5 border-b border-tertiary/40 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Link
                href={isHostMode ? "/host" : "/"}
                className={`md:hidden p-1.5 -ms-1 rounded-full hover:bg-neutral-100 text-neutral-600 transition btn-press ${focusRing}`}
                aria-label={isHostMode ? t("backToHost") : t("backToHome")}
              >
                <BrandChevronLeftIcon size={22} className="rtl:rotate-180" aria-hidden="true" />
              </Link>
              <h1 className="text-xl sm:text-2xl font-bold text-primary font-serif">{t("title")}</h1>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setSearchOpen(!searchOpen)}
                aria-expanded={searchOpen}
                aria-controls={searchOpen ? searchId : undefined}
                aria-label={t("searchToggle")}
                title={t("searchToggle")}
                className={`p-2 rounded-full transition btn-press ${focusRing} ${
                  searchOpen ? "bg-primary text-white" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                }`}
              >
                <BrandSearchIcon size={16} aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => toast.info(t("settingsComingSoon"))}
                aria-label={t("settings")}
                title={t("settings")}
                className={`p-2 rounded-full bg-neutral-100 text-neutral-600 hover:bg-neutral-200 transition btn-press ${focusRing}`}
              >
                <BrandSettingsIcon size={16} aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* Search Bar (Toggled) */}
          {searchOpen && (
            <div className="mt-3 relative animate-in fade-in" role="search">
              <label htmlFor={searchId} className="sr-only">
                {t("searchPlaceholder")}
              </label>
              <input
                id={searchId}
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") setSearchOpen(false);
                }}
                placeholder={t("searchConversationsPlaceholder")}
                className="w-full ps-9 pe-3 py-2 bg-neutral-50 border border-tertiary/70 rounded-xl text-xs text-primary placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-accent-600 focus:border-accent"
                autoFocus
              />
              <BrandSearchIcon
                size={14}
                aria-hidden="true"
                className="absolute start-3 top-1/2 -translate-y-1/2 text-neutral-400"
              />
            </div>
          )}

          {/* Header Row 2: Filter pills */}
          <div className="flex items-center gap-2 mt-4" role="group" aria-label={t("filterLabel")}>
            <button
              type="button"
              aria-pressed={filterType === "all"}
              onClick={() => setFilterType("all")}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition ${focusRing} ${
                filterType === "all"
                  ? "bg-primary text-white shadow-xs"
                  : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
              }`}
            >
              {t("filterAll")}
            </button>
            <button
              type="button"
              aria-pressed={filterType === "unread"}
              onClick={() => setFilterType(filterType === "unread" ? "all" : "unread")}
              className={`px-3 py-1 rounded-full text-xs font-semibold border transition ${focusRing} ${
                filterType === "unread"
                  ? "bg-primary text-white border-primary shadow-xs"
                  : "border-tertiary/80 text-neutral-600 hover:bg-neutral-50"
              }`}
            >
              {t("filterUnread")}
            </button>
          </div>
        </div>

        {/* Conversation List Scrollable */}
        <div className="flex-1 overflow-y-auto">
          {filteredConversations.length === 0 ? (
            <div className="p-8 text-center my-auto">
              {filterType === "unread" || searchQuery ? (
                /* (1) Filtered Empty State */
                <div className="space-y-3" role="status">
                  <div className="w-12 h-12 bg-neutral-100 text-neutral-500 rounded-full flex items-center justify-center mx-auto">
                    <BrandMessageIcon size={24} aria-hidden="true" />
                  </div>
                  <h2 className="text-sm font-bold text-primary">{t("filteredTitle")}</h2>
                  <p className="text-xs text-neutral-500 max-w-xs mx-auto">{t("filteredSubtitle")}</p>
                  <button
                    type="button"
                    onClick={() => {
                      setFilterType("all");
                      setSearchQuery("");
                      setSearchOpen(false);
                    }}
                    className={`px-4 py-1.5 border border-tertiary rounded-xl text-xs font-semibold text-neutral-700 hover:bg-neutral-50 transition ${focusRing}`}
                  >
                    {t("clearAllFilters")}
                  </button>
                </div>
              ) : (
                /* (2) True Empty State */
                <div className="space-y-3">
                  <div className="w-12 h-12 bg-tertiary/30 text-primary rounded-full flex items-center justify-center mx-auto">
                    <BrandMessageIcon size={22} aria-hidden="true" />
                  </div>
                  <h2 className="text-sm font-bold text-primary">{t("trueEmptyTitle")}</h2>
                  <p className="text-xs text-neutral-500 max-w-xs mx-auto">{t("trueEmptySubtitle")}</p>
                  <Link
                    href="/search"
                    className={`inline-block px-4 py-1.5 bg-primary text-white rounded-xl text-xs font-semibold hover:bg-primary/95 transition btn-press ${focusRing}`}
                  >
                    {t("exploreHomes")}
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <ul aria-label={t("conversationsLabel")} className="divide-y divide-tertiary/30">
              {filteredConversations.map((conv) => {
                const isSelected = conv.id === activeId;
                const unread = conv.unreadCount?.[currentUserId] || 0;
                const listing = conv.listing;

                return (
                  <li key={conv.id}>
                    <button
                      type="button"
                      data-testid="conversation-item"
                      onClick={() => handleSelectConversation(conv)}
                      aria-current={isSelected ? "true" : undefined}
                      className={`w-full text-start p-4 transition flex items-start gap-3.5 ${focusRing} focus-visible:ring-inset focus-visible:ring-offset-0 ${
                        isSelected ? "bg-tertiary/25 border-s-4 border-primary" : "hover:bg-neutral-50"
                      }`}
                    >
                      {/* Avatar */}
                      <span className="relative shrink-0">
                        <Avatar src={conv.otherUser?.image} size={44} />
                        <span
                          aria-hidden="true"
                          className="absolute bottom-0 end-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full"
                        />
                      </span>

                      {/* Text details */}
                      <span className="flex-1 min-w-0">
                        <span className="flex items-center justify-between gap-1">
                          <span
                            className={`text-xs sm:text-sm truncate ${
                              unread > 0 ? "font-bold text-primary" : "font-semibold text-neutral-800"
                            }`}
                          >
                            {otherName(conv)}
                          </span>
                          {conv.lastMessageAt && (
                            <time dateTime={conv.lastMessageAt} className="text-[10px] text-neutral-500 shrink-0">
                              {formatListDate(conv.lastMessageAt)}
                            </time>
                          )}
                        </span>

                        <span
                          className={`block text-xs truncate mt-0.5 ${
                            unread > 0 ? "font-semibold text-primary" : "text-neutral-500"
                          }`}
                        >
                          {conv.lastMessage || t("startedConversation")}
                        </span>

                        {/* Listing thumbnail chip */}
                        {listing && (
                          <span className="flex items-center gap-1.5 mt-2 px-2 py-1 bg-white/80 rounded-lg border border-tertiary/40 w-fit max-w-full">
                            <span className="relative w-4 h-4 rounded overflow-hidden shrink-0">
                              <Image
                                src={listing.imageSrc?.[0] || "/assets/placeholder.jpg"}
                                alt=""
                                fill
                                sizes="16px"
                                className="object-cover"
                              />
                            </span>
                            <span className="text-[10px] text-neutral-600 truncate font-medium">{listing.title}</span>
                          </span>
                        )}
                      </span>

                      {/* Unread badge */}
                      {unread > 0 && (
                        <span className="w-2.5 h-2.5 rounded-full bg-accent shrink-0 mt-1.5">
                          <span className="sr-only">{t("unreadCount", { count: unread })}</span>
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* END COLUMN: Thread Canvas */}
      <div
        className={`flex-1 flex flex-col h-full overflow-hidden bg-[#FAF9F5] ${
          !mobileShowThread ? "hidden md:flex" : "flex"
        }`}
      >
        {!activeConversation ? (
          /* Blank canvas when nothing is selected */
          <div className="flex-1 flex items-center justify-center p-8 bg-white text-center">
            <div className="max-w-xs space-y-2">
              <BrandMessageIcon size={44} className="mx-auto text-tertiary" aria-hidden="true" />
              <h2 className="text-sm font-semibold text-neutral-600">{t("selectConversation")}</h2>
              <p className="text-xs text-neutral-500">{t("selectConversationHint")}</p>
            </div>
          </div>
        ) : (
          <>
            {/* Sticky Thread Header */}
            <div className="p-3.5 sm:px-6 bg-white border-b border-tertiary/60 flex items-center justify-between shrink-0 shadow-2xs">
              <div className="flex items-center gap-3">
                {/* Mobile Back Button with 44px min touch target */}
                <button
                  type="button"
                  onClick={() => setMobileShowThread(false)}
                  className={`md:hidden min-w-[44px] min-h-[44px] -ms-2 flex items-center justify-center text-neutral-700 hover:bg-neutral-100 rounded-full transition btn-press ${focusRing}`}
                  aria-label={t("back")}
                >
                  <BrandChevronLeftIcon size={22} className="rtl:rotate-180" aria-hidden="true" />
                </button>

                <Avatar src={activeConversation.otherUser?.image} size={40} />
                <div>
                  <div className="flex items-center gap-1.5">
                    <h2 className="font-bold text-sm sm:text-base text-primary">{otherName(activeConversation)}</h2>
                    <span className="text-[10px] px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full font-semibold">
                      {t("verified")}
                    </span>
                  </div>
                  {activeConversation.listing && (
                    <Link
                      href={`/listings/${activeConversation.listing.id}`}
                      className={`text-xs text-neutral-500 hover:text-accent-700 hover:underline line-clamp-1 rounded ${focusRing}`}
                    >
                      {activeConversation.listing.title}
                    </Link>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 text-xs">
                {activeConversation.listing && (
                  <Link
                    href={`/listings/${activeConversation.listing.id}`}
                    className={`hidden sm:inline-block px-3.5 py-1.5 bg-tertiary/25 hover:bg-tertiary/45 text-primary font-semibold rounded-xl transition btn-press ${focusRing}`}
                  >
                    {t("viewListing")}
                  </Link>
                )}
                <button
                  type="button"
                  onClick={() => toast.info(t("optionsComingSoon"))}
                  className={`p-2 text-neutral-500 hover:bg-neutral-100 rounded-xl transition btn-press ${focusRing}`}
                  aria-label={t("conversationOptions")}
                  title={t("conversationOptions")}
                >
                  <BrandMoreIcon size={20} aria-hidden="true" />
                </button>
              </div>
            </div>

            {/* Scrollable Messages Stream */}
            <div
              className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4"
              role="log"
              aria-live="polite"
              aria-label={t("threadLabel", { name: otherName(activeConversation) })}
            >
              {/* Empty Thread Prompt with Quick Opener Chips */}
              {currentMessages.length === 0 ? (
                <div className="p-8 text-center max-w-md mx-auto my-auto space-y-4 bg-white rounded-3xl border border-tertiary/60 shadow-xs">
                  <div className="w-12 h-12 mx-auto rounded-2xl bg-tertiary/20 flex items-center justify-center">
                    <WelcomeArchIcon size={28} className="text-primary" aria-hidden="true" />
                  </div>
                  <h3 className="font-bold text-primary text-base">
                    {t("emptyThreadTitle", { name: otherName(activeConversation) })}
                  </h3>
                  <p className="text-xs text-neutral-500">{t("emptyThreadHint")}</p>
                  <div className="flex flex-col gap-2 pt-2">
                    {openers.map((opener) => (
                      <button
                        key={opener}
                        type="button"
                        onClick={() => handleSendMessage(undefined, opener)}
                        className={`px-3.5 py-2 bg-neutral-50 hover:bg-tertiary/30 border border-tertiary/50 rounded-xl text-xs text-primary font-medium transition text-start ${focusRing}`}
                      >
                        {t("quotedOpener", { text: opener })}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                currentMessages.map((msg) => {
                  const isSentByMe = msg.senderId === currentUserId;

                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isSentByMe ? "items-end text-end" : "items-start text-start"}`}
                    >
                      <div
                        dir="auto"
                        className={`max-w-[80%] sm:max-w-[70%] p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-xs text-start ${
                          isSentByMe
                            ? "bg-primary text-white rounded-ee-xs"
                            : "bg-white text-neutral-800 border border-tertiary/70 rounded-es-xs"
                        }`}
                      >
                        <span className="sr-only">
                          {isSentByMe ? t("youSaid") : t("theySaid", { name: otherName(activeConversation) })}
                        </span>
                        {msg.text}
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-neutral-500 mt-1 px-1">
                        <time dateTime={msg.createdAt}>{formatMessageTime(msg.createdAt)}</time>
                        {isSentByMe &&
                          (msg.read ? (
                            <>
                              <BrandCheckDoubleIcon size={13} className="text-emerald-600" aria-hidden="true" />
                              <span className="sr-only">{t("readStatus")}</span>
                            </>
                          ) : (
                            <>
                              <BrandCheckIcon size={13} className="text-neutral-500" aria-hidden="true" />
                              <span className="sr-only">{t("sentStatus")}</span>
                            </>
                          ))}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Sticky Composer */}
            <div className="p-3 sm:p-4 bg-white border-t border-tertiary/60 shrink-0 shadow-[0_-2px_10px_rgba(46,58,47,0.03)] pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              <form
                onSubmit={handleSendMessage}
                className="flex items-end gap-2 bg-neutral-50/80 border border-tertiary/80 rounded-2xl p-2 shadow-2xs focus-within:ring-2 focus-within:ring-accent-600 focus-within:border-accent focus-within:bg-white transition-all duration-150"
              >
                <button
                  type="button"
                  onClick={() => toast.info(t("attachSimulated"))}
                  className={`p-2 min-w-[36px] min-h-[36px] flex items-center justify-center text-neutral-500 hover:text-primary hover:bg-neutral-100 rounded-xl transition shrink-0 btn-press ${focusRing}`}
                  title={t("attach")}
                  aria-label={t("attach")}
                >
                  <BrandPaperclipIcon size={18} aria-hidden="true" />
                </button>

                <label htmlFor={composerId} className="sr-only">
                  {t("messageLabel", { name: otherName(activeConversation) })}
                </label>
                <textarea
                  id={composerId}
                  dir="auto"
                  value={newMessageText}
                  onChange={(e) => setNewMessageText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  rows={1}
                  placeholder={t("typeMessage")}
                  className="flex-1 bg-transparent py-2 px-2 text-xs sm:text-sm text-primary placeholder-neutral-500 focus:outline-none resize-none max-h-32 leading-relaxed"
                />

                <button
                  type="submit"
                  disabled={!newMessageText.trim() || isSending}
                  className={`p-2.5 min-w-[40px] min-h-[40px] flex items-center justify-center bg-accent-600 text-white rounded-xl hover:bg-accent-700 transition shrink-0 disabled:opacity-40 disabled:hover:bg-accent-600 btn-press shadow-xs ${focusRing}`}
                  title={t("send")}
                  aria-label={t("send")}
                >
                  <BrandSendIcon size={16} className="rtl:-scale-x-100" aria-hidden="true" />
                </button>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
