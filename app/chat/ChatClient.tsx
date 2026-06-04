"use client";

import { useChat } from "@ai-sdk/react";
import type { UIMessage } from "ai";
import { DefaultChatTransport } from "ai";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { authClient } from "@/lib/auth-client";

import { ChatInput } from "./components/chat-input";
import { ChatMessage } from "./components/chat-message";

const STORAGE_KEY = "cutwave.chat.v2";
const MAX_API_MESSAGES = 12;

const chatTransport = new DefaultChatTransport({
  api: "/api/chat",
  prepareSendMessagesRequest: ({ messages, trigger, messageId, body }) => ({
    body: {
      ...body,
      messages: messages
        .filter((m) => m.role === "user" || m.role === "assistant")
        .slice(-MAX_API_MESSAGES),
      trigger,
      messageId,
    },
  }),
});

const INITIAL_MESSAGES: UIMessage[] = [
  {
    id: "system-welcome",
    role: "system",
    parts: [
      {
        type: "text",
        text: "Your booking assistant is online.",
      },
    ],
  },
  {
    id: "assistant-welcome",
    role: "assistant",
    parts: [
      {
        type: "text",
        text:
          "Hi! I'm CutWave, your personal assistant. 👋\n\n" +
          "I'm here to help you book a haircut or beard trim. " +
          "I'll guide you through:\n\n" +
          "1️⃣ Choose a barbershop\n" +
          "2️⃣ Select a service\n" +
          "3️⃣ Pick date and time\n" +
          "4️⃣ Confirm and pay\n\n" +
          "Sign in when you're ready — I'll help you book step by step.\n\n" +
          "How can I help you today? 😊",
      },
    ],
  },
];

function safeParseMessages(value: string | null): UIMessage[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (m) => m && typeof m === "object" && typeof m.id === "string",
    );
  } catch {
    return [];
  }
}

function uniqById(items: UIMessage[]) {
  const map = new Map<string, UIMessage>();
  for (const item of items) map.set(item.id, item);
  return Array.from(map.values());
}

export default function ChatClient() {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const searchParams = useSearchParams();
  const router = useRouter();
  const checkout = searchParams.get("checkout");

  const [localMessages, setLocalMessages] = useState<UIMessage[]>([]);
  const [hasProcessedCheckout, setHasProcessedCheckout] = useState(false);

  const persistedMessages = useMemo<UIMessage[]>(() => {
    if (typeof window === "undefined") return [];
    return safeParseMessages(localStorage.getItem(STORAGE_KEY));
  }, []);

  const { data: session, isPending: isAuthPending } = authClient.useSession();

  const { messages, setMessages, sendMessage, status, error } = useChat({
    transport: chatTransport,
    onError: (err) => {
      console.error("Chat error:", err);
    },
  });

  // Reidratação do chat
  useEffect(() => {
    if (messages.length === 0 && persistedMessages.length > 0) {
      setMessages(persistedMessages);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Scroll automático
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, localMessages]);

  // Persistência
  useEffect(() => {
    if (typeof window === "undefined") return;

    const merged = uniqById([...messages, ...localMessages]);
    if (merged.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    }
  }, [messages, localMessages]);

  // 🔥 Mensagem pós-checkout
  useEffect(() => {
    if (!checkout || hasProcessedCheckout) return;

    const fromChat = sessionStorage.getItem("fromChat");
    if (!fromChat) return;

    setHasProcessedCheckout(true);
    sessionStorage.removeItem("fromChat");

    if (checkout === "success") {
      setLocalMessages((prev) =>
        uniqById([
          ...prev,
          {
            id: `checkout-success-${Date.now()}`,
            role: "assistant",
            parts: [
              {
                type: "text",
                text:
                  "🎉 **Payment confirmed!**\n\n" +
                  "Your appointment was booked successfully. Thank you for choosing CutWave! ✂️\n\n" +
                  "📌 **Where to view your appointments:**\n" +
                  "1. Open the **Menu**\n" +
                  "2. Tap **Appointments**\n" +
                  "3. See **date, time, and status** for your service\n\n" +
                  "If you'd like to book another service, just let me know! 😊",
              },
            ],
          },
        ]),
      );
    }

    if (checkout === "cancel") {
      setLocalMessages((prev) =>
        uniqById([
          ...prev,
          {
            id: `checkout-cancel-${Date.now()}`,
            role: "assistant",
            parts: [
              {
                type: "text",
                text:
                  "❌ Payment cancelled.\n\n" +
                  "No worries! I can help you pick another date or time if you'd like. 😊",
              },
            ],
          },
        ]),
      );
    }

    router.replace("/chat", { scroll: false });
  }, [checkout, hasProcessedCheckout, router]);

  const appendLoginRequiredMessage = () => {
    setLocalMessages((prev) =>
      uniqById([
        ...prev,
        {
          id: `login-required-${Date.now()}`,
          role: "assistant",
          parts: [
            {
              type: "text",
              text: JSON.stringify({ type: "login-required" }),
            },
          ],
        },
      ]),
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;

    if (isAuthPending) return;

    if (!session) {
      localStorage.setItem("redirectAfterLogin", "/chat");
      appendLoginRequiredMessage();
      setInput("");
      return;
    }

    sendMessage({ text });
    setInput("");
  };

  const isLoading =
    isAuthPending || status === "streaming" || status === "submitted";

  const allMessages: UIMessage[] = uniqById([
    ...INITIAL_MESSAGES,
    ...messages,
    ...localMessages,
  ]);

  return (
    <div className="bg-background relative flex h-dvh w-full flex-col overflow-hidden sm:rounded-[20px]">
      {/* Header */}
      <div className="flex w-full shrink-0 items-center justify-between border-b pt-6 pr-5 pb-4 pl-5">
        <Link href="/">
          <ChevronLeft className="size-6 shrink-0" />
        </Link>
        <p className="font-merriweather text-foreground text-[20px] leading-[1.4] tracking-[-1px] italic">
          CutWave
        </p>
        <div className="w-6" />
      </div>

      {/* Messages */}
      <div className="scrollbar-hide w-full flex-1 overflow-y-auto px-4 py-3">
        {allMessages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} />
        ))}
        {error && (
          <div className="border-destructive/30 bg-destructive/10 text-destructive mx-4 mt-4 rounded-xl border p-3 text-sm">
            {error.message ||
              "Something went wrong. Check your connection and API keys, then try again."}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <ChatInput
        input={input}
        onChange={(e) => setInput(e.target.value)}
        onSubmit={handleSubmit}
        isLoading={isLoading}
      />
    </div>
  );
}
