// import { NextResponse } from "next/server";
// import { auth } from "@/lib/auth";
// import { prisma } from "@/lib/prisma";
// import { headers } from "next/headers";
// import Stripe from "stripe";
// import { format } from "date-fns";

// export async function POST(req: Request) {
//   try {
//     // 1) Verificar STRIPE_SECRET_KEY
//     if (!process.env.STRIPE_SECRET_KEY) {
//       return NextResponse.json(
//         { error: "Stripe key not configured" },
//         { status: 500 },
//       );
//     }

//     // 2) Autenticação
//     const session = await auth.api.getSession({
//       headers: req.headers,
//     });

//     if (!session?.user?.id) {
//       return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
//     }

//     const userId = session.user.id;

//     // 3) Receber body
//     const { serviceId, date } = await req.json();

//     if (!serviceId || !date) {
//       return NextResponse.json(
//         { error: "Missing serviceId or date" },
//         { status: 400 },
//       );
//     }

//     const parsedDate = new Date(date);

//     // 4) Buscar serviço
//     const service = await prisma.barbershopService.findUnique({
//       where: { id: serviceId },
//       include: { barbershop: true },
//     });

//     if (!service) {
//       return NextResponse.json({ error: "Service not found" }, { status: 404 });
//     }

//     // 5) Criar checkout session
//     const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

//     const checkoutSession = await stripe.checkout.sessions.create({
//       payment_method_types: ["card"],
//       mode: "payment",
//       success_url: `${process.env.NEXT_PUBLIC_APP_URL}/thanks`,
//       cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}`,
//       metadata: {
//         serviceId: service.id,
//         barbershopId: service.barbershopId,
//         userId,
//         date: parsedDate.toISOString(),
//       },
//       line_items: [
//         {
//           price_data: {
//             currency: "brl",
//             unit_amount: service.priceInCents,
//             product_data: {
//               name: `${service.barbershop.name} - ${service.name} em ${format(parsedDate, "dd/MM/yyyy HH:mm")}`,
//               description: service.description,
//               images: [service.imageUrl],
//             },
//           },
//           quantity: 1,
//         },
//       ],
//     });

//     return NextResponse.json({ url: checkoutSession.url });
//   } catch (error) {
//     console.error("Stripe checkout error:", error);
//     return NextResponse.json(
//       { error: "Failed to create Stripe session" },
//       { status: 500 },
//     );
//   }
// }

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Stripe from "stripe";
import { format } from "date-fns";

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
    const { serviceId, date } = await req.json();
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

    // 🔍 VALIDAR CONFLITOS (igual POST antigo)

    // 1) Conflito do usuario
    const userConflict = await prisma.booking.findFirst({
      where: {
        userId,
        cancelled: false,
        date: {
          gte: start,
          lt: end,
        },
      },
    });

    if (userConflict) {
      return NextResponse.json(
        { error: "USER_BOOKING_CONFLICT" },
        { status: 409 },
      );
    }

    // 2) Conflito da barbearia/serviço
    const serviceConflict = await prisma.booking.findFirst({
      where: {
        barbershopId,
        serviceId,
        cancelled: false,
        date: {
          gte: start,
          lt: end,
        },
      },
    });

    if (serviceConflict) {
      return NextResponse.json(
        { error: "TIME_SLOT_UNAVAILABLE" },
        { status: 409 },
      );
    }

    // Se chegou aqui → horário está livre → criar checkout Stripe
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    const checkoutSession = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/thanks`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}`,
      metadata: {
        serviceId,
        barbershopId,
        userId,
        date: parsedDate.toISOString(),
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
