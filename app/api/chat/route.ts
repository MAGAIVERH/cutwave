import { cookies } from "next/headers";
import { streamText, convertToModelMessages, tool, stepCountIs } from "ai";
import { google } from "@ai-sdk/google";
import { prisma } from "@/lib/prisma";
import z from "zod";

/**
 * Helper seguro para fetch JSON
 */
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

  const result = streamText({
    model: google("gemini-2.0-flash"),
    stopWhen: stepCountIs(12),

    system: `
Você é o Agenda.ai, assistente virtual de agendamento de barbearias.

DATA ATUAL:
${new Date().toLocaleDateString("pt-BR")} (${new Date().toISOString().split("T")[0]})

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🧠 ESTADO DE CONVERSA (OBRIGATÓRIO)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Mantenha internamente:
- barbeariaSelecionada
- servicoSelecionado
- dataSelecionada
- horarioSelecionado
- precoServico

Nunca avance se algum estiver faltando.

Ordem obrigatória:
Barbearia → Serviço → Data → Horário → Check-in → Confirmação → Checkout

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚫 PROIBIÇÕES ABSOLUTAS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- NUNCA inventar barbearias
- NUNCA inventar serviços
- NUNCA assumir serviço automaticamente
- NUNCA criar checkout sem check-in
- NUNCA pular confirmação

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💈 SERVIÇOS PERMITIDOS (EXCLUSIVOS DO BANCO)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Apenas:
- Corte de Cabelo
- Barba
- Sobrancelha
- Massagem
- Acabamento (Pézinho)

Mapeamento semântico:
- cortar, corte, cabelo → Corte de Cabelo
- barba → Barba
- sobrancelha → Sobrancelha
- massagem → Massagem
- acabamento, pezinho → Acabamento

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚨 EXECUÇÃO IMEDIATA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Se o usuário pedir:
- barbearias
- horários
- dias disponíveis
- agenda
- sugestões

VOCÊ DEVE:
1. Usar searchBarbershops
2. Usar getAvailableTimeSlotsForBarbershop
3. Mostrar opções reais
4. Avançar a conversa

Nunca diga:
"vou verificar", "preciso saber", "me informe"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 CHECK-IN OBRIGATÓRIO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Quando TODAS as informações existirem, responda:

🧾 Confirme seu agendamento

🏪 Barbearia: [nome]
📍 Endereço: [endereço]
💈 Serviço: [serviço]
📅 Data: [DD/MM/YYYY]
🕐 Horário: [HH:MM]
💰 Valor: R$ [valor]

Digite **confirmar** para continuar ou **não** para alterar.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💳 CHECKOUT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Somente após confirmação explícita:
{"checkoutUrl":"URL"}
`,

    messages: convertToModelMessages(messages),

    tools: {
      searchBarbershops: tool({
        description: "Retorna APENAS barbearias reais do banco.",
        inputSchema: z.object({
          name: z.string().optional(),
        }),
        execute: async ({ name }) => {
          const barbershops = await prisma.barbershop.findMany({
            where: name
              ? { name: { contains: name, mode: "insensitive" } }
              : {},
            include: { services: true },
          });

          if (barbershops.length === 0) {
            return { empty: true };
          }

          return {
            empty: false,
            barbershops: barbershops.map((b) => ({
              barbershopId: b.id,
              name: b.name,
              address: b.address,
              services: b.services.map((s) => ({
                id: s.id,
                name: s.name,
                price: (s.priceInCents / 100).toFixed(2).replace(".", ","),
              })),
            })),
          };
        },
      }),

      getAvailableTimeSlotsForBarbershop: tool({
        description: "Busca horários disponíveis reais.",
        inputSchema: z.object({
          barbershopId: z.string(),
          serviceId: z.string(),
          date: z.string(),
        }),
        execute: async ({ barbershopId, serviceId, date }) => {
          const timestamp = new Date(date).getTime();

          const booked: string[] = await fetchJson(
            `${process.env.NEXT_PUBLIC_APP_URL}/api/bookings?barbershopId=${barbershopId}&serviceId=${serviceId}&timestamp=${timestamp}`,
          );

          const allSlots: string[] = [];
          for (let h = 9; h < 19; h++) {
            allSlots.push(`${h.toString().padStart(2, "0")}:00`);
            allSlots.push(`${h.toString().padStart(2, "0")}:30`);
          }

          const now = new Date();
          const requestedDate = new Date(date);

          const isToday = requestedDate.toDateString() === now.toDateString();

          return {
            barbershopId,
            date,
            availableTimeSlots: allSlots.filter((slot) => {
              if (booked.includes(slot)) return false;

              if (isToday) {
                const [hour, minute] = slot.split(":").map(Number);
                const slotTime = new Date(requestedDate);
                slotTime.setHours(hour, minute, 0, 0);

                return slotTime > now;
              }

              return true;
            }),
          };
        },
      }),

      createBooking: tool({
        description: "Cria checkout Stripe.",
        inputSchema: z.object({
          serviceId: z.string(),
          date: z.string(),
        }),
        execute: async ({ serviceId, date }) => {
          const cookieStore = await cookies();

          const response = await fetchJson(
            `${process.env.NEXT_PUBLIC_APP_URL}/api/stripe/create-booking-checkout-session`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                cookie: cookieStore.toString(),
              },
              body: JSON.stringify({ serviceId, date, origin: "chat" }),
            },
          );

          return { checkoutUrl: response.url };
        },
      }),
    },
  });

  return result.toUIMessageStreamResponse();
};
