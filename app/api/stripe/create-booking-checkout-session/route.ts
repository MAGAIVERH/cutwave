import { format } from "date-fns";
import { enUS } from "date-fns/locale";
import { NextResponse } from "next/server";
import Stripe from "stripe";

import { validateBookingSlot } from "@/lib/booking-availability";
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

    const validation = await validateBookingSlot(prisma, {
      userId,
      serviceId,
      appointmentDate: parsedDate,
    });

    if (!validation.ok) {
      return NextResponse.json(
        { error: validation.error, message: validation.userMessage },
        { status: 409 },
      );
    }

    const service = await prisma.barbershopService.findUnique({
      where: { id: serviceId },
      include: { barbershop: true },
    });

    if (!service) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }

    const barbershopId = service.barbershopId;

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
            currency: "usd",
            unit_amount: service.priceInCents,
            product_data: {
              name: `${service.barbershop.name} - ${service.name} on ${format(parsedDate, "MMM d, yyyy 'at' h:mm a", { locale: enUS })}`,
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
