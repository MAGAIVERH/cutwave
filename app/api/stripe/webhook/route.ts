import { NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs"; // NECESSÁRIO
export const dynamic = "force-dynamic"; // EVITA CACHES
export const preferredRegion = "auto"; // PERMITE REGIÕES SERVERLESS

export async function POST(req: Request) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event;

  try {
    const rawBody = await req.text(); // ← RAW BODY (CORRETO)

    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // PROCESSAR O EVENTO IMPORTANTE
  if (event.type === "checkout.session.completed") {
    const sessionObj = event.data.object;

    const serviceId = sessionObj.metadata?.serviceId;
    const barbershopId = sessionObj.metadata?.barbershopId;
    const userId = sessionObj.metadata?.userId;
    const date = sessionObj.metadata?.date;

    if (!serviceId || !barbershopId || !userId || !date) {
      console.error("Webhook: missing metadata");
      return NextResponse.json({ received: true });
    }

    const start = new Date(date);
    const end = new Date(date);
    end.setMinutes(end.getMinutes() + 30);

    // 🔍 REVALIDAR CONFLITOS (proteção contra concorrência)

    const conflict = await prisma.booking.findFirst({
      where: {
        cancelled: false,
        date: {
          gte: start,
          lt: end,
        },
        OR: [
          { userId }, // usuário tem outro booking no horário
          { barbershopId, serviceId }, // horário do serviço já ocupado
        ],
      },
    });

    if (conflict) {
      console.error("Webhook: booking conflict detected — booking NOT created");
      return NextResponse.json({ received: true });
    }

    // Criar reserva (agora seguro)
    await prisma.booking.create({
      data: {
        serviceId,
        barbershopId,
        userId,
        date: start,
        cancelled: false,
      },
    });

    console.log("Booking created via webhook");
  }
}
