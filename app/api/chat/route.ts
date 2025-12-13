import { google } from "@ai-sdk/google";
import { convertToModelMessages, stepCountIs,streamText, tool } from "ai";
import { cookies } from "next/headers";
import z from "zod";

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

  const lastUserMessage = [...messages]
    .reverse()
    .find((m: any) => m.role === "user");

  const userText =
    lastUserMessage?.content && typeof lastUserMessage.content === "string"
      ? lastUserMessage.content.trim().toLowerCase()
      : "";

  console.log("🔍 Última mensagem do usuário:", userText);

  /**
   * 🔥 INTERCEPTA "CONFIRMAR" ANTES DA IA
   */
  if (userText === "confirmar") {
    console.log("✅ Detectou 'confirmar' - criando checkout...");

    const cookieStore = await cookies();

    try {
      const response = await fetchJson(
        `${process.env.NEXT_PUBLIC_APP_URL}/api/stripe/create-booking-checkout-session`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            cookie: cookieStore.toString(),
          },
          body: JSON.stringify({ origin: "chat" }),
        },
      );

      console.log("✅ Checkout criado:", response.url);

      // Retorna estrutura EXATA que o frontend espera
      return new Response(
        JSON.stringify({
          id: `checkout-${Date.now()}`,
          role: "assistant",
          content: JSON.stringify({
            type: "checkout",
            checkoutUrl: response.url,
          }),
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    } catch (error) {
      console.error("❌ Erro ao criar checkout:", error);

      return new Response(
        JSON.stringify({
          id: `error-${Date.now()}`,
          role: "assistant",
          content:
            "❌ Desculpe, houve um erro ao processar o pagamento. Por favor, tente novamente ou entre em contato com o suporte.",
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  }

  /**
   * 🤖 IA para conversa normal (NUNCA deve confirmar agendamento)
   */
  const result = streamText({
    model: google("gemini-2.0-flash"),
    stopWhen: stepCountIs(12),

    system: `
Você é o Agenda.ai, assistente virtual de agendamento de barbearias.

DATA ATUAL: ${new Date().toLocaleDateString("pt-BR")} (${new Date().toISOString().split("T")[0]})

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ REGRA CRÍTICA - LEIA COM ATENÇÃO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

VOCÊ NUNCA DEVE:
❌ Confirmar agendamento
❌ Dizer "agendamento confirmado"
❌ Dizer "tudo pronto"
❌ Mencionar que o processo acabou
❌ Criar links de pagamento

SUA ÚNICA FUNÇÃO:
✅ Ajudar o usuário a escolher:
   - Barbearia
   - Serviço
   - Data
   - Horário
✅ Mostrar o resumo de confirmação
✅ PARAR e AGUARDAR o usuário digitar "confirmar"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🧠 FLUXO DE CONVERSA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Estado interno que você DEVE manter:
- barbeariaSelecionada: { id, nome, endereço }
- servicoSelecionado: { id, nome, preço }
- dataSelecionada: (formato YYYY-MM-DD)
- horarioSelecionado: (formato HH:MM)

Ordem OBRIGATÓRIA:
1️⃣ Perguntar qual barbearia → usar searchBarbershops
2️⃣ Perguntar qual serviço
3️⃣ Perguntar qual data
4️⃣ Mostrar horários disponíveis → usar getAvailableTimeSlotsForBarbershop
5️⃣ Usuário escolhe horário
6️⃣ MOSTRAR RESUMO (veja abaixo)
7️⃣ PARAR e aguardar

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 RESUMO DE CONFIRMAÇÃO (COPIE EXATAMENTE)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Quando o usuário escolher TODOS os dados, mostre EXATAMENTE isto:

━━━━━━━━━━━━━━━━━━━━
🧾 **Confira se está tudo certo:**

✅ **Confirme seu agendamento**

🏪 **Barbearia:** [nome]
📍 **Endereço:** [endereço completo]
💈 **Serviço:** [nome do serviço]
📅 **Data:** [DD/MM/YYYY]
🕐 **Horário:** [HH:MM]
💰 **Valor:** R$ [preço]

Digite **confirmar** para prosseguir com o pagamento ou **não** para alterar.
━━━━━━━━━━━━━━━━━━━━

⚠️ APÓS MOSTRAR ESTE RESUMO:
- NÃO adicione mais nada
- NÃO diga "confirmado"
- NÃO crie botões ou links
- APENAS aguarde a resposta do usuário

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔧 FERRAMENTAS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Use para buscar dados reais do banco:
- searchBarbershops: busca barbearias
- getAvailableTimeSlotsForBarbershop: busca horários disponíveis

SEMPRE mostre opções reais do banco de dados.
`,

    messages: convertToModelMessages(messages),

    tools: {
      searchBarbershops: tool({
        description: "Busca barbearias reais do banco de dados",
        inputSchema: z.object({
          name: z.string().optional().describe("Nome da barbearia (opcional)"),
        }),
        execute: async ({ name }) => {
          console.log("🔍 Buscando barbearias...", { name });

          const data = await prisma.barbershop.findMany({
            where: name
              ? { name: { contains: name, mode: "insensitive" } }
              : {},
            include: { services: true },
            take: 5,
          });

          console.log(`✅ Encontradas ${data.length} barbearias`);

          return {
            barbershops: data.map((b) => ({
              barbershopId: b.id,
              name: b.name,
              address: b.address,
              services: b.services.map((s) => ({
                id: s.id,
                name: s.name,
                price: `R$ ${(s.priceInCents / 100).toFixed(2)}`,
              })),
            })),
          };
        },
      }),

      getAvailableTimeSlotsForBarbershop: tool({
        description: "Busca horários disponíveis para agendamento",
        inputSchema: z.object({
          barbershopId: z.string().describe("ID da barbearia"),
          serviceId: z.string().describe("ID do serviço"),
          date: z
            .string()
            .describe("Data no formato YYYY-MM-DD (ex: 2025-12-31)"),
        }),
        execute: async ({ barbershopId, serviceId, date }) => {
          console.log("🔍 Buscando horários disponíveis...", {
            barbershopId,
            serviceId,
            date,
          });

          try {
            const timestamp = new Date(date).getTime();

            const booked: string[] = await fetchJson(
              `${process.env.NEXT_PUBLIC_APP_URL}/api/bookings?barbershopId=${barbershopId}&serviceId=${serviceId}&timestamp=${timestamp}`,
            );

            console.log(`⏰ Horários ocupados:`, booked);

            const allSlots: string[] = [];
            for (let h = 9; h < 19; h++) {
              allSlots.push(`${String(h).padStart(2, "0")}:00`);
              allSlots.push(`${String(h).padStart(2, "0")}:30`);
            }

            const available = allSlots.filter((s) => !booked.includes(s));

            console.log(`✅ Horários disponíveis:`, available.length);

            return {
              availableTimeSlots:
                available.length > 0
                  ? available
                  : ["Nenhum horário disponível nesta data"],
            };
          } catch (error) {
            console.error("❌ Erro ao buscar horários:", error);
            return {
              availableTimeSlots: ["Erro ao verificar disponibilidade"],
            };
          }
        },
      }),
    },
  });

  return result.toUIMessageStreamResponse();
};
