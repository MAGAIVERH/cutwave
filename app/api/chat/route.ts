import { google } from "@ai-sdk/google";
import { convertToModelMessages, stepCountIs, streamText, tool } from "ai";
import { cookies } from "next/headers";
import z from "zod";

import {
  buildDateClarificationMessage,
  buildPastDateToolPayload,
  buildSmartDateAlternatives,
  checkoutUIMessageStreamResponse,
  errorUIMessageStreamResponse,
  extractPendingBooking,
  formatIsoDateUs,
  getAppBaseUrl,
  getChatTodayContext,
  getConfirmedDateFromMessages,
  getLastUserText,
  isAffirmativeReply,
  isConfirmCommand,
  isIsoDateBeforeToday,
  isLikelyDateMessage,
  isValidIsoDate,
  loginRequiredUIMessageStreamResponse,
  normalizeToolDateInput,
  parseIsoDateOnly,
  parseUserDateInput,
  sliceChatMessagesForApi,
  textUIMessageStreamResponse,
} from "@/lib/chat-utils";
import {
  getDayAvailability,
  validateBookingSlot,
} from "@/lib/booking-availability";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** gemini-2.0-flash free tier often hits quota limit:0; 2.5-flash works on the same key */
const CHAT_MODEL =
  process.env.GOOGLE_GENERATIVE_AI_MODEL ?? "gemini-2.5-flash";

export const maxDuration = 60;

async function fetchJson(url: string, options?: RequestInit) {
  const res = await fetch(url, options);
  if (!res.ok) {
    const text = await res.text();
    try {
      const json = JSON.parse(text) as { error?: string; message?: string };
      throw new Error(
        json.message || json.error || text || "Request failed",
      );
    } catch (error) {
      if (error instanceof Error && error.message !== text) {
        throw error;
      }
      throw new Error(text || "Request failed");
    }
  }
  return res.json();
}

function filterChatMessages(messages: unknown[]): unknown[] {
  if (!Array.isArray(messages)) return [];
  return messages.filter(
    (m) =>
      m &&
      typeof m === "object" &&
      (m as { role?: string }).role !== "system",
  );
}

export const POST = async (request: Request) => {
  try {
    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      return errorUIMessageStreamResponse(
        "Chat is not configured. Set GOOGLE_GENERATIVE_AI_API_KEY in your environment.",
      );
    }

    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.id) {
      return loginRequiredUIMessageStreamResponse();
    }

    const body = await request.json();
    const messages = sliceChatMessagesForApi(
      filterChatMessages(body.messages ?? []) as Parameters<
        typeof sliceChatMessagesForApi
      >[0],
    );
    const baseUrl = getAppBaseUrl(request);
    const userText = getLastUserText(
      messages as Parameters<typeof getLastUserText>[0],
    );

    if (isConfirmCommand(userText)) {
      const cookieStore = await cookies();
      const booking = extractPendingBooking(messages);

      if (!booking) {
        return errorUIMessageStreamResponse(
          "I could not find your booking details. Please choose barbershop, service, date, and time, then type confirm again.",
        );
      }

      const slotCheck = await validateBookingSlot(prisma, {
        userId: session.user.id,
        serviceId: booking.serviceId,
        appointmentDate: new Date(booking.date),
      });

      if (!slotCheck.ok) {
        return errorUIMessageStreamResponse(slotCheck.userMessage);
      }

      try {
        const response = await fetchJson(
          `${baseUrl}/api/stripe/create-booking-checkout-session`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              cookie: cookieStore.toString(),
            },
            body: JSON.stringify({
              origin: "chat",
              serviceId: booking.serviceId,
              date: booking.date,
            }),
          },
        );

        return checkoutUIMessageStreamResponse(response.url);
      } catch (error) {
        console.error("Checkout error:", error);
        const message =
          error instanceof Error ? error.message : String(error);

        if (message.includes("Unauthorized") || message.includes("401")) {
          return loginRequiredUIMessageStreamResponse();
        }

        return errorUIMessageStreamResponse(
          "Sorry, we could not start checkout. Please try again or contact support.",
        );
      }
    }

    const { today, isoDate, todayUs } = getChatTodayContext();

    if (isLikelyDateMessage(userText)) {
      const parsedUserDate = parseUserDateInput(userText);
      if (parsedUserDate && isIsoDateBeforeToday(parsedUserDate, isoDate)) {
        const clarification = buildDateClarificationMessage(
          parsedUserDate,
          isoDate,
        );
        if (clarification) {
          return textUIMessageStreamResponse(clarification);
        }
      }
    }

    const confirmedDate = isAffirmativeReply(userText)
      ? getConfirmedDateFromMessages(
          messages as Parameters<typeof getConfirmedDateFromMessages>[0],
        )
      : null;

    const userDateContext = confirmedDate
      ? `
USER CONFIRMED DATE: ${confirmedDate} (${formatIsoDateUs(confirmedDate)})
Call getAvailableTimeSlotsForBarbershop with date=${confirmedDate} immediately, then list available times.
`
      : isLikelyDateMessage(userText)
        ? (() => {
            const parsed = parseUserDateInput(userText);
            if (!parsed) return "";
            const alt = buildSmartDateAlternatives(parsed, isoDate);
            return `
USER DATE INPUT (parsed): ${parsed} (${formatIsoDateUs(parsed)})
Status: ${isIsoDateBeforeToday(parsed, isoDate) ? "PAST — do not book this date" : "VALID"}
${alt.likelyIntent ? `Recommended match: ${alt.likelyIntent.iso} (${alt.likelyIntent.label}) — ${alt.likelyIntent.note}` : ""}
${alt.assistantHint}
`;
          })()
        : "";

    const result = streamText({
      model: google(CHAT_MODEL),
      stopWhen: stepCountIs(12),

      system: `
You are CutWave Assistant, a virtual barbershop booking assistant.

TODAY: ${today}
TODAY (ISO): ${isoDate}
TODAY (US): ${todayUs}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DATE RULES (CRITICAL)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- TODAY (${isoDate}) is the only source of truth for "today".
- Accept natural language dates (e.g. "may 10, 2026") and normalize to YYYY-MM-DD before tools.
- If the user gives a past date, ALWAYS:
  1. Repeat the date they asked for (e.g. May 10).
  2. Offer the same day number in the current month first (e.g. June 10 if they said May 10).
  3. Ask "Did you mean [recommended date]?" — do NOT only list unrelated dates.
- When the user replies "yes" to a date clarification, use the recommended ISO date and call getAvailableTimeSlotsForBarbershop.
- Use tool suggestedDates; prioritize entries with recommended: true.
${userDateContext}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
LANGUAGE (CRITICAL)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- Always respond in English only.
- Do not use Portuguese, Spanish, or mixed language.
- If the user writes in another language, understand it but reply in English.
- Use US date format (MM/DD/YYYY) and USD ($) in summaries and prices.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CRITICAL RULES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

YOU MUST NEVER:
- Confirm a booking
- Say "booking confirmed" or "all set"
- Create payment links
- Mention that the process is complete

YOUR ROLE:
- Help the user choose: barbershop, service, date, time slot
- Show the confirmation summary
- STOP and wait for the user to type "confirm"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CONVERSATION FLOW
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Keep internal state:
- selectedBarbershop: { id, name, address }
- selectedService: { id, name, price }
- selectedDate: YYYY-MM-DD
- selectedTime: HH:MM

Required order:
1. Ask which barbershop → use searchBarbershops
2. Ask which service
3. Ask which date
4. Show available slots → use getAvailableTimeSlotsForBarbershop
5. User picks a time
6. SHOW SUMMARY (see below)
7. STOP and wait

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CONFIRMATION SUMMARY (COPY EXACTLY)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

When the user has chosen everything, show exactly:

━━━━━━━━━━━━━━━━━━━━
🧾 **Please review your booking:**

✅ **Confirm your appointment**

🏪 **Barbershop:** [name]
📍 **Address:** [full address]
💈 **Service:** [service name]
📅 **Date:** [MM/DD/YYYY]
🕐 **Time:** [HH:MM]
💰 **Price:** $[price]

Type **confirm** to proceed to payment or **no** to change something.
━━━━━━━━━━━━━━━━━━━━

After this summary:
- Do not add anything else
- Do not say "confirmed"
- Do not create buttons or links
- Only wait for the user

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
AVAILABILITY RULES (CRITICAL)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- NEVER invent time slots. Only show times returned by tools.
- ALWAYS call getAvailableTimeSlotsForBarbershop after barbershop, service, and date are known.
- If fullyBooked is true, say the barbershop has no openings that day and ask for another date.
- If a time has USER_BOOKING_CONFLICT, explain the user already has another appointment at that time (another barbershop) — they cannot book two places at the same date and time.
- If a time has TIME_SLOT_UNAVAILABLE, that slot is taken at this barbershop — pick another time from availableTimeSlots.
- Before showing the booking summary, call validateSelectedBookingSlot with the exact date and time.
- If validateSelectedBookingSlot returns available: false, do NOT show the payment summary; help the user pick another slot.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TOOLS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- searchBarbershops: find barbershops in the database
- getAvailableTimeSlotsForBarbershop: real availability (includes user conflicts at other barbershops)
- validateSelectedBookingSlot: verify barbershop + service + date + time before the summary

Always show real options from the database.
When calling getAvailableTimeSlotsForBarbershop, use exact serviceId values from searchBarbershops results.
`,

      messages: convertToModelMessages(
        messages as Parameters<typeof convertToModelMessages>[0],
      ),

      tools: {
      searchBarbershops: tool({
        description: "Search barbershops in the database",
        inputSchema: z.object({
          name: z.string().optional().describe("Barbershop name (optional)"),
        }),
        execute: async ({ name }) => {
          const data = await prisma.barbershop.findMany({
            where: name
              ? { name: { contains: name, mode: "insensitive" } }
              : {},
            include: { services: true },
            take: 5,
          });

          return {
            barbershops: data.map((b: (typeof data)[number]) => ({
              barbershopId: b.id,
              name: b.name,
              address: b.address,
              services: b.services.map((s: (typeof b.services)[number]) => ({
                id: s.id,
                name: s.name,
                price: `$${(s.priceInCents / 100).toFixed(2)}`,
              })),
            })),
          };
        },
      }),

      getAvailableTimeSlotsForBarbershop: tool({
        description: "Get available booking time slots",
        inputSchema: z.object({
          barbershopId: z.string().describe("Barbershop ID"),
          serviceId: z.string().describe("Service ID"),
          date: z.string().describe("Date in YYYY-MM-DD format"),
        }),
        execute: async ({ barbershopId, serviceId, date }) => {
          try {
            const normalizedDate = normalizeToolDateInput(date, userText);
            const resolvedDate = isValidIsoDate(normalizedDate)
              ? normalizedDate
              : parseUserDateInput(normalizedDate) ?? normalizedDate;

            if (!isValidIsoDate(resolvedDate)) {
              return {
                error: "INVALID_DATE_FORMAT",
                message:
                  'I could not read that date. Try "June 10, 2026" or 2026-06-10.',
                today: isoDate,
                todayFormatted: todayUs,
                examples: ["2026-06-10", "june 10 2026"],
              };
            }

            if (isIsoDateBeforeToday(resolvedDate, isoDate)) {
              return buildPastDateToolPayload(resolvedDate, isoDate);
            }

            const parsed = parseIsoDateOnly(resolvedDate);
            if (!parsed) {
              return {
                error: "INVALID_DATE",
                message: "Could not parse the date. Use YYYY-MM-DD format.",
              };
            }

            const availability = await getDayAvailability(prisma, {
              userId: session.user.id,
              barbershopId,
              serviceId,
              dateIso: resolvedDate,
            });

            return {
              ...availability,
              availableTimeSlots:
                availability.availableTimeSlots.length > 0
                  ? availability.availableTimeSlots
                  : ["No time slots available on this date"],
            };
          } catch (error) {
            console.error("Time slots error:", error);
            return {
              availableTimeSlots: ["Could not check availability"],
              error: "AVAILABILITY_CHECK_FAILED",
            };
          }
        },
      }),

      validateSelectedBookingSlot: tool({
        description:
          "Validate barbershop, service, date and time before showing the booking summary",
        inputSchema: z.object({
          barbershopId: z.string(),
          serviceId: z.string(),
          date: z.string().describe("Date YYYY-MM-DD"),
          time: z.string().describe("Time HH:MM"),
        }),
        execute: async ({ barbershopId, serviceId, date, time }) => {
          const normalizedDate = normalizeToolDateInput(date, userText);
          const dateIso = isValidIsoDate(normalizedDate)
            ? normalizedDate
            : parseUserDateInput(normalizedDate);

          const timeMatch = time.trim().match(/^(\d{1,2}):(\d{2})$/);

          if (!dateIso || !isValidIsoDate(dateIso) || !timeMatch) {
            return {
              available: false,
              error: "INVALID_INPUT",
              message: "Use date YYYY-MM-DD and time HH:MM (example: 10:00).",
            };
          }

          const hours = Number(timeMatch[1]);
          const minutes = Number(timeMatch[2]);
          const slot = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;

          const dayAvailability = await getDayAvailability(prisma, {
            userId: session.user.id,
            barbershopId,
            serviceId,
            dateIso,
          });

          const appointmentDay = parseIsoDateOnly(dateIso)!;
          appointmentDay.setHours(hours, minutes, 0, 0);

          if (!dayAvailability.availableTimeSlots.includes(slot)) {
            const blocked = dayAvailability.unavailableSlots.find(
              (s) => s.time === slot,
            );

            if (blocked?.reason === "USER_BOOKING_CONFLICT") {
              return {
                available: false,
                error: "USER_BOOKING_CONFLICT",
                message:
                  `You already have an appointment at **${slot}** at **${blocked.existingBarbershop}** (${blocked.existingService}). Choose another time.`,
                availableTimeSlots: dayAvailability.availableTimeSlots,
              };
            }

            return {
              available: false,
              error: blocked?.reason ?? "TIME_SLOT_UNAVAILABLE",
              message:
                `**${slot}** is not available on ${dayAvailability.dateFormatted}. Pick one of: ${dayAvailability.availableTimeSlots.join(", ") || "none — try another date"}.`,
              availableTimeSlots: dayAvailability.availableTimeSlots,
            };
          }

          const validation = await validateBookingSlot(prisma, {
            userId: session.user.id,
            serviceId,
            appointmentDate: appointmentDay,
          });

          if (!validation.ok) {
            return {
              available: false,
              error: validation.error,
              message: validation.userMessage,
              availableTimeSlots: dayAvailability.availableTimeSlots,
            };
          }

          return {
            available: true,
            message: `Slot ${slot} on ${dayAvailability.dateFormatted} is available. You may show the booking summary.`,
            date: dayAvailability.date,
            time: slot,
          };
        },
      }),
      },
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error("Chat route error:", error);
    const message =
      error instanceof Error ? error.message : "Unexpected chat error";
    return errorUIMessageStreamResponse(
      message.includes("quota") || message.includes("Quota")
        ? "AI quota exceeded. Try again in a minute or switch GOOGLE_GENERATIVE_AI_MODEL to gemini-2.5-flash in .env."
        : `Chat error: ${message}`,
    );
  }
};
