import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST — CRIA RESERVA
export async function POST(req: Request) {
  const { barbershopId, serviceId, date } = await req.json();

  const start = new Date(date);
  const end = new Date(date);
  end.setMinutes(end.getMinutes() + 30); // duração do serviço

  const conflict = await prisma.booking.findFirst({
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

  if (conflict) {
    return NextResponse.json(
      { error: "Horário indisponível" },
      { status: 409 },
    );
  }

  const booking = await prisma.booking.create({
    data: {
      barbershopId,
      serviceId,
      date: new Date(date),
    },
  });

  return NextResponse.json(booking);
}

// GET — BUSCA HORÁRIOS OCUPADOS
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const barbershopId = searchParams.get("barbershopId");
  const serviceId = searchParams.get("serviceId");

  const timestamp = searchParams.get("timestamp");

  if (!barbershopId || !serviceId || !timestamp) {
    return NextResponse.json([]);
  }

  const baseDate = new Date(Number(timestamp)); // mesmo dia que o front está vendo

  const start = new Date(baseDate);
  start.setHours(0, 0, 0, 0);

  const end = new Date(baseDate);
  end.setHours(23, 59, 59, 999);

  const bookings = await prisma.booking.findMany({
    where: {
      barbershopId,
      serviceId,
      cancelled: false,
      date: {
        gte: start,
        lte: end,
      },
    },
  });

  const bookedHours = bookings.map((b) => {
    const h = b.date.getHours().toString().padStart(2, "0");
    const m = b.date.getMinutes().toString().padStart(2, "0");
    return `${h}:${m}`; // ex: "13:30"
  });

  return NextResponse.json(bookedHours);
}
