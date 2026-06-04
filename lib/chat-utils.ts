import { createUIMessageStream, createUIMessageStreamResponse } from "ai";

export const CHAT_API_MESSAGE_LIMIT = 12;

/** Local calendar date as YYYY-MM-DD (avoids UTC off-by-one from toISOString). */
export function getTodayIsoDate(reference = new Date()): string {
  const y = reference.getFullYear();
  const m = String(reference.getMonth() + 1).padStart(2, "0");
  const d = String(reference.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parseIsoDateOnly(iso: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!match) return null;

  const date = new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
  );

  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatIsoDateUs(iso: string): string {
  const parsed = parseIsoDateOnly(iso);
  if (!parsed) return iso;

  return parsed.toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  });
}

export function isIsoDateBeforeToday(iso: string, todayIso = getTodayIsoDate()): boolean {
  return iso < todayIso;
}

export function isValidIsoDate(iso: string): boolean {
  return parseIsoDateOnly(iso) !== null;
}

export function suggestUpcomingIsoDates(
  count = 5,
  reference = new Date(),
): string[] {
  const dates: string[] = [];
  const cursor = parseIsoDateOnly(getTodayIsoDate(reference));
  if (!cursor) return dates;

  for (let i = 1; dates.length < count; i++) {
    const next = new Date(cursor);
    next.setDate(cursor.getDate() + i);
    dates.push(getTodayIsoDate(next));
  }

  return dates;
}

const MONTH_BY_NAME: Record<string, number> = {
  january: 1,
  jan: 1,
  february: 2,
  feb: 2,
  march: 3,
  mar: 3,
  april: 4,
  apr: 4,
  may: 5,
  june: 6,
  jun: 6,
  july: 7,
  jul: 7,
  august: 8,
  aug: 8,
  september: 9,
  sep: 9,
  sept: 9,
  october: 10,
  oct: 10,
  november: 11,
  nov: 11,
  december: 12,
  dec: 12,
  janeiro: 1,
  fevereiro: 2,
  marco: 3,
  março: 3,
  abril: 4,
  maio: 5,
  junho: 6,
  julho: 7,
  agosto: 8,
  setembro: 9,
  outubro: 10,
  novembro: 11,
  dezembro: 12,
};

const MONTH_LABELS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function toIsoDate(year: number, month: number, day: number): string | null {
  const iso = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  return isValidIsoDate(iso) ? iso : null;
}

function monthLabel(month: number): string {
  return MONTH_LABELS[month - 1] ?? String(month);
}

/** Parse natural language or numeric date inputs into YYYY-MM-DD. */
export function parseUserDateInput(
  text: string,
  reference = new Date(),
): string | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (isoMatch) return toIsoDate(Number(isoMatch[1]), Number(isoMatch[2]), Number(isoMatch[3]));

  const normalized = trimmed
    .toLowerCase()
    .replace(/,/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const namedMonthFirst =
    /^([a-zçáéíóúãõ]+)\s+(\d{1,2})(?:st|nd|rd|th)?(?:\s+(\d{4}))?$/.exec(
      normalized,
    );
  if (namedMonthFirst) {
    const month = MONTH_BY_NAME[namedMonthFirst[1]];
    if (month) {
      const year = namedMonthFirst[3]
        ? Number(namedMonthFirst[3])
        : reference.getFullYear();
      return toIsoDate(year, month, Number(namedMonthFirst[2]));
    }
  }

  const namedDayFirst =
    /^(\d{1,2})(?:st|nd|rd|th)?\s+(?:de\s+)?([a-zçáéíóúãõ]+)(?:\s+(?:de\s+)?(\d{4}))?$/.exec(
      normalized,
    );
  if (namedDayFirst) {
    const month = MONTH_BY_NAME[namedDayFirst[2]];
    if (month) {
      const year = namedDayFirst[3]
        ? Number(namedDayFirst[3])
        : reference.getFullYear();
      return toIsoDate(year, month, Number(namedDayFirst[1]));
    }
  }

  const slashMatch = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(normalized);
  if (slashMatch) {
    const a = Number(slashMatch[1]);
    const b = Number(slashMatch[2]);
    const year = Number(slashMatch[3]);
    // US format MM/DD/YYYY when ambiguous
    const month = a > 12 ? b : a;
    const day = a > 12 ? a : b;
    return toIsoDate(year, month, day);
  }

  return null;
}

export function isLikelyDateMessage(text: string): boolean {
  return parseUserDateInput(text) !== null;
}

export function isAffirmativeReply(text: string): boolean {
  const normalized = text.trim().toLowerCase();
  return ["yes", "yep", "yeah", "y", "ok", "okay", "sure", "correct", "sim"].includes(
    normalized,
  );
}

export function extractSuggestedIsoFromAssistant(text: string): string | null {
  const match = text.match(/`(\d{4}-\d{2}-\d{2})`/);
  return match?.[1] ?? null;
}

export function getConfirmedDateFromMessages(
  messages: ChatMessageLike[],
): string | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg.role !== "assistant") continue;

    const iso = extractSuggestedIsoFromAssistant(getMessageText(msg));
    if (iso) return iso;
  }

  return null;
}

export type DateOption = {
  iso: string;
  label: string;
  note: string;
  recommended?: boolean;
};

export type SmartDateAlternatives = {
  requestedIso: string;
  requestedLabel: string;
  requestedMonthName: string;
  todayIso: string;
  todayLabel: string;
  likelyIntent: DateOption | null;
  options: DateOption[];
  assistantHint: string;
};

export function buildSmartDateAlternatives(
  requestedIso: string,
  todayIso = getTodayIsoDate(),
): SmartDateAlternatives {
  const requested = parseIsoDateOnly(requestedIso);
  const today = parseIsoDateOnly(todayIso);
  const requestedLabel = formatIsoDateUs(requestedIso);
  const todayLabel = formatIsoDateUs(todayIso);

  if (!requested || !today) {
    return {
      requestedIso,
      requestedLabel,
      requestedMonthName: "",
      todayIso,
      todayLabel,
      likelyIntent: null,
      options: suggestUpcomingIsoDates(5, today ?? new Date()).map((iso, i) => ({
        iso,
        label: formatIsoDateUs(iso),
        note: i === 0 ? "Tomorrow" : "Upcoming day",
      })),
      assistantHint: "Ask the user to pick one of the suggested dates.",
    };
  }

  const day = requested.getDate();
  const year = today.getFullYear();
  const requestedMonth = requested.getMonth() + 1;
  const currentMonth = today.getMonth() + 1;
  const options: DateOption[] = [];
  const seen = new Set<string>();

  const pushOption = (option: DateOption) => {
    if (seen.has(option.iso)) return;
    seen.add(option.iso);
    options.push(option);
  };

  const sameDayCurrentMonth = toIsoDate(year, currentMonth, day);
  if (
    sameDayCurrentMonth &&
    !isIsoDateBeforeToday(sameDayCurrentMonth, todayIso)
  ) {
    const note =
      requestedMonth !== currentMonth
        ? `Same day (${day}) in ${monthLabel(currentMonth)} — you may have meant this instead of ${monthLabel(requestedMonth)}`
        : `Same day (${day}) this month`;

    pushOption({
      iso: sameDayCurrentMonth,
      label: formatIsoDateUs(sameDayCurrentMonth),
      note,
      recommended: true,
    });
  }

  let nextMonth = currentMonth + 1;
  let nextYear = year;
  if (nextMonth > 12) {
    nextMonth = 1;
    nextYear += 1;
  }

  const sameDayNextMonth = toIsoDate(nextYear, nextMonth, day);
  if (
    sameDayNextMonth &&
    !isIsoDateBeforeToday(sameDayNextMonth, todayIso) &&
    sameDayNextMonth !== sameDayCurrentMonth
  ) {
    pushOption({
      iso: sameDayNextMonth,
      label: formatIsoDateUs(sameDayNextMonth),
      note: `Same day (${day}) in ${monthLabel(nextMonth)}`,
    });
  }

  if (isIsoDateBeforeToday(requestedIso, todayIso)) {
    pushOption({
      iso: requestedIso,
      label: requestedLabel,
      note: `Your request (${monthLabel(requestedMonth)} ${day}) — not available because it is in the past`,
    });
  }

  for (const [i, iso] of suggestUpcomingIsoDates(3, today).entries()) {
    pushOption({
      iso,
      label: formatIsoDateUs(iso),
      note: i === 0 ? "Tomorrow" : "Nearby date",
    });
  }

  const likelyIntent = options.find((o) => o.recommended) ?? options[0] ?? null;

  let assistantHint =
    "Acknowledge the exact date the user asked for, explain why it cannot be booked, then offer the options below starting with the recommended one.";

  if (likelyIntent?.recommended) {
    assistantHint = `The user asked for ${requestedLabel} (past). Lead with the recommended match ${likelyIntent.label} and ask: "Did you mean ${likelyIntent.label}?" Tell them to reply with that ISO date (${likelyIntent.iso}) to continue.`;
  }

  return {
    requestedIso,
    requestedLabel,
    requestedMonthName: monthLabel(requestedMonth),
    todayIso,
    todayLabel,
    likelyIntent,
    options,
    assistantHint,
  };
}

export function normalizeToolDateInput(
  date: string,
  userHint?: string,
): string {
  if (isValidIsoDate(date)) return date;

  const fromTool = parseUserDateInput(date);
  if (fromTool) return fromTool;

  if (userHint) {
    const fromHint = parseUserDateInput(userHint);
    if (fromHint) return fromHint;
  }

  return date;
}

export function buildPastDateToolPayload(
  requestedIso: string,
  todayIso = getTodayIsoDate(),
) {
  const alt = buildSmartDateAlternatives(requestedIso, todayIso);

  return {
    error: "PAST_DATE" as const,
    message: `${alt.requestedLabel} is before today (${alt.todayLabel}).`,
    requestedDate: alt.requestedIso,
    requestedDateFormatted: alt.requestedLabel,
    today: alt.todayIso,
    todayFormatted: alt.todayLabel,
    likelyIntent: alt.likelyIntent,
    suggestedDates: alt.options,
    assistantHint: alt.assistantHint,
  };
}

export function buildDateClarificationMessage(
  requestedIso: string,
  todayIso = getTodayIsoDate(),
): string | null {
  if (!isIsoDateBeforeToday(requestedIso, todayIso)) return null;

  const alt = buildSmartDateAlternatives(requestedIso, todayIso);
  const lines = [
    `You asked for **${alt.requestedLabel}**, which is before today (**${alt.todayLabel}**).`,
  ];

  if (alt.likelyIntent?.recommended) {
    lines.push(
      "",
      `Did you mean **${alt.likelyIntent.label}**? (${alt.likelyIntent.note})`,
      "",
      `Reply **yes** or send \`${alt.likelyIntent.iso}\` and I'll show available times.`,
    );
    return lines.join("\n");
  }

  lines.push("", "Please pick one of these dates:");
  for (const option of alt.options.filter((o) => !o.note.includes("not available"))) {
    lines.push(`- **${option.label}** (\`${option.iso}\`) — ${option.note}`);
  }

  return lines.join("\n");
}

export function getChatTodayContext(reference = new Date()) {
  const isoDate = getTodayIsoDate(reference);
  const today = reference.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return { isoDate, today, todayUs: formatIsoDateUs(isoDate) };
}

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
    const base = parseIsoDateOnly(lastSlotQuery!.date);
    if (!base) return null;

    const [hours, minutes] = time.split(":").map(Number);
    base.setHours(hours, minutes, 0, 0);
    const appointment = base;
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

export function loginRequiredUIMessageStreamResponse() {
  const payload = JSON.stringify({ type: "login-required" });
  const textId = `login-required-${Date.now()}`;

  const stream = createUIMessageStream({
    execute: ({ writer }) => {
      writer.write({ type: "text-start", id: textId });
      writer.write({ type: "text-delta", id: textId, delta: payload });
      writer.write({ type: "text-end", id: textId });
    },
  });

  return createUIMessageStreamResponse({ stream });
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

export function textUIMessageStreamResponse(message: string) {
  const textId = `text-${Date.now()}`;

  const stream = createUIMessageStream({
    execute: ({ writer }) => {
      writer.write({ type: "text-start", id: textId });
      writer.write({ type: "text-delta", id: textId, delta: message });
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
