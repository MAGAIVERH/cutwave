import { format } from "date-fns";
import { NextResponse } from "next/server";
import Stripe from "stripe";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: "Stripe key not configured" },
        { status: 500 },
      );
    }

    // Auth
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Body
    const { serviceId, date, origin } = await req.json();

    if (!serviceId || !date) {
      return NextResponse.json(
        { error: "Missing serviceId or date" },
        { status: 400 },
      );
    }

    const parsedDate = new Date(date);
    const start = parsedDate;
    const end = new Date(parsedDate);
    end.setMinutes(end.getMinutes() + 30);

    // Buscar serviço
    const service = await prisma.barbershopService.findUnique({
      where: { id: serviceId },
      include: { barbershop: true },
    });

    if (!service) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }

    const barbershopId = service.barbershopId;

    // 🔍 VALIDAR CONFLITOS (NÃO MEXER)
    const userConflict = await prisma.booking.findFirst({
      where: {
        userId,
        cancelled: false,
        date: { gte: start, lt: end },
      },
    });

    if (userConflict) {
      return NextResponse.json(
        { error: "USER_BOOKING_CONFLICT" },
        { status: 409 },
      );
    }

    const serviceConflict = await prisma.booking.findFirst({
      where: {
        barbershopId,
        serviceId,
        cancelled: false,
        date: { gte: start, lt: end },
      },
    });

    if (serviceConflict) {
      return NextResponse.json(
        { error: "TIME_SLOT_UNAVAILABLE" },
        { status: 409 },
      );
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    // 🔑 DIFERENCIA CHAT VS SITE (AJUSTE FINAL)
    const isChatOrigin = origin === "chat";

    const successUrl = isChatOrigin
      ? `${process.env.NEXT_PUBLIC_APP_URL}/chat?checkout=success`
      : `${process.env.NEXT_PUBLIC_APP_URL}/thanks`;

    const cancelUrl = isChatOrigin
      ? `${process.env.NEXT_PUBLIC_APP_URL}/chat`
      : `${process.env.NEXT_PUBLIC_APP_URL}`;

    const checkoutSession = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        serviceId,
        barbershopId,
        userId,
        date: parsedDate.toISOString(),
        origin: isChatOrigin ? "chat" : "site",
      },
      line_items: [
        {
          price_data: {
            currency: "brl",
            unit_amount: service.priceInCents,
            product_data: {
              name: `${service.barbershop.name} - ${service.name} em ${format(parsedDate, "dd/MM/yyyy HH:mm")}`,
              description: service.description,
              images: [service.imageUrl],
            },
          },
          quantity: 1,
        },
      ],
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    console.error("Stripe checkout error:", error);
    return NextResponse.json(
      { error: "Failed to create Stripe session" },
      { status: 500 },
    );
  }
}
