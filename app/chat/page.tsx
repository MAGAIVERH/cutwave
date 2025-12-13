"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import type { UIMessage } from "ai";
import { ChatMessage } from "./components/chat-message";
import { ChatInput } from "./components/chat-input";

const STORAGE_KEY = "cutwave.chat.v1";

const INITIAL_MESSAGES: UIMessage[] = [
  {
    id: "system-welcome",
    role: "system",
    parts: [{ type: "text", text: "Seu assistente de agendamentos está online." }],
  },
  {
    id: "assistant-welcome",
    role: "assistant",
    parts: [
      {
        type: "text",
        text:
          "Olá! Sou o CutWave, seu assistente pessoal.\n\n" +
          "Estou aqui para te auxiliar a agendar seu corte ou barba, " +
          "encontrar as barbearias disponíveis perto de você e responder às suas dúvidas.",
      },
    ],
  },
];

function safeParseMessages(value: string | null): UIMessage[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    // validação mínima
    return parsed.filter((m) => m && typeof m === "object" && typeof m.id === "string");
  } catch {
    return [];
  }
}

function uniqById(items: UIMessage[]) {
  const map = new Map<string, UIMessage>();
  for (const item of items) map.set(item.id, item);
  return Array.from(map.values());
}

export default function ChatPage() {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const searchParams = useSearchParams();
  const router = useRouter();
  const checkout = searchParams.get("checkout");

  // ✅ Mensagens locais (pós-checkout etc.)
  const [localMessages, setLocalMessages] = useState<UIMessage[]>([]);

  // ✅ Carrega histórico persistido 1 vez
  const persistedMessages = useMemo<UIMessage[]>(() => {
    if (typeof window === "undefined") return [];
    return safeParseMessages(window.localStorage.getItem(STORAGE_KEY));
  }, []);

  const {
    messages,
    setMessages, // ✅ importante para reidratar o useChat
    sendMessage,
    status,
  } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });

  // ✅ Reidratação do useChat (sem initialMessages)
  useEffect(() => {
    // Só reidrata se o hook ainda estiver vazio
    if (messages.length === 0 && persistedMessages.length > 0) {
      setMessages(persistedMessages);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ Scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, localMessages]);

  // ✅ Persistência REAL: salva a conversa do useChat + localMessages
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Importante: NÃO salvar INITIAL_MESSAGES (são fixas)
    const merged = uniqById([...messages, ...localMessages]);

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  }, [messages, localMessages]);

  // ✅ Mensagem pós-checkout (sem resetar conversa)
  useEffect(() => {
    if (!checkout) return;

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
                  "🎉 Pagamento confirmado!\n\n" +
                  "Seu agendamento foi realizado com sucesso. Obrigado por escolher o CutWave ✂️\n\n" +
                  "📌 Onde ver seus agendamentos:\n" +
                  "1) Abra o **Menu**\n" +
                  "2) Toque em **Agendamentos**\n" +
                  "3) Veja **data, horário e status** do serviço\n\n" +
                  "Se quiser agendar outro serviço, é só me dizer 😊",
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
                  "Pagamento cancelado.\n\n" +
                  "Se quiser, posso te ajudar a escolher outro dia/horário 😊",
              },
            ],
          },
        ]),
      );
    }

    // limpa a URL (mas NÃO limpa histórico)
    router.replace("/chat");
  }, [checkout, router]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;

    sendMessage({ text });
    setInput("");
  };

  const isLoading = status === "streaming" || status === "submitted";

  // ✅ Render final (fixo + local + chat)
  const allMessages: UIMessage[] = [
    ...INITIAL_MESSAGES,
    ...localMessages,
    ...messages,
  ];

  return (
    <div className="bg-background relative flex h-screen w-full flex-col overflow-hidden rounded-[20px]">
      {/* Header */}
      <div className="flex w-[390px] items-center justify-between pt-6 pr-5 pb-0 pl-5">
        <Link href="/">
          <ChevronLeft className="size-6 shrink-0" />
        </Link>

        <p className="font-merriweather text-foreground text-[20px] leading-[1.4] tracking-[-1px] text-nowrap whitespace-pre italic">
          CutWave
        </p>

        <div className="flex items-center justify-end gap-[15px]" />
      </div>

      {/* Messages */}
      <div className="w-full flex-1 overflow-y-auto pb-24 [&::-webkit-scrollbar]:hidden">
        {allMessages.map((msg, index) => (
          <ChatMessage
            key={msg.id}
            message={msg}
            isStreaming={
              status === "streaming" &&
              index === allMessages.length - 1 &&
              msg.role === "assistant"
            }
          />
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
