"use client";

import { Button } from "@/components/ui/button";
import type { UIMessage } from "ai";
import { Bot } from "lucide-react";
import { Streamdown } from "streamdown";

interface ChatMessageProps {
  message: UIMessage;
  isStreaming?: boolean;
}

export const ChatMessage = ({
  message,
  isStreaming = false,
}: ChatMessageProps) => {
  const isUser = message.role === "user";
  const isSystem = message.role === "system";

  /**
   * Extrai texto com segurança de qualquer UIMessagePart
   * (compatível com ai-sdk novo)
   */
  const content = message.parts
    .map((part) => {
      if (part.type === "text" && "text" in part) {
        return String(part.text);
      }
      return "";
    })
    .join("");

  // 🔍 tenta extrair checkoutUrl se a IA retornou JSON
  let checkoutUrl: string | null = null;

  try {
    const parsed = JSON.parse(content);
    if (parsed?.checkoutUrl && typeof parsed.checkoutUrl === "string") {
      checkoutUrl = parsed.checkoutUrl;
    }
  } catch {
    // não é JSON, segue normal
  }

  if (isSystem) {
    return (
      <div className="flex w-full flex-col gap-3 px-5 pt-6 pb-0">
        <div className="border-border flex w-full flex-col gap-2.5 rounded-xl border p-3">
          <p className="text-muted-foreground text-center text-sm leading-[1.4]">
            {content}
          </p>
        </div>
      </div>
    );
  }

  if (isUser) {
    return (
      <div className="flex w-full flex-col items-end gap-3 pt-6 pr-5 pb-0 pl-10">
        <div className="bg-primary max-w-[calc(100%-40px)] rounded-full px-4 py-3">
          <p className="text-foreground text-sm leading-[1.4] wrap-break-word">
            {content}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-3 pt-6 pr-14 pb-0 pl-3">
      <div className="flex w-full gap-2">
        <div className="border-border flex size-8 shrink-0 items-center justify-center rounded-full border bg-[rgba(48,92,58,0.12)]">
          <Bot className="text-primary size-3.5" />
        </div>

        <div className="text-foreground max-w-full text-sm leading-[1.4] wrap-break-word">
          {/* Texto normal */}
          {!checkoutUrl && <Streamdown>{content}</Streamdown>}

          {/* 💳 Checkout */}
          {checkoutUrl && (
            <div className="flex flex-col gap-3">
              <p>
                Perfeito! Para concluir o agendamento, finalize o pagamento
                abaixo:
              </p>

              <Button
                className="w-fit rounded-3xl"
                onClick={() => {
                  localStorage.setItem("chatCheckout", "true");
                  window.location.href = checkoutUrl;
                }}
              >
                Pagar agora
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
