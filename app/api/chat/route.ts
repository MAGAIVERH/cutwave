import { google } from "@ai-sdk/google";
import { convertToModelMessages, stepCountIs, streamText, tool } from "ai";
import { cookies } from "next/headers";
import z from "zod";

import {
  checkoutUIMessageStreamResponse,
  errorUIMessageStreamResponse,
  getAppBaseUrl,
  getLastUserText,
  isConfirmCommand,
} from "@/lib/chat-utils";
import { prisma } from "@/lib/prisma";

async function fetchJson(url: string, options?: RequestInit) {
  const res = await fetch(url, options);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Request failed");
  }
  return res.json();
}

export const POST = async (request: Request) => {
  const { messages } = await request.json();
  const baseUrl = getAppBaseUrl(request);
  const userText = getLastUserText(messages);

  if (isConfirmCommand(userText)) {
    const cookieStore = await cookies();

    try {
      const response = await fetchJson(
        `${baseUrl}/api/stripe/create-booking-checkout-session`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            cookie: cookieStore.toString(),
          },
          body: JSON.stringify({ origin: "chat" }),
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
    model: google("gemini-2.0-flash"),
    stopWhen: stepCountIs(12),

    system: `
You are CutWave Assistant, a virtual barbershop booking assistant.

TODAY: ${today} (${isoDate})

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
`,

    messages: convertToModelMessages(messages),

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
};
