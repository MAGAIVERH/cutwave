import type { PrismaClient } from "@prisma/client";

import {
  formatIsoDateUs,
  getTodayIsoDate,
  parseIsoDateOnly,
} from "@/lib/chat-utils";

export const BOOKING_SLOT_DURATION_MINUTES = 30;

export const ALL_TIME_SLOTS: string[] = [];
for (let h = 9; h < 19; h++) {
  ALL_TIME_SLOTS.push(`${String(h).padStart(2, "0")}:00`);
  ALL_TIME_SLOTS.push(`${String(h).padStart(2, "0")}:30`);
}

export function formatSlotFromDate(date: Date): string {
  const h = date.getHours().toString().padStart(2, "0");
  const m = date.getMinutes().toString().padStart(2, "0");
  return `${h}:${m}`;
}

export function getDayBounds(isoDate: string) {
  const base = parseIsoDateOnly(isoDate);
  if (!base) {
    throw new Error("Invalid date");
  }

  const start = new Date(base);
  start.setHours(0, 0, 0, 0);

  const end = new Date(base);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

export function filterPastTimeSlots(
  slots: string[],
  isoDate: string,
  now = new Date(),
): string[] {
  const todayIso = getTodayIsoDate(now);
  if (isoDate !== todayIso) return slots;

  const base = parseIsoDateOnly(isoDate);
  if (!base) return slots;

  return slots.filter((slot) => {
    const [hours, minutes] = slot.split(":").map(Number);
    const slotDate = new Date(base);
    slotDate.setHours(hours, minutes, 0, 0);
    return slotDate > now;
  });
}

export type UnavailableSlot = {
  time: string;
  reason: "TIME_SLOT_UNAVAILABLE" | "USER_BOOKING_CONFLICT";
  existingBarbershop?: string;
  existingService?: string;
};

export type DayAvailability = {
  date: string;
  dateFormatted: string;
  availableTimeSlots: string[];
  unavailableSlots: UnavailableSlot[];
  fullyBooked: boolean;
  hint: string;
};

export async function getDayAvailability(
  prisma: PrismaClient,
  params: {
    userId?: string;
    barbershopId: string;
    serviceId: string;
    dateIso: string;
    now?: Date;
  },
): Promise<DayAvailability> {
  const { start, end } = getDayBounds(params.dateIso);
  const now = params.now ?? new Date();
  const dateFormatted = formatIsoDateUs(params.dateIso);

  const serviceBookings = await prisma.booking.findMany({
    where: {
      barbershopId: params.barbershopId,
      serviceId: params.serviceId,
      cancelled: false,
      date: { gte: start, lte: end },
    },
    select: { date: true },
  });

  const serviceBusySet = new Set(
    serviceBookings.map((b) => formatSlotFromDate(b.date)),
  );

  const userBusySlots = new Map<
    string,
    { barbershopName: string; serviceName: string }
  >();

  if (params.userId) {
    const userBookings = await prisma.booking.findMany({
      where: {
        userId: params.userId,
        cancelled: false,
        date: { gte: start, lte: end },
      },
      include: {
        barbershop: { select: { name: true } },
        service: { select: { name: true } },
      },
    });

    for (const booking of userBookings) {
      const time = formatSlotFromDate(booking.date);
      userBusySlots.set(time, {
        barbershopName: booking.barbershop.name,
        serviceName: booking.service.name,
      });
    }
  }

  const candidateSlots = filterPastTimeSlots(ALL_TIME_SLOTS, params.dateIso, now);
  const availableTimeSlots: string[] = [];
  const unavailableSlots: UnavailableSlot[] = [];

  for (const slot of candidateSlots) {
    if (serviceBusySet.has(slot)) {
      unavailableSlots.push({ time: slot, reason: "TIME_SLOT_UNAVAILABLE" });
      continue;
    }

    const userConflict = userBusySlots.get(slot);
    if (userConflict) {
      unavailableSlots.push({
        time: slot,
        reason: "USER_BOOKING_CONFLICT",
        existingBarbershop: userConflict.barbershopName,
        existingService: userConflict.serviceName,
      });
      continue;
    }

    availableTimeSlots.push(slot);
  }

  const fullyBooked = availableTimeSlots.length === 0;
  const userConflictCount = unavailableSlots.filter(
    (s) => s.reason === "USER_BOOKING_CONFLICT",
  ).length;

  let hint = `Only list these available times for ${dateFormatted}: ${availableTimeSlots.join(", ") || "none"}.`;
  if (fullyBooked) {
    hint = `No availability at this barbershop on ${dateFormatted}. Suggest another date.`;
  } else if (userConflictCount > 0) {
    hint +=
      " Some times are blocked because the user already has another appointment at that time (cannot book two places at once).";
  }

  return {
    date: params.dateIso,
    dateFormatted,
    availableTimeSlots,
    unavailableSlots,
    fullyBooked,
    hint,
  };
}

export function getLegacyBookedHours(availability: DayAvailability): string[] {
  return availability.unavailableSlots.map((slot) => slot.time);
}

export type BookingValidationResult =
  | { ok: true }
  | {
      ok: false;
      error: "USER_BOOKING_CONFLICT" | "TIME_SLOT_UNAVAILABLE" | "SERVICE_NOT_FOUND";
      userMessage: string;
    };

export async function validateBookingSlot(
  prisma: PrismaClient,
  params: {
    userId: string;
    serviceId: string;
    appointmentDate: Date;
  },
): Promise<BookingValidationResult> {
  const service = await prisma.barbershopService.findUnique({
    where: { id: params.serviceId },
    include: { barbershop: true },
  });

  if (!service) {
    return {
      ok: false,
      error: "SERVICE_NOT_FOUND",
      userMessage: "Service not found. Please pick a service again.",
    };
  }

  const start = params.appointmentDate;
  const end = new Date(params.appointmentDate);
  end.setMinutes(end.getMinutes() + BOOKING_SLOT_DURATION_MINUTES);

  const userConflict = await prisma.booking.findFirst({
    where: {
      userId: params.userId,
      cancelled: false,
      date: { gte: start, lt: end },
    },
    include: {
      barbershop: { select: { name: true } },
      service: { select: { name: true } },
    },
  });

  if (userConflict) {
    const time = formatSlotFromDate(userConflict.date);
    return {
      ok: false,
      error: "USER_BOOKING_CONFLICT",
      userMessage:
        `You already have an appointment at **${time}** at **${userConflict.barbershop.name}** (${userConflict.service.name}). ` +
        "You cannot book two barbershops at the same date and time. Please choose a different time or cancel your other appointment.",
    };
  }

  const serviceConflict = await prisma.booking.findFirst({
    where: {
      barbershopId: service.barbershopId,
      serviceId: params.serviceId,
      cancelled: false,
      date: { gte: start, lt: end },
    },
  });

  if (serviceConflict) {
    const time = formatSlotFromDate(serviceConflict.date);
    return {
      ok: false,
      error: "TIME_SLOT_UNAVAILABLE",
      userMessage:
        `**${time}** is no longer available at **${service.barbershop.name}**. ` +
        "Please pick another time from the available slots.",
    };
  }

  return { ok: true };
}
