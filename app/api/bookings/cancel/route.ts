import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  // 1) Usuário logado
  const session = await auth.api.getSession({
    headers: req.headers,
  });

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  // 2) Dados do body
  const { bookingId } = await req.json();

  if (!bookingId) {
    return NextResponse.json({ error: "Missing bookingId" }, { status: 400 });
  }

  // 3) Garantir que a reserva existe e é do usuário logado
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
  });

  if (!booking || booking.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // 4) Cancelar (flag cancelled = true)
  await prisma.booking.update({
    where: { id: bookingId },
    data: { cancelled: true },
  });

  return NextResponse.json({ success: true });
}
