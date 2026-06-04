import { NextResponse } from "next/server";

import {
  getDayAvailability,
  getLegacyBookedHours,
} from "@/lib/booking-availability";
import { parseIsoDateOnly } from "@/lib/chat-utils";
import { prisma } from "@/lib/prisma";

// GET — booked hours / availability for a day
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const barbershopId = searchParams.get("barbershopId");
  const serviceId = searchParams.get("serviceId");
  const userId = searchParams.get("userId");
  const timestamp = searchParams.get("timestamp");
  const detailed = searchParams.get("detailed") === "true";

  if (!serviceId || !timestamp) {
    return NextResponse.json([]);
  }

  const baseDate = new Date(Number(timestamp));
  const dateIso = `${baseDate.getFullYear()}-${String(baseDate.getMonth() + 1).padStart(2, "0")}-${String(baseDate.getDate()).padStart(2, "0")}`;

  if (!parseIsoDateOnly(dateIso) || !barbershopId) {
    return NextResponse.json([]);
  }

  const availability = await getDayAvailability(prisma, {
    userId: userId ?? undefined,
    barbershopId,
    serviceId,
    dateIso,
  });

  if (detailed) {
    return NextResponse.json(availability);
  }

  return NextResponse.json(getLegacyBookedHours(availability));
}
