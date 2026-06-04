import { createUIMessageStream, createUIMessageStreamResponse } from "ai";

export const CHAT_API_MESSAGE_LIMIT = 12;

type ChatMessageLike = {
  role?: string;
  content?: unknown;
  parts?: Array<{ type?: string; text?: string; [key: string]: unknown }>;
};

export function getMessageText(message: ChatMessageLike): string {
  if (typeof message.content === "string") {
    return message.content.trim();
  }

  if (Array.isArray(message.parts)) {
    return message.parts
      .filter((p) => p.type === "text" && typeof p.text === "string")
      .map((p) => p.text)
      .join("")
      .trim();
  }

  return "";
}

export function sliceChatMessagesForApi<T extends ChatMessageLike>(
  messages: T[],
  limit = CHAT_API_MESSAGE_LIMIT,
): T[] {
  return messages
    .filter((m) => m.role === "user" || m.role === "assistant")
    .slice(-limit);
}

export type PendingBooking = {
  serviceId: string;
  date: string;
};

export function extractPendingBooking(
  messages: ChatMessageLike[],
): PendingBooking | null {
  let lastSlotQuery: {
    serviceId: string;
    date: string;
  } | null = null;
  let slotQueryIndex = -1;

  const conversation = messages.filter((m) => m.role !== "system");

  for (let i = 0; i < conversation.length; i++) {
    const msg = conversation[i];
    if (!Array.isArray(msg.parts)) continue;

    for (const part of msg.parts) {
      const partType = typeof part.type === "string" ? part.type : "";
      const toolName =
        partType === "dynamic-tool" && typeof part.toolName === "string"
          ? part.toolName
          : partType.startsWith("tool-")
            ? partType.slice("tool-".length)
            : null;

      if (toolName !== "getAvailableTimeSlotsForBarbershop") continue;

      const input = part.input as
        | { serviceId?: string; date?: string }
        | undefined;

      if (
        input &&
        typeof input.serviceId === "string" &&
        typeof input.date === "string"
      ) {
        lastSlotQuery = {
          serviceId: input.serviceId,
          date: input.date,
        };
        slotQueryIndex = i;
      }
    }
  }

  if (!lastSlotQuery) return null;

  const buildAppointment = (time: string) => {
    const appointment = new Date(`${lastSlotQuery!.date}T${time}:00`);
    if (Number.isNaN(appointment.getTime())) return null;
    return {
      serviceId: lastSlotQuery!.serviceId,
      date: appointment.toISOString(),
    };
  };

  const timePattern = /^(\d{1,2}):(\d{2})$/;

  for (let i = slotQueryIndex + 1; i < conversation.length; i++) {
    const msg = conversation[i];
    if (msg.role !== "user") continue;

    const match = getMessageText(msg).match(timePattern);
    if (!match) continue;

    const booking = buildAppointment(
      `${match[1].padStart(2, "0")}:${match[2]}`,
    );
    if (booking) return booking;
  }

  for (let i = conversation.length - 1; i >= 0; i--) {
    const msg = conversation[i];
    if (msg.role !== "assistant") continue;

    const text = getMessageText(msg);
    if (!text.includes("Please review your booking")) continue;

    const summaryTime = text.match(/\*\*Time:\*\*\s*(\d{1,2}:\d{2})/i);
    if (!summaryTime) continue;

    const booking = buildAppointment(summaryTime[1]);
    if (booking) return booking;
  }

  return null;
}

export function getLastUserText(messages: ChatMessageLike[]): string {
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  if (!lastUser) return "";
  return getMessageText(lastUser);
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
