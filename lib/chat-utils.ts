import { createUIMessageStream, createUIMessageStreamResponse } from "ai";

type ChatMessageLike = {
  role?: string;
  content?: unknown;
  parts?: Array<{ type?: string; text?: string }>;
};

export function getLastUserText(messages: ChatMessageLike[]): string {
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  if (!lastUser) return "";

  if (typeof lastUser.content === "string") {
    return lastUser.content.trim();
  }

  if (Array.isArray(lastUser.parts)) {
    return lastUser.parts
      .filter((p) => p.type === "text" && typeof p.text === "string")
      .map((p) => p.text)
      .join("")
      .trim();
  }

  return "";
}

export function isConfirmCommand(text: string): boolean {
  const normalized = text.trim().toLowerCase();
  return normalized === "confirm" || normalized === "confirmar";
}

export function checkoutUIMessageStreamResponse(checkoutUrl: string) {
  const payload = JSON.stringify({ type: "checkout", checkoutUrl });
  const textId = `checkout-text-${Date.now()}`;

  const stream = createUIMessageStream({
    execute: ({ writer }) => {
      writer.write({ type: "text-start", id: textId });
      writer.write({ type: "text-delta", id: textId, delta: payload });
      writer.write({ type: "text-end", id: textId });
    },
  });

  return createUIMessageStreamResponse({ stream });
}

export function errorUIMessageStreamResponse(message: string) {
  const textId = `error-text-${Date.now()}`;

  const stream = createUIMessageStream({
    execute: ({ writer }) => {
      writer.write({ type: "text-start", id: textId });
      writer.write({ type: "text-delta", id: textId, delta: message });
      writer.write({ type: "text-end", id: textId });
    },
  });

  return createUIMessageStreamResponse({ stream });
}

export function getAppBaseUrl(request: Request): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    new URL(request.url).origin
  );
}
