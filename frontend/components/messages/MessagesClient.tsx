"use client";

/**
 * Two-pane inbox (guest /messages and host /host/messages).
 * Desktop: a white rounded-3xl surface on paper with the conversation list on the reading
 * start side and the thread on the other. Phones: the list, then a full-screen thread that
 * slides in from the reading end edge (the site header is hidden via body.mobile-thread-open).
 * Messages are grouped by day with separators, consecutive bubbles from one sender are
 * stacked, and a sent message shows a clock while it is sending, then a check (sent) or a
 * double check (read, from `message.read`).
 */

import React, { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { AnimatePresence, m } from "framer-motion";
import { useFormatter, useTranslations } from "next-intl";
import { Link, usePathname } from "@/navigation";
import { Conversation, Message, User } from "@/types";
import {
  getConversationMessagesAction,
  markConversationReadAction,
  sendMessageAction,
} from "@/app/actions/messages";
import { toast } from "react-toastify";
import {
  BrandSearchIcon,
  BrandSettingsIcon,
  BrandMoreIcon,
  BrandPaperclipIcon,
  BrandSendIcon,
  BrandCheckIcon,
  BrandCheckDoubleIcon,
  BrandChevronLeftIcon,
  BrandClockIcon,
  BrandExternalLinkIcon,
} from "@/components/icons";
import {
  Avatar,
  Button,
  IconButton,
  Illustration,
  Input,
  KitEmptyState,
  SegmentedControl,
  Spinner,
  cn,
  focusRingInset,
  useMediaQuery,
  useIsRtl,
} from "@/components/ui";
import { dur, ease, slideIn, spring } from "@/lib/motion";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2";

/** Consecutive messages from the same sender within this window share one bubble stack. */
const RUN_WINDOW_MS = 5 * 60_000;

interface MessagesClientProps {
  initialConversations: Conversation[];
  initialMessages?: Message[];
  selectedConversationId?: string;
  currentUser?: User | null;
}

/** The generic silhouette is not a real photo: show initials on a palette tint instead. */
function photoOf(src?: string | null) {
  return src && !src.endsWith("/avatar.png") ? src : null;
}

function dayKey(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "unknown";
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
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
  const isRtl = useIsRtl();
  /** Single-pane layout below `md` (list, then a full-screen thread). */
  const isPhone = useMediaQuery("(max-width: 767px)");
  const currentUserId = currentUser?.id || "";
  const baseId = useId();
  const searchId = `${baseId}-search`;
  const composerId = `${baseId}-composer`;

  const [conversations, setConversations] = useState<Conversation[]>(initialConversations);
  const [activeId, setActiveId] = useState<string | null>(
    selectedConversationId || (initialConversations.length > 0 ? initialConversations[0].id : null)
  );
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [isLoadingThread, setIsLoadingThread] = useState(false);
  const [newMessageText, setNewMessageText] = useState("");
  const [isSending, setIsSending] = useState(false);

  // Filters & Search
  const [filterType, setFilterType] = useState<"all" | "unread">("all");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Mobile navigation state
  const [mobileShowThread, setMobileShowThread] = useState(Boolean(selectedConversationId));
  /** Pane transitions only run after the user navigates (the server HTML is never hidden). */
  const [hasNavigated, setHasNavigated] = useState(false);

  const scrollerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  /** Optimistic id → stable render key, so a confirmed bubble does not re-mount. */
  const renderKeys = useRef(new Map<string, string>());
  /** Bubbles added in this session (they animate in; history does not). */
  const freshKeys = useRef(new Set<string>());

  const activeConversation = conversations.find((c) => c.id === activeId);
  const otherName = (conv?: Conversation) => conv?.otherUser?.name || t("defaultHostName");

  // Keep the newest message in view.
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: freshKeys.current.size ? "smooth" : "auto" });
  }, [messages, activeId]);

  // Hide the site header on phones while a thread is open (full-screen thread).
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.body.classList.toggle("mobile-thread-open", mobileShowThread);
    return () => document.body.classList.remove("mobile-thread-open");
  }, [mobileShowThread]);

  // Autosize the composer (up to ~6 lines, then it scrolls).
  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 168)}px`;
  }, [newMessageText, activeId]);

  const handleSelectConversation = (conv: Conversation) => {
    setHasNavigated(true);
    setActiveId(conv.id);
    setMobileShowThread(true);

    if (conv.id !== activeId) {
      setMessages([]);
      setIsLoadingThread(true);
      getConversationMessagesAction(conv.id)
        .then((result) => {
          if (result.ok) setMessages(result.data);
          else toast.error(t("loadFailed"));
        })
        .catch(() => toast.error(t("loadFailed")))
        .finally(() => setIsLoadingThread(false));
    }
    markConversationReadAction(conv.id).catch(() => {});

    // Clear unread count locally
    setConversations((prev) =>
      prev.map((c) =>
        c.id === conv.id && c.unreadCount ? { ...c, unreadCount: { ...c.unreadCount, [currentUserId]: 0 } } : c
      )
    );
  };

  const handleBack = () => {
    setHasNavigated(true);
    setMobileShowThread(false);
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

  const totalUnread = conversations.reduce((sum, c) => sum + (c.unreadCount?.[currentUserId] || 0), 0);

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
    freshKeys.current.add(tempMsg.id);

    setMessages((prev) => [...prev, tempMsg]);

    // Update conversation last message preview
    setConversations((prev) =>
      prev.map((c) => (c.id === activeId ? { ...c, lastMessage: sentText, lastMessageAt: tempMsg.createdAt } : c))
    );

    try {
      // Sender and receiver are derived from the session on the server.
      const result = await sendMessageAction(activeId, sentText);
      if (!result.ok) {
        setMessages((prev) => prev.filter((msg) => msg.id !== tempMsg.id));
        toast.error(t("sendFailed"));
        return;
      }
      renderKeys.current.set(result.data.id, tempMsg.id);
      setMessages((prev) => prev.map((msg) => (msg.id === tempMsg.id ? result.data : msg)));
    } catch {
      setMessages((prev) => prev.filter((msg) => msg.id !== tempMsg.id));
      toast.error(t("sendFailed"));
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatListDate = (value?: string | null) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    if (dayKey(value) === dayKey(new Date().toISOString())) {
      return format.dateTime(date, { hour: "2-digit", minute: "2-digit" });
    }
    return format.dateTime(date, { month: "short", day: "numeric" });
  };

  const formatMessageTime = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return format.dateTime(date, { hour: "2-digit", minute: "2-digit" });
  };

  const formatDayLabel = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (dayKey(value) === dayKey(now.toISOString())) return t("today");
    if (dayKey(value) === dayKey(yesterday.toISOString())) return t("yesterday");
    return format.dateTime(date, {
      weekday: "long",
      day: "numeric",
      month: "long",
      ...(date.getFullYear() !== now.getFullYear() ? { year: "numeric" } : {}),
    });
  };

  const currentMessages = useMemo(
    () => messages.filter((msg) => msg.conversationId === activeId),
    [messages, activeId]
  );

  /** Day sections, each holding runs of consecutive messages from one sender. */
  const sections = useMemo(() => {
    const out: { day: string; label: string; runs: { mine: boolean; items: Message[] }[] }[] = [];
    for (const msg of currentMessages) {
      const key = dayKey(msg.createdAt);
      let section = out[out.length - 1];
      if (!section || section.day !== key) {
        section = { day: key, label: msg.createdAt, runs: [] };
        out.push(section);
      }
      const mine = msg.senderId === currentUserId;
      const run = section.runs[section.runs.length - 1];
      const prev = run?.items[run.items.length - 1];
      const close =
        prev && Math.abs(new Date(msg.createdAt).getTime() - new Date(prev.createdAt).getTime()) < RUN_WINDOW_MS;
      if (run && run.mine === mine && close) run.items.push(msg);
      else section.runs.push({ mine, items: [msg] });
    }
    return out;
  }, [currentMessages, currentUserId]);

  const openers = [t("openerStay"), t("openerCheckIn"), t("openerDirections")];
  const canSend = Boolean(newMessageText.trim()) && !isSending;

  // Phone pane transitions (after the first user navigation only).
  const listVariants = slideIn("start", isRtl, 32);
  const threadVariants = slideIn("end", isRtl, isPhone ? 48 : 12);
  const threadKey = isPhone ? `thread-${mobileShowThread}-${activeId}` : `thread-${activeId}`;
  const listKey = isPhone ? `list-${mobileShowThread}` : "list";

  const statusIcon = (msg: Message) => {
    const pending = msg.id.startsWith("tmp_");
    const state = pending ? "sending" : msg.read ? "read" : "sent";
    return (
      <span className="relative inline-flex h-4 w-4 items-center justify-center">
        <AnimatePresence initial={false} mode="popLayout">
          <m.span
            key={state}
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.6 }}
            transition={spring.pop}
            className="inline-flex"
          >
            {state === "sending" ? (
              <BrandClockIcon size={13} className="text-primary-400" aria-hidden="true" />
            ) : state === "read" ? (
              <BrandCheckDoubleIcon size={14} className="text-secondary-600" aria-hidden="true" />
            ) : (
              <BrandCheckIcon size={14} className="text-primary-500" aria-hidden="true" />
            )}
          </m.span>
        </AnimatePresence>
        <span className="sr-only">
          {state === "sending" ? t("sendingStatus") : state === "read" ? t("readStatus") : t("sentStatus")}
        </span>
      </span>
    );
  };

  return (
    <div className="flex h-full min-h-0 w-full flex-1 bg-darnaBg md:p-4 lg:px-6 lg:pb-6">
      <div className="mx-auto flex min-h-0 w-full max-w-7xl overflow-hidden bg-white md:rounded-3xl md:shadow-e2">
        {/* START COLUMN: Conversation List */}
        <m.section
          key={listKey}
          variants={listVariants}
          initial={hasNavigated && isPhone ? "hidden" : false}
          animate="show"
          aria-labelledby={`${baseId}-title`}
          className={cn(
            "h-full w-full shrink-0 flex-col overflow-hidden border-e border-primary/[0.08] bg-white md:w-[340px] lg:w-[380px]",
            mobileShowThread ? "hidden md:flex" : "flex"
          )}
        >
          {/* Header */}
          <div className="shrink-0 px-4 pb-3 pt-4 sm:px-5 sm:pt-5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-1">
                <Link
                  href={isHostMode ? "/host" : "/"}
                  className={`-ms-2 flex h-11 w-11 items-center justify-center rounded-full text-primary-800 transition-colors duration-fast ease-standard hover:bg-primary/[0.07] md:hidden ${focusRing}`}
                  aria-label={isHostMode ? t("backToHost") : t("backToHome")}
                >
                  <BrandChevronLeftIcon size={22} className="rtl:rotate-180" aria-hidden="true" />
                </Link>
                <div className="min-w-0">
                  <h1 id={`${baseId}-title`} className="font-serif text-heading text-primary-900">
                    {t("title")}
                  </h1>
                  <p className="text-meta text-primary-500" aria-live="polite">
                    {totalUnread > 0 ? t("unreadCount", { count: totalUnread }) : t("allRead")}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <IconButton
                  label={t("searchToggle")}
                  icon={<BrandSearchIcon size={18} />}
                  pressed={searchOpen}
                  aria-expanded={searchOpen}
                  aria-controls={searchOpen ? searchId : undefined}
                  variant={searchOpen ? "secondary" : "ghost"}
                  onClick={() => setSearchOpen((v) => !v)}
                />
                <IconButton
                  label={t("settings")}
                  icon={<BrandSettingsIcon size={18} />}
                  onClick={() => toast.info(t("settingsComingSoon"))}
                />
              </div>
            </div>

            <AnimatePresence initial={false}>
              {searchOpen && (
                <m.div
                  key="search"
                  role="search"
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0, transition: { duration: dur.base, ease: ease.out } }}
                  exit={{ opacity: 0, y: -6, transition: { duration: dur.fast, ease: ease.standard } }}
                  className="mt-3"
                >
                  <Input
                    id={searchId}
                    type="search"
                    label={t("searchPlaceholder")}
                    hideLabel
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") setSearchOpen(false);
                    }}
                    placeholder={t("searchConversationsPlaceholder")}
                    prefix={<BrandSearchIcon size={17} aria-hidden="true" />}
                    className="h-11"
                    autoFocus
                  />
                </m.div>
              )}
            </AnimatePresence>

            <div className="mt-4">
              <SegmentedControl<"all" | "unread">
                ariaLabel={t("filterLabel")}
                value={filterType}
                onChange={setFilterType}
                size="sm"
                options={[
                  { value: "all", label: t("filterAll") },
                  { value: "unread", label: t("filterUnread") },
                ]}
              />
            </div>
          </div>

          {/* Conversation list */}
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-3 sm:px-3">
            {filteredConversations.length === 0 ? (
              filterType === "unread" || searchQuery ? (
                <div role="status">
                  <KitEmptyState
                    compact
                    variant="search"
                    title={t("filteredTitle")}
                    description={t("filteredSubtitle")}
                    action={
                      <Button
                        variant="tertiary"
                        size="sm"
                        onClick={() => {
                          setFilterType("all");
                          setSearchQuery("");
                          setSearchOpen(false);
                        }}
                      >
                        {t("clearAllFilters")}
                      </Button>
                    }
                  />
                </div>
              ) : (
                <KitEmptyState
                  compact
                  variant="messages"
                  title={t("trueEmptyTitle")}
                  description={t("trueEmptySubtitle")}
                  action={
                    <Button href="/search" variant="secondary" size="sm">
                      {t("exploreHomes")}
                    </Button>
                  }
                />
              )
            ) : (
              <ul aria-label={t("conversationsLabel")} className="space-y-0.5">
                {filteredConversations.map((conv) => {
                  const isSelected = conv.id === activeId;
                  const unread = conv.unreadCount?.[currentUserId] || 0;
                  const listing = conv.listing;
                  const name = otherName(conv);

                  return (
                    <li key={conv.id} className="relative">
                      {isSelected && (
                        <m.span
                          layoutId={`${baseId}-active`}
                          transition={spring.layout}
                          aria-hidden="true"
                          className="absolute inset-0 rounded-2xl bg-tertiary-100/80"
                        />
                      )}
                      <button
                        type="button"
                        data-testid="conversation-item"
                        onClick={() => handleSelectConversation(conv)}
                        aria-current={isSelected ? "true" : undefined}
                        className={cn(
                          "relative flex w-full items-start gap-3 rounded-2xl p-3 text-start transition-colors duration-fast ease-standard",
                          !isSelected && "hover:bg-primary/[0.04]",
                          focusRingInset
                        )}
                      >
                        <Avatar name={name} src={photoOf(conv.otherUser?.image)} size="md" decorative />

                        <span className="min-w-0 flex-1">
                          <span className="flex items-baseline justify-between gap-2">
                            <span
                              className={cn(
                                "truncate text-body",
                                unread > 0 ? "font-semibold text-primary-900" : "font-medium text-primary-800"
                              )}
                            >
                              {name}
                            </span>
                            {conv.lastMessageAt && (
                              <time
                                dateTime={conv.lastMessageAt}
                                className={cn(
                                  "shrink-0 text-meta tabular-nums",
                                  unread > 0 ? "font-semibold text-accent-700" : "text-primary-500"
                                )}
                              >
                                {formatListDate(conv.lastMessageAt)}
                              </time>
                            )}
                          </span>

                          <span className="mt-0.5 flex items-center gap-2">
                            <span
                              dir="auto"
                              className={cn(
                                "block min-w-0 flex-1 truncate text-meta",
                                unread > 0 ? "font-semibold text-primary-800" : "font-normal text-primary-600"
                              )}
                            >
                              {conv.lastMessage || t("startedConversation")}
                            </span>
                            {unread > 0 && (
                              <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-accent-600 px-1.5 text-[0.6875rem] font-semibold text-white tabular-nums">
                                <span aria-hidden="true">{unread}</span>
                                <span className="sr-only">{t("unreadCount", { count: unread })}</span>
                              </span>
                            )}
                          </span>

                          {listing && (
                            <span className="mt-2 flex w-fit max-w-full items-center gap-2 rounded-full bg-white py-0.5 pe-2.5 ps-0.5 shadow-e1">
                              <span className="relative h-5 w-5 shrink-0 overflow-hidden rounded-full bg-tertiary-100">
                                <Image
                                  src={listing.imageSrc?.[0] || "/assets/placeholder.jpg"}
                                  alt=""
                                  fill
                                  sizes="20px"
                                  className="object-cover"
                                />
                              </span>
                              <span dir="auto" className="truncate text-[0.75rem] font-medium text-primary-700">{listing.title}</span>
                            </span>
                          )}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </m.section>

        {/* END COLUMN: Thread */}
        <m.section
          key={threadKey}
          variants={threadVariants}
          initial={hasNavigated ? "hidden" : false}
          animate="show"
          aria-label={activeConversation ? t("threadLabel", { name: otherName(activeConversation) }) : undefined}
          className={cn(
            "h-full min-w-0 flex-1 flex-col overflow-hidden bg-darnaBg/60",
            !mobileShowThread ? "hidden md:flex" : "flex"
          )}
        >
          {!activeConversation ? (
            <div className="flex flex-1 items-center justify-center p-8">
              <KitEmptyState
                compact
                variant="messages"
                title={t("selectConversation")}
                description={t("selectConversationHint")}
              />
            </div>
          ) : (
            <>
              {/* Thread header */}
              <header className="glass-light z-[1] flex shrink-0 items-center justify-between gap-3 border-b border-primary/[0.08] px-2 py-2 pt-[max(0.5rem,env(safe-area-inset-top))] sm:px-5 sm:py-3">
                <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                  <IconButton
                    className="md:hidden"
                    label={t("back")}
                    icon={<BrandChevronLeftIcon size={22} className="rtl:rotate-180" />}
                    onClick={handleBack}
                  />
                  <Avatar name={otherName(activeConversation)} src={photoOf(activeConversation.otherUser?.image)} size="md" decorative />
                  <div className="min-w-0">
                    <h2 className="truncate text-title font-semibold text-primary-900">{otherName(activeConversation)}</h2>
                    {activeConversation.listing && (
                      <Link
                        href={`/listings/${activeConversation.listing.id}`}
                        className={`block truncate rounded text-meta text-primary-600 hover:text-accent-700 ${focusRing}`}
                      >
                        <span className="link-underline">{activeConversation.listing.title}</span>
                      </Link>
                    )}
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-1.5">
                  {activeConversation.listing && (
                    <Button
                      href={`/listings/${activeConversation.listing.id}`}
                      variant="tertiary"
                      size="sm"
                      className="hidden sm:inline-flex"
                      trailingIcon={<BrandExternalLinkIcon size={15} className="rtl:-scale-x-100" />}
                    >
                      {t("viewListing")}
                    </Button>
                  )}
                  <IconButton
                    label={t("conversationOptions")}
                    icon={<BrandMoreIcon size={20} />}
                    onClick={() => toast.info(t("optionsComingSoon"))}
                  />
                </div>
              </header>

              {/* Message stream */}
              <div
                ref={scrollerRef}
                className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-5 sm:px-8"
                role="log"
                aria-live="polite"
                aria-busy={isLoadingThread || undefined}
                aria-label={t("threadLabel", { name: otherName(activeConversation) })}
              >
                {isLoadingThread && currentMessages.length === 0 ? (
                  <div className="mx-auto flex max-w-3xl flex-col gap-4" aria-hidden="true">
                    {[64, 48, 72, 40].map((w, i) => (
                      <div key={i} className={cn("flex", i % 2 ? "justify-end" : "justify-start")}>
                        <div className="skeleton h-11 rounded-2xl" style={{ width: `${w}%` }} />
                      </div>
                    ))}
                  </div>
                ) : currentMessages.length === 0 ? (
                  <div className="mx-auto mt-4 max-w-md rounded-3xl bg-white p-6 text-center shadow-e1 sm:p-8">
                    <Illustration variant="messages" size={112} className="mx-auto" />
                    <h3 className="mt-3 font-serif text-heading text-primary-900">
                      {t("emptyThreadTitle", { name: otherName(activeConversation) })}
                    </h3>
                    <p className="mt-2 text-body text-primary-600">{t("emptyThreadHint")}</p>
                    <div className="mt-5 flex flex-col gap-2">
                      {openers.map((opener) => (
                        <button
                          key={opener}
                          type="button"
                          onClick={() => handleSendMessage(undefined, opener)}
                          className={cn(
                            "min-h-11 rounded-2xl bg-darnaBg px-4 py-2.5 text-start text-body text-primary-800 shadow-e1 transition-[box-shadow,transform] duration-fast ease-standard hover:-translate-y-px hover:shadow-e2",
                            focusRing
                          )}
                        >
                          {t("quotedOpener", { text: opener })}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="mx-auto flex max-w-3xl flex-col">
                    {sections.map((section) => (
                      <section key={section.day} aria-label={formatDayLabel(section.label)} className="flex flex-col">
                        <div className="sticky top-0 z-[1] flex justify-center py-3">
                          <span className="glass-light rounded-full px-3 py-1 text-meta font-semibold text-primary-600 shadow-e1">
                            {formatDayLabel(section.label)}
                          </span>
                        </div>
                        {section.runs.map((run) => {
                          const last = run.items[run.items.length - 1];
                          return (
                            <div
                              key={renderKeys.current.get(run.items[0].id) ?? run.items[0].id}
                              className={cn("mb-3 flex flex-col gap-1", run.mine ? "items-end" : "items-start")}
                            >
                              {run.items.map((msg, i) => {
                                const key = renderKeys.current.get(msg.id) ?? msg.id;
                                const first = i === 0;
                                const isLast = i === run.items.length - 1;
                                return (
                                  <m.div
                                    key={key}
                                    initial={freshKeys.current.has(key) ? { opacity: 0, y: 10, scale: 0.96 } : false}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    transition={spring.press}
                                    style={{ transformOrigin: run.mine ? (isRtl ? "bottom left" : "bottom right") : isRtl ? "bottom right" : "bottom left" }}
                                    className={cn(
                                      "max-w-[85%] whitespace-pre-wrap break-words px-4 py-2.5 text-start text-body sm:max-w-[70%]",
                                      "rounded-3xl",
                                      run.mine
                                        ? cn(
                                            "bg-primary-800 text-white shadow-e1",
                                            !first && "rounded-se-lg",
                                            !isLast && "rounded-ee-lg",
                                            isLast && "rounded-ee-md"
                                          )
                                        : cn(
                                            "bg-white text-primary-900 shadow-e1",
                                            !first && "rounded-ss-lg",
                                            !isLast && "rounded-es-lg",
                                            isLast && "rounded-es-md"
                                          ),
                                      msg.id.startsWith("tmp_") && "opacity-80"
                                    )}
                                  >
                                    <span className="sr-only">
                                      {run.mine ? t("youSaid") : t("theySaid", { name: otherName(activeConversation) })}
                                    </span>
                                    <span dir="auto" className="block">
                                      {msg.text}
                                    </span>
                                  </m.div>
                                );
                              })}
                              <div className="flex items-center gap-1 px-2 text-meta text-primary-500">
                                <time dateTime={last.createdAt} className="tabular-nums">
                                  {formatMessageTime(last.createdAt)}
                                </time>
                                {run.mine && statusIcon(last)}
                              </div>
                            </div>
                          );
                        })}
                      </section>
                    ))}
                  </div>
                )}
              </div>

              {/* Composer */}
              <div className="shrink-0 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 sm:px-6 sm:pb-5">
                <form
                  onSubmit={handleSendMessage}
                  className="mx-auto flex max-w-3xl items-end gap-1.5 rounded-[1.625rem] bg-white p-1.5 shadow-e2 ring-1 ring-transparent transition-shadow duration-fast ease-standard focus-within:ring-2 focus-within:ring-accent-600/70"
                >
                  <IconButton
                    label={t("attach")}
                    icon={<BrandPaperclipIcon size={19} />}
                    onClick={() => toast.info(t("attachSimulated"))}
                  />

                  <label htmlFor={composerId} className="sr-only">
                    {t("messageLabel", { name: otherName(activeConversation) })}
                  </label>
                  <textarea
                    ref={textareaRef}
                    id={composerId}
                    dir="auto"
                    value={newMessageText}
                    onChange={(e) => setNewMessageText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    rows={1}
                    placeholder={t("typeMessage")}
                    aria-describedby={`${composerId}-hint`}
                    className="max-h-[168px] min-h-11 flex-1 resize-none bg-transparent px-1 py-2.5 text-base leading-6 text-primary-900 placeholder:text-primary-400 focus:outline-none sm:text-body"
                  />
                  <span id={`${composerId}-hint`} className="sr-only">
                    {t("composerHint")}
                  </span>

                  <m.button
                    type="submit"
                    disabled={!canSend}
                    aria-label={t("send")}
                    title={t("send")}
                    animate={{ scale: canSend || isSending ? 1 : 0.9 }}
                    whileTap={canSend ? { scale: 0.9 } : undefined}
                    transition={spring.press}
                    className={cn(
                      "flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-[background-color,color,box-shadow] duration-fast ease-standard",
                      canSend || isSending
                        ? "bg-cta text-white shadow-glow"
                        : "cursor-not-allowed bg-primary/[0.07] text-primary-400",
                      focusRing
                    )}
                  >
                    <AnimatePresence initial={false} mode="wait">
                      {isSending ? (
                        <m.span
                          key="busy"
                          initial={{ opacity: 0, scale: 0.6 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.6 }}
                          transition={{ duration: dur.micro }}
                          className="inline-flex"
                        >
                          <Spinner size={18} />
                        </m.span>
                      ) : (
                        <m.span
                          key="send"
                          initial={{ opacity: 0, scale: 0.6, rotate: -20 }}
                          animate={{ opacity: 1, scale: 1, rotate: 0 }}
                          exit={{ opacity: 0, scale: 0.6 }}
                          transition={spring.pop}
                          className="inline-flex"
                        >
                          <BrandSendIcon size={18} className="rtl:-scale-x-100" aria-hidden="true" />
                        </m.span>
                      )}
                    </AnimatePresence>
                  </m.button>
                </form>
              </div>
            </>
          )}
        </m.section>
      </div>
    </div>
  );
}
