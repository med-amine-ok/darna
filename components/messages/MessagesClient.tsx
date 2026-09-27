"use client";

import React, { useState, useEffect, useMemo, useRef, useTransition } from "react";
import { useRouter, usePathname } from "@/navigation";
import { useTranslations } from "next-intl";
import { ChatMessage, Conversation, ConversationCategory, SafeUser } from "@/types";
import ConversationListHeader from "./ConversationListHeader";
import ConversationListItem from "./ConversationListItem";
import ConversationListSkeleton from "./ConversationListSkeleton";
import ConversationEmptyState from "./ConversationEmptyState";
import MessageThreadHeader from "./MessageThreadHeader";
import MessageBubble from "./MessageBubble";
import MessageComposer from "./MessageComposer";
import EmptyThreadPrompt from "./EmptyThreadPrompt";
import {
  getMessages,
  sendMessage,
  markAsRead,
} from "@/lib/data/conversations";

interface Props {
  initialConversations: Conversation[];
  currentUser?: SafeUser | null;
  selectedConversationId?: string | null;
}

export default function MessagesClient({
  initialConversations,
  currentUser,
  selectedConversationId = null,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations("messages");
  const [conversations, setConversations] = useState<Conversation[]>(initialConversations);
  const [activeId, setActiveId] = useState<string | null>(selectedConversationId);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);
  const [activeCategory, setActiveCategory] = useState<ConversationCategory>("all");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [initialComposerValue, setInitialComposerValue] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const replyTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Sync activeId when selectedConversationId changes or default to first on desktop
  useEffect(() => {
    if (selectedConversationId) {
      setActiveId(selectedConversationId);
    } else if (
      typeof window !== "undefined" &&
      window.innerWidth >= 768 &&
      conversations.length > 0 &&
      !activeId
    ) {
      setActiveId(conversations[0].id);
    }
  }, [selectedConversationId, conversations, activeId]);

  // Load messages whenever activeId changes
  useEffect(() => {
    let isCancelled = false;

    if (!activeId) {
      setMessages([]);
      return;
    }

    async function loadThread() {
      setIsLoadingMessages(true);
      try {
        const msgs = await getMessages(activeId!);
        if (!isCancelled) {
          setMessages(msgs);
        }

        // Mark as read in state & data layer
        if (!isCancelled) {
          markAsRead(activeId!, currentUser?.id);
          setConversations((prev) =>
            prev.map((c) => (c.id === activeId ? { ...c, unreadCount: 0 } : c))
          );
        }
      } catch (err) {
        console.error("Failed to load messages", err);
      } finally {
        if (!isCancelled) {
          setIsLoadingMessages(false);
        }
      }
    }

    loadThread();

    return () => {
      isCancelled = true;
      if (replyTimeoutRef.current) {
        clearTimeout(replyTimeoutRef.current);
      }
    };
  }, [activeId, currentUser?.id]);

  // Auto-scroll to latest message on open or when new message arrives
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoadingMessages]);

  // Active selected conversation object
  const activeConversation = useMemo(() => {
    if (!activeId) return null;
    return conversations.find((c) => c.id === activeId) || null;
  }, [conversations, activeId]);

  // Filtered conversations in left sidebar
  const filteredConversations = useMemo(() => {
    let result = [...conversations];

    // Category filter
    if (activeCategory !== "all") {
      result = result.filter((c) => c.category === activeCategory);
    }

    // Unread filter
    if (unreadOnly) {
      result = result.filter((c) => (c.unreadCount || 0) > 0);
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((c) => {
        const other = c.participants.find((p) => p.id !== currentUser?.id);
        const nameMatch = other?.name?.toLowerCase().includes(q);
        const listingMatch = c.listing?.title.toLowerCase().includes(q);
        const msgMatch = c.lastMessage?.content.toLowerCase().includes(q);
        return nameMatch || listingMatch || msgMatch;
      });
    }

    return result;
  }, [conversations, activeCategory, unreadOnly, searchQuery, currentUser?.id]);

  const totalUnreadCount = useMemo(() => {
    return conversations.reduce((acc, c) => acc + (c.unreadCount || 0), 0);
  }, [conversations]);

  // Handle selecting a conversation
  const handleSelectConversation = (id: string) => {
    setActiveId(id);
    // On mobile screens, navigate to deep-link route /messages/[conversationId]
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      router.push(`/messages/${id}`);
    }
  };

  // Handle back to list on mobile
  const handleBackToList = () => {
    setActiveId(null);
    if (pathname !== "/messages") {
      router.push("/messages");
    }
  };

  // Handle sending a new message
  const handleSendMessage = async (text: string) => {
    if (!activeId || !currentUser) return;

    const otherUser = activeConversation?.participants.find((p) => p.id !== currentUser.id);

    // 1. Optimistic ChatMessage
    const optimisticMessage: ChatMessage = {
      id: `temp-${Date.now()}`,
      conversationId: activeId,
      senderId: currentUser.id,
      receiverId: otherUser?.id,
      content: text,
      createdAt: new Date().toISOString(),
      isRead: true,
    };

    setMessages((prev) => [...prev, optimisticMessage]);

    // 2. Update conversation row in left sidebar
    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeId
          ? {
              ...c,
              lastMessage: optimisticMessage,
              lastMessageAt: optimisticMessage.createdAt,
            }
          : c
      )
    );

    // 3. Persist to mock data layer
    try {
      const saved = await sendMessage({
        conversationId: activeId,
        senderId: currentUser.id,
        receiverId: otherUser?.id,
        content: text,
      });

      // Replace optimistic message with saved one
      setMessages((prev) => prev.map((m) => (m.id === optimisticMessage.id ? saved : m)));
    } catch (err) {
      console.error("Failed to send message", err);
    }

    // 4. Simulated friendly response from host after 1.5s for dynamic realism
    if (activeConversation?.category !== "support") {
      replyTimeoutRef.current = setTimeout(async () => {
        const replyText = "Got it! Thanks for letting me know. See you soon!";
        const replyMsg = await sendMessage({
          conversationId: activeId,
          senderId: otherUser?.id || "user-2",
          receiverId: currentUser.id,
          content: replyText,
        });

        setMessages((prev) => [...prev, replyMsg]);
        setConversations((prev) =>
          prev.map((c) =>
            c.id === activeId
              ? {
                  ...c,
                  lastMessage: replyMsg,
                  lastMessageAt: replyMsg.createdAt,
                }
              : c
          )
        );
      }, 1500);
    }
  };

  const isFiltered = activeCategory !== "all" || unreadOnly || Boolean(searchQuery.trim());

  const handleClearFilters = () => {
    setActiveCategory("all");
    setUnreadOnly(false);
    setSearchQuery("");
  };

  return (
    <div className="w-full h-full min-h-0 flex-1 flex bg-white overflow-hidden">
      {/* ======================================================== */}
      {/* 1. LEFT COLUMN: Conversation List (~336px-380px fixed desktop) */}
      {/* ======================================================== */}
      <div
        className={`w-full md:w-[336px] xl:w-[380px] md:flex-shrink-0 h-full min-h-0 flex flex-col border-e border-neutral-200 bg-white overflow-hidden ${
          activeId ? "hidden md:flex" : "flex"
        }`}
      >
        {/* Header with Search & Settings & Filters (Fixed at top of users column) */}
        <div className="flex-shrink-0">
          <ConversationListHeader
            activeCategory={activeCategory}
            onSelectCategory={setActiveCategory}
            unreadOnly={unreadOnly}
            onToggleUnread={() => setUnreadOnly((prev) => !prev)}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            unreadCountTotal={totalUnreadCount}
          />
        </div>

        {/* Scrollable Conversation / Users List (Scrolls independently) */}
        <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-neutral-100 flex flex-col scrollbar-thin scrollbar-thumb-neutral-200 hover:scrollbar-thumb-neutral-300">
          {isLoadingConversations ? (
            <ConversationListSkeleton />
          ) : filteredConversations.length === 0 ? (
            <ConversationEmptyState
              isFiltered={isFiltered}
              onClearFilters={handleClearFilters}
            />
          ) : (
            filteredConversations.map((conv) => (
              <ConversationListItem
                key={conv.id}
                conversation={conv}
                currentUser={currentUser}
                isSelected={conv.id === activeId}
                onClick={() => handleSelectConversation(conv.id)}
              />
            ))
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. RIGHT COLUMN: Active Thread Panel                     */}
      {/* ======================================================== */}
      <div
        className={`flex-1 h-full min-h-0 flex flex-col bg-white overflow-hidden ${
          !activeId ? "hidden md:flex bg-neutral-50/50" : "flex"
        }`}
      >
        {!activeConversation ? (
          // Default Blank Canvas when nothing selected
          <div className="flex-1 h-full flex flex-col items-center justify-center p-8 text-center bg-neutral-50/30 select-none">
            <div className="w-16 h-16 rounded-full bg-neutral-100 flex items-center justify-center mb-4 text-neutral-400">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h3 className="text-base font-semibold text-neutral-800 mb-1">
              {t("selectConversation")}
            </h3>
            <p className="text-sm text-neutral-500 max-w-xs">
              {t("trueEmptySubtitle")}
            </p>
          </div>
        ) : (
          <div className="flex-1 h-full min-h-0 flex flex-col overflow-hidden animate-in fade-in duration-150">
            {/* Thread Header (Fixed at top of message thread) */}
            <div className="flex-shrink-0">
              <MessageThreadHeader
                conversation={activeConversation}
                currentUser={currentUser}
                showBackChevron={true}
                onBack={handleBackToList}
              />
            </div>

            {/* Scrollable Message List (Scrolls independently with one user) */}
            <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-4 flex flex-col space-y-4 scrollbar-thin scrollbar-thumb-neutral-200 hover:scrollbar-thumb-neutral-300">
              {isLoadingMessages ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-neutral-300 border-t-neutral-800 rounded-full animate-spin" />
                </div>
              ) : messages.length === 0 ? (
                <EmptyThreadPrompt
                  otherUser={activeConversation.participants.find(
                    (p) => p.id !== currentUser?.id
                  )}
                  onSelectOpener={(opener) => {
                    setInitialComposerValue(opener);
                  }}
                />
              ) : (
                <>
                  {/* Flexible spacer that pushes messages down when few messages without negative scroll coordinate bug */}
                  <div className="flex-1 min-h-0" />
                  {messages.map((msg, index) => {
                    const isSentByMe = msg.senderId === currentUser?.id;
                    const prevMsg = messages[index - 1];
                    const nextMsg = messages[index + 1];

                    const isFirstInGroup =
                      !prevMsg || prevMsg.senderId !== msg.senderId;
                    const isLastInGroup =
                      !nextMsg || nextMsg.senderId !== msg.senderId;

                    // Show date gap header if > 2 hours between messages or first message
                    const showTimeGapHeader =
                      index === 0 ||
                      (prevMsg &&
                        new Date(msg.createdAt).getTime() -
                          new Date(prevMsg.createdAt).getTime() >
                          1000 * 60 * 60 * 2);

                    const senderUser = isSentByMe
                      ? currentUser
                      : activeConversation.participants.find(
                          (p) => p.id === msg.senderId
                        );

                    return (
                      <MessageBubble
                        key={msg.id}
                        message={msg}
                        isSentByMe={isSentByMe}
                        sender={senderUser}
                        isFirstInGroup={isFirstInGroup}
                        isLastInGroup={isLastInGroup}
                        showTimeGapHeader={showTimeGapHeader}
                      />
                    );
                  })}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Thread Composer (Fixed at bottom of message thread) */}
            <div className="flex-shrink-0">
              <MessageComposer
                onSendMessage={handleSendMessage}
                initialValue={initialComposerValue}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
