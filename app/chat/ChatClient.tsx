"use client";

import { useChat } from "@ai-sdk/react";
import type { UIMessage } from "ai";
import { DefaultChatTransport } from "ai";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { ChatInput } from "./components/chat-input";
import { ChatMessage } from "./components/chat-message";

const STORAGE_KEY = "cutwave.chat.v1";

const INITIAL_MESSAGES: UIMessage[] = [
  {
    id: "system-welcome",
    role: "system",
    parts: [
      {
        type: "text",
        text: "Seu assistente de agendamentos está online.",
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
          "Olá! Sou o CutWave, seu assistente pessoal. 👋\n\n" +
          "Estou aqui para te ajudar a agendar seu corte ou barba. " +
          "Vou te guiar pelo processo:\n\n" +
          "1️⃣ Escolher a barbearia\n" +
          "2️⃣ Selecionar o serviço\n" +
          "3️⃣ Definir data e horário\n" +
          "4️⃣ Confirmar e pagar\n\n" +
          "Como posso te ajudar hoje? 😊",
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

  const { messages, setMessages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
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
                  "🎉 **Pagamento confirmado!**\n\n" +
                  "Seu agendamento foi realizado com sucesso. Obrigado por escolher o CutWave! ✂️\n\n" +
                  "📌 **Onde ver seus agendamentos:**\n" +
                  "1. Abra o **Menu**\n" +
                  "2. Toque em **Agendamentos**\n" +
                  "3. Veja **data, horário e status** do serviço\n\n" +
                  "Se quiser agendar outro serviço, é só me dizer! 😊",
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
                  "❌ Pagamento cancelado.\n\n" +
                  "Sem problemas! Se quiser, posso te ajudar a escolher outro dia ou horário. 😊",
              },
            ],
          },
        ]),
      );
    }

    router.replace("/chat", { scroll: false });
  }, [checkout, hasProcessedCheckout, router]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;

    sendMessage({ text });
    setInput("");
  };

  const isLoading = status === "streaming" || status === "submitted";

  const allMessages: UIMessage[] = uniqById([
    ...INITIAL_MESSAGES,
    ...messages,
    ...localMessages,
  ]);

  return (
    <div className="bg-background relative flex h-screen w-full flex-col overflow-hidden rounded-[20px]">
      {/* Header */}
      <div className="flex w-full items-center justify-between border-b pt-6 pr-5 pb-4 pl-5">
        <Link href="/">
          <ChevronLeft className="size-6 shrink-0" />
        </Link>
        <p className="font-merriweather text-foreground text-[20px] leading-[1.4] tracking-[-1px] italic">
          CutWave
        </p>
        <div className="w-6" />
      </div>

      {/* Messages */}
      <div className="w-full flex-1 overflow-y-auto pb-24 [&::-webkit-scrollbar]:hidden">
        {allMessages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} />
        ))}
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
