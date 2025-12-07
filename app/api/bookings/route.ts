import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function POST(req: Request) {
  // ✅ 1. Usuário logado via Better Auth
  const session = await auth.api.getSession({
    headers: req.headers,
  });

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  // ✅ 2. Dados do body
  const { barbershopId, serviceId, date } = await req.json();

  if (!barbershopId || !serviceId || !date) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }

  const start = new Date(date);
  const end = new Date(date);
  end.setMinutes(end.getMinutes() + 30);

  // ✅ REGRA 1 — usuário não pode ter dois agendamentos no mesmo horário
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
    const conflictBooking = await prisma.booking.findUnique({
      where: { id: userConflict.id },
      include: {
        barbershop: {
          select: { name: true },
        },
        service: {
          select: { name: true },
        },
      },
    });

    return NextResponse.json(
      {
        error: "USER_BOOKING_CONFLICT",
        conflict: {
          barbershopName: conflictBooking?.barbershop.name,
          serviceName: conflictBooking?.service.name,
          date: conflictBooking?.date,
        },
      },
      { status: 409 },
    );
  }

  // ✅ REGRA 2 — horário ocupado na barbearia/serviço
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
      { error: "Horário indisponível" },
      { status: 409 },
    );
  }

  // ✅ Criar reserva
  const booking = await prisma.booking.create({
    data: {
      userId,
      barbershopId,
      serviceId,
      date: start,
    },
  });

  return NextResponse.json(booking);
}

// GET — BUSCA HORÁRIOS OCUPADOS
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const barbershopId = searchParams.get("barbershopId");
  const serviceId = searchParams.get("serviceId");
  const userId = searchParams.get("userId");
  const timestamp = searchParams.get("timestamp");

  if (!serviceId || !timestamp) {
    return NextResponse.json([]);
  }

  const baseDate = new Date(Number(timestamp));

  const start = new Date(baseDate);
  start.setHours(0, 0, 0, 0);

  const end = new Date(baseDate);
  end.setHours(23, 59, 59, 999);

  // ✅ monta OR sem undefined (Prisma-safe)
  const orConditions: {
    userId?: string;
    barbershopId?: string;
    serviceId?: string;
  }[] = [];

  // ✅ conflito GLOBAL do usuário
  if (userId) {
    orConditions.push({
      userId,
    });
  }

  // ✅ conflito LOCAL (barbearia + serviço)
  if (barbershopId) {
    orConditions.push({
      barbershopId,
      serviceId,
    });
  }

  const bookings = await prisma.booking.findMany({
    where: {
      cancelled: false,
      date: {
        gte: start,
        lte: end,
      },
      OR: orConditions,
    },
  });

  const bookedHours = bookings.map((b) => {
    const h = b.date.getHours().toString().padStart(2, "0");
    const m = b.date.getMinutes().toString().padStart(2, "0");
    return `${h}:${m}`; // ex: "13:30"
  });

  return NextResponse.json(bookedHours);
}
