"use client";

import type { UIMessage } from "ai";
import { Bot } from "lucide-react";
import { Streamdown } from "streamdown";

import { Button } from "@/components/ui/button";

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

  const contentFromParts = message.parts
    .map((part) => {
      if (part.type === "text" && "text" in part) {
        return String(part.text);
      }
      return "";
    })
    .join("");

  const legacyContent =
    "content" in message && typeof message.content === "string"
      ? message.content
      : "";

  const content = contentFromParts || legacyContent;

  // 🔍 Tenta detectar se é um checkout
  let checkoutData: { type: string; checkoutUrl: string } | null = null;

  try {
    const parsed = JSON.parse(content);
    if (
      parsed?.type === "checkout" &&
      parsed?.checkoutUrl &&
      typeof parsed.checkoutUrl === "string"
    ) {
      checkoutData = parsed;
    }
  } catch {
    // Não é JSON, renderiza texto normal
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

  // Mensagem do assistente
  return (
    <div className="flex w-full flex-col gap-3 pt-6 pr-14 pb-0 pl-3">
      <div className="flex w-full gap-2">
        <div className="border-border flex size-8 shrink-0 items-center justify-center rounded-full border bg-[rgba(48,92,58,0.12)]">
          <Bot className="text-primary size-3.5" />
        </div>

        <div className="text-foreground max-w-full text-sm leading-[1.4] wrap-break-word">
          {/* 💳 Botão de Checkout */}
          {checkoutData && (
            <div className="flex flex-col gap-3">
              <p className="font-medium">
                ✅ All set! Ready to complete your booking.
              </p>
              <p className="text-muted-foreground text-sm">
                Click the button below to proceed to secure payment:
              </p>

              <Button
                className="w-fit rounded-full px-6"
                size="lg"
                onClick={() => {
                  // Salva que veio do chat
                  sessionStorage.setItem("fromChat", "true");
                  window.location.href = checkoutData.checkoutUrl;
                }}
              >
                💳 Pay now
              </Button>
            </div>
          )}

          {/* 📝 Texto normal */}
          {!checkoutData && <Streamdown>{content}</Streamdown>}
        </div>
      </div>
    </div>
  );
};
