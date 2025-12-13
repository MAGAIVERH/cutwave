import { headers } from "next/headers";
import Image from "next/image";

import {
  PageContainer,
  PageSection,
  PageSectionScroller,
  PageSectionTitle,
} from "@/components/ui/page";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

import banner4 from "../public/banner4.png";
import BarbershopItem from "./components/barbershop-item";
import BookingItem from "./components/booking-item";
import Footer from "./components/footer";
import Header from "./components/header";
import SearchInput from "./components/search-input";
import SearchQuickFilters from "./components/search-quick-filters";

const Home = async () => {
  const recomendedBarbershops = await prisma.barbershop.findMany({
    orderBy: {
      name: "asc",
    },
  });
  const popularBarbershops = await prisma.barbershop.findMany({
    orderBy: {
      name: "desc",
    },
  });
  const session = await auth.api.getSession({
    headers: new Headers(await headers()),
  });

  const bookings = session?.user?.id
    ? await prisma.booking.findMany({
        where: {
          userId: session.user.id,
          cancelled: false,
          date: {
            gt: new Date(),
          },
        },
        include: {
          service: { select: { name: true, priceInCents: true } },
          barbershop: {
            select: {
              name: true,
              imageUrl: true,
              address: true,
              phones: true,
            },
          },
        },
        orderBy: {
          date: "asc",
        },
        take: 5,
      })
    : [];
  return (
    <main>
      <Header />
      <PageContainer>
        <SearchInput />
        <PageSectionScroller>
          <SearchQuickFilters />
        </PageSectionScroller>

        <div className="relative h-120 w-full overflow-hidden rounded-2xl">
          <Image
            src={banner4}
            alt="Agende agora!"
            fill
            className="object-cover"
            priority
          />
        </div>

        {bookings.length > 0 && (
          <PageSection>
            <PageSectionTitle>Agendamentos</PageSectionTitle>

            <PageSectionScroller>
              {bookings.map((booking) => (
                <BookingItem key={booking.id} booking={booking} />
              ))}
            </PageSectionScroller>
          </PageSection>
        )}

        <PageSection>
          <PageSectionTitle>Recomendados</PageSectionTitle>
          <PageSectionScroller>
            {recomendedBarbershops.map((barbershop) => (
              <BarbershopItem key={barbershop.id} barbershop={barbershop} />
            ))}
          </PageSectionScroller>
        </PageSection>

        <PageSection>
          <PageSectionTitle>Populares</PageSectionTitle>
          <PageSectionScroller>
            {popularBarbershops.map((barbershop) => (
              <BarbershopItem key={barbershop.id} barbershop={barbershop} />
            ))}
          </PageSectionScroller>
        </PageSection>
      </PageContainer>

      <Footer />
    </main>
  );
};
export default Home;
