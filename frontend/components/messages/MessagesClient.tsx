"use client";

import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { Link, useRouter, usePathname } from "@/navigation";
import { Conversation, Message, User } from "@/types";
import Avatar from "@/components/Avatar";
import { sendMessage, markConversationAsRead } from "@/lib/data/conversations";
import {
  Search,
  Settings,
  ChevronLeft,
  Paperclip,
  MessageSquare,
  Check,
  CheckCheck,
  MoreHorizontal,
  Send,
} from "lucide-react";
import { toast } from "react-toastify";

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
  const router = useRouter();
  const pathname = usePathname();
  const isHostMode = pathname?.includes("/host");
  const currentUserId = currentUser?.id || "usr_yacine";

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
    markConversationAsRead(conv.id, currentUserId);

    // Clear unread count locally
    setConversations((prev) =>
      prev.map((c) =>
        c.id === conv.id && c.unreadCount
          ? { ...c, unreadCount: { ...c.unreadCount, [currentUserId]: 0 } }
          : c
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
      const q = searchQuery.toLowerCase();
      const otherName = c.otherUser?.name?.toLowerCase() || "";
      const lastMsg = c.lastMessage?.toLowerCase() || "";
      const listingTitle = c.listing?.title?.toLowerCase() || "";
      if (!otherName.includes(q) && !lastMsg.includes(q) && !listingTitle.includes(q)) {
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
      id: `msg_${Date.now()}`,
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
      prev.map((c) =>
        c.id === activeId
          ? { ...c, lastMessage: sentText, lastMessageAt: tempMsg.createdAt }
          : c
      )
    );

    try {
      await sendMessage({
        conversationId: activeId,
        senderId: currentUserId,
        receiverId: activeConversation?.otherUser?.id,
        text: sentText,
      });
    } catch {
      toast.error("Failed to send message.");
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

  const currentMessages = messages.filter((m) => m.conversationId === activeId);

  return (
    <div className="w-full h-full flex-1 flex flex-col md:flex-row overflow-hidden bg-white">
      {/* LEFT COLUMN: Conversation List */}
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
                className="md:hidden p-1.5 -ms-1 rounded-full hover:bg-neutral-100 text-neutral-600 transition btn-press"
                title={isHostMode ? "Back to Host Dashboard" : "Back to Home"}
                aria-label="Back"
              >
                <ChevronLeft size={22} />
              </Link>
              <h1 className="text-xl sm:text-2xl font-bold text-primary font-serif">
                Messages
              </h1>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setSearchOpen(!searchOpen)}
                className={`p-2 rounded-full transition btn-press ${
                  searchOpen ? "bg-primary text-white" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                }`}
                title="Search messages"
              >
                <Search size={16} />
              </button>
              <button
                type="button"
                onClick={() => toast.info("Message notification settings")}
                className="p-2 rounded-full bg-neutral-100 text-neutral-600 hover:bg-neutral-200 transition btn-press"
                title="Settings"
              >
                <Settings size={16} />
              </button>
            </div>
          </div>

          {/* Search Bar (Toggled) */}
          {searchOpen && (
            <div className="mt-3 relative animate-in fade-in">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search messages or listings..."
                className="w-full ps-9 pe-3 py-2 bg-neutral-50 border border-tertiary/70 rounded-xl text-xs text-primary placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                autoFocus
              />
              <Search
                size={14}
                className="absolute start-3 top-1/2 -translate-y-1/2 text-neutral-400"
              />
            </div>
          )}

          {/* Header Row 2: Pills (All ▾ / Unread) */}
          <div className="flex items-center gap-2 mt-4">
            <button
              type="button"
              onClick={() => setFilterType("all")}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition ${
                filterType === "all"
                  ? "bg-primary text-white shadow-xs"
                  : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
              }`}
            >
              All ▾
            </button>
            <button
              type="button"
              onClick={() => setFilterType(filterType === "unread" ? "all" : "unread")}
              className={`px-3 py-1 rounded-full text-xs font-semibold border transition ${
                filterType === "unread"
                  ? "bg-primary text-white border-primary shadow-xs"
                  : "border-tertiary/80 text-neutral-600 hover:bg-neutral-50"
              }`}
            >
              Unread
            </button>
          </div>
        </div>

        {/* Conversation List Scrollable */}
        <div className="flex-1 overflow-y-auto divide-y divide-tertiary/30">
          {filteredConversations.length === 0 ? (
            <div className="p-8 text-center my-auto">
              {filterType === "unread" || searchQuery ? (
                /* (1) Filtered Empty State */
                <div className="space-y-3">
                  <div className="w-12 h-12 bg-neutral-100 text-neutral-500 rounded-full flex items-center justify-center mx-auto">
                    <MessageSquare size={24} />
                  </div>
                  <h3 className="text-sm font-bold text-primary">
                    We couldn&apos;t find any messages
                  </h3>
                  <p className="text-xs text-neutral-500 max-w-xs mx-auto">
                    Try removing or adjusting your search filters.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setFilterType("all");
                      setSearchQuery("");
                      setSearchOpen(false);
                    }}
                    className="px-4 py-1.5 border border-tertiary rounded-xl text-xs font-semibold text-neutral-700 hover:bg-neutral-50 transition"
                  >
                    Clear all filters
                  </button>
                </div>
              ) : (
                /* (2) True Empty State */
                <div className="space-y-3">
                  <div className="w-12 h-12 bg-tertiary/30 text-primary rounded-full flex items-center justify-center mx-auto">
                    <MessageSquare size={22} />
                  </div>
                  <h3 className="text-sm font-bold text-primary">
                    No messages yet
                  </h3>
                  <p className="text-xs text-neutral-500 max-w-xs mx-auto">
                    When you contact a host or receive booking questions, they will show up here.
                  </p>
                  <Link
                    href="/search"
                    className="inline-block px-4 py-1.5 bg-primary text-white rounded-xl text-xs font-semibold hover:bg-primary/95 transition btn-press"
                  >
                    Explore homes & stays
                  </Link>
                </div>
              )}
            </div>
          ) : (
            filteredConversations.map((conv) => {
              const isSelected = conv.id === activeId;
              const unread = conv.unreadCount?.[currentUserId] || 0;
              const otherUser = conv.otherUser;
              const listing = conv.listing;

              return (
                <div
                  key={conv.id}
                  data-testid="conversation-item"
                  onClick={() => handleSelectConversation(conv)}
                  className={`p-4 cursor-pointer transition flex items-start gap-3.5 select-none ${
                    isSelected
                      ? "bg-tertiary/25 border-s-4 border-primary"
                      : "hover:bg-neutral-50"
                  }`}
                >
                  {/* Avatar with relative online indicator */}
                  <div className="relative shrink-0">
                    <Avatar src={otherUser?.image} size={44} />
                    <span className="absolute bottom-0 end-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full" />
                  </div>

                  {/* Text details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <div className={`text-xs sm:text-sm truncate ${unread > 0 ? "font-bold text-primary" : "font-semibold text-neutral-800"}`}>
                        {otherUser?.name || "Host"}
                      </div>
                      <div className="text-[10px] text-neutral-400 shrink-0">
                        {conv.lastMessageAt ? new Date(conv.lastMessageAt).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : ""}
                      </div>
                    </div>

                    <div className={`text-xs truncate mt-0.5 ${unread > 0 ? "font-semibold text-primary" : "text-neutral-500"}`}>
                      {conv.lastMessage || "Started a conversation"}
                    </div>

                    {/* Listing thumbnail chip */}
                    {listing && (
                      <div className="flex items-center gap-1.5 mt-2 px-2 py-1 bg-white/80 rounded-lg border border-tertiary/40 w-fit max-w-full">
                        <div className="relative w-4 h-4 rounded overflow-hidden shrink-0">
                          <Image
                            src={listing.imageSrc?.[0] || "/assets/placeholder.jpg"}
                            alt={listing.title}
                            fill
                            className="object-cover"
                          />
                        </div>
                        <span className="text-[10px] text-neutral-600 truncate font-medium">
                          {listing.title}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Unread badge */}
                  {unread > 0 && (
                    <span className="w-2.5 h-2.5 rounded-full bg-accent shrink-0 mt-1.5" />
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: Thread Canvas */}
      <div
        className={`flex-1 flex flex-col h-full overflow-hidden bg-[#FAF9F5] ${
          !mobileShowThread ? "hidden md:flex" : "flex"
        }`}
      >
        {!activeConversation ? (
          /* Blank Canvas when nothing is selected (Matches reference spec) */
          <div className="flex-1 flex items-center justify-center p-8 bg-white text-center">
            <div className="max-w-xs space-y-2 text-neutral-400">
              <MessageSquare size={44} className="mx-auto text-tertiary" />
              <div className="text-sm font-semibold text-neutral-600">
                Select a conversation
              </div>
              <p className="text-xs text-neutral-400">
                Choose a guest or host from the left list to read messages and reply.
              </p>
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
                  className="md:hidden min-w-[44px] min-h-[44px] -ms-2 flex items-center justify-center text-neutral-700 hover:bg-neutral-100 rounded-full transition btn-press"
                  aria-label="Back to conversations list"
                >
                  <ChevronLeft size={22} />
                </button>

                <Avatar src={activeConversation.otherUser?.image} size={40} />
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-sm sm:text-base text-primary">
                      {activeConversation.otherUser?.name || "Host"}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full font-semibold">
                      Verified
                    </span>
                  </div>
                  {activeConversation.listing && (
                    <Link
                      href={`/listings/${activeConversation.listing.id}`}
                      className="text-xs text-neutral-500 hover:text-accent hover:underline line-clamp-1"
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
                    className="hidden sm:inline-block px-3.5 py-1.5 bg-tertiary/25 hover:bg-tertiary/45 text-primary font-semibold rounded-xl transition btn-press"
                  >
                    View Listing
                  </Link>
                )}
                <button
                  type="button"
                  onClick={() => toast.info("Conversation options")}
                  className="p-2 text-neutral-500 hover:bg-neutral-100 rounded-xl transition btn-press"
                  title="Conversation options"
                >
                  <MoreHorizontal size={20} />
                </button>
              </div>
            </div>

            {/* Scrollable Messages Stream */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              {/* Empty Thread Prompt with Quick Opener Chips */}
              {currentMessages.length === 0 ? (
                <div className="p-8 text-center max-w-md mx-auto my-auto space-y-4 bg-white rounded-3xl border border-tertiary/60 shadow-xs">
                  <span className="text-3xl">👋</span>
                  <h3 className="font-bold text-primary text-base">
                    Say hello to {activeConversation.otherUser?.name || "Host"}
                  </h3>
                  <p className="text-xs text-neutral-500">
                    Ask about check-in details, directions, local recommendations, or special requests.
                  </p>
                  <div className="flex flex-col gap-2 pt-2">
                    {[
                      "Salam! Looking forward to our stay in Algeria!",
                      "Hi! Is flexible check-in or airport pickup possible?",
                      "What is the best route to reach the property?",
                    ].map((opener, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handleSendMessage(undefined, opener)}
                        className="px-3.5 py-2 bg-neutral-50 hover:bg-tertiary/30 border border-tertiary/50 rounded-xl text-xs text-primary font-medium transition text-start"
                      >
                        &ldquo;{opener}&rdquo;
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
                      className={`flex flex-col ${
                        isSentByMe ? "items-end text-end" : "items-start text-start"
                      }`}
                    >
                      <div
                        className={`max-w-[80%] sm:max-w-[70%] p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-xs ${
                          isSentByMe
                            ? "bg-primary text-white rounded-ee-xs"
                            : "bg-white text-neutral-800 border border-tertiary/70 rounded-es-xs"
                        }`}
                      >
                        {msg.text}
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-neutral-400 mt-1 px-1">
                        <span>
                          {new Date(msg.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        {isSentByMe && (
                          msg.read ? (
                            <CheckCheck size={13} className="text-emerald-500" />
                          ) : (
                            <Check size={13} className="text-neutral-400" />
                          )
                        )}
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
                className="flex items-end gap-2 bg-neutral-50/80 border border-tertiary/80 rounded-2xl p-2 shadow-2xs focus-within:ring-2 focus-within:ring-accent/30 focus-within:border-accent focus-within:bg-white transition-all duration-150"
              >
                <button
                  type="button"
                  onClick={() => toast.info("File attachment simulated.")}
                  className="p-2 min-w-[36px] min-h-[36px] flex items-center justify-center text-neutral-400 hover:text-primary hover:bg-neutral-100 rounded-xl transition shrink-0 btn-press"
                  title="Attach file or photo"
                  aria-label="Attach file"
                >
                  <Paperclip size={18} />
                </button>

                <textarea
                  value={newMessageText}
                  onChange={(e) => setNewMessageText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  rows={1}
                  placeholder="Type a message (Press Enter to send)..."
                  className="flex-1 bg-transparent py-2 px-2 text-xs sm:text-sm text-primary placeholder-neutral-400 focus:outline-none resize-none max-h-32 leading-relaxed"
                />

                <button
                  type="submit"
                  disabled={!newMessageText.trim() || isSending}
                  className="p-2.5 min-w-[40px] min-h-[40px] flex items-center justify-center bg-accent text-white rounded-xl hover:bg-accent/90 transition shrink-0 disabled:opacity-40 disabled:hover:bg-accent btn-press shadow-xs"
                  title="Send message"
                  aria-label="Send message"
                >
                  <Send size={16} />
                </button>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
