import { google } from "@ai-sdk/google";
import { convertToModelMessages, stepCountIs, streamText, tool } from "ai";
import { cookies } from "next/headers";
import z from "zod";

import {
  checkoutUIMessageStreamResponse,
  errorUIMessageStreamResponse,
  extractPendingBooking,
  getAppBaseUrl,
  getLastUserText,
  isConfirmCommand,
  sliceChatMessagesForApi,
} from "@/lib/chat-utils";
import { prisma } from "@/lib/prisma";

/** gemini-2.0-flash free tier often hits quota limit:0; 2.5-flash works on the same key */
const CHAT_MODEL =
  process.env.GOOGLE_GENERATIVE_AI_MODEL ?? "gemini-2.5-flash";

export const maxDuration = 60;

async function fetchJson(url: string, options?: RequestInit) {
  const res = await fetch(url, options);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Request failed");
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

        return errorUIMessageStreamResponse(
          "Sorry, we could not start checkout. Please try again or contact support.",
        );
      }
    }

    const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
    const isoDate = new Date().toISOString().split("T")[0];

    const result = streamText({
      model: google(CHAT_MODEL),
      stopWhen: stepCountIs(12),

      system: `
You are CutWave Assistant, a virtual barbershop booking assistant.

TODAY: ${today} (${isoDate})

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
TOOLS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- searchBarbershops: find barbershops in the database
- getAvailableTimeSlotsForBarbershop: find available time slots

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
            const timestamp = new Date(date).getTime();

            const booked: string[] = await fetchJson(
              `${baseUrl}/api/bookings?barbershopId=${barbershopId}&serviceId=${serviceId}&timestamp=${timestamp}`,
            );

            const allSlots: string[] = [];
            for (let h = 9; h < 19; h++) {
              allSlots.push(`${String(h).padStart(2, "0")}:00`);
              allSlots.push(`${String(h).padStart(2, "0")}:30`);
            }

            const available = allSlots.filter((s) => !booked.includes(s));

            return {
              availableTimeSlots:
                available.length > 0
                  ? available
                  : ["No time slots available on this date"],
            };
          } catch (error) {
            console.error("Time slots error:", error);
            return {
              availableTimeSlots: ["Could not check availability"],
            };
          }
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
