import { headers } from "next/headers";
import { redirect } from "next/navigation";

import Footer from "@/app/components/footer";
import Header from "@/app/components/header";
import { PageContainer } from "@/components/ui/page";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

import AppointmentsClient from "./components/appointments-client";

export default async function AppointmentsPage() {
  // ✅ 1. Sessão do usuário (AUTH NO SERVER)
  const session = await auth.api.getSession({
    headers: new Headers(await headers()),
  });

  if (!session?.user?.id) {
    redirect("/");
  }

  const userId = session.user.id;
  const now = new Date();

  // ✅ 2. Buscar agendamentos reais do banco
  const bookings = await prisma.booking.findMany({
    where: {
      userId,
      cancelled: false,
    },
    include: {
      service: {
        select: { name: true, priceInCents: true },
      },
      barbershop: {
        select: {
          name: true,
          imageUrl: true,
          phones: true,
          address: true,
        },
      },
    },
    orderBy: {
      date: "asc",
    },
  });

  // ✅ 3. Separar status
  const confirmed = bookings.filter(
    (b: (typeof bookings)[number]) => b.date > now,
  );
  const finished = bookings.filter(
    (b: (typeof bookings)[number]) => b.date <= now,
  );

  return (
    <main className="flex h-screen flex-col">
      {/* HEADER */}
      <Header />
      {/* CONTEÚDO COM SCROLL */}
      <div className="flex-1 overflow-y-auto">
        <PageContainer className="space-y-6">
          <h1 className="text-lg font-bold">Agendamentos</h1>

          <AppointmentsClient confirmed={confirmed} finished={finished} />
        </PageContainer>
      </div>

      {/* FOOTER */}
      <Footer />
    </main>
  );
}
