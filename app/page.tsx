import Image from "next/image";
import Header from "./components/header";
import SearchInput from "./components/search-input";
import banner4 from "../public/banner4.png";
import BookingItem from "./components/booking-item";
import BarbershopItem from "./components/barbershop-item";
import { prisma } from "@/lib/prisma";
import Footer from "./components/footer";
import {
  PageContainer,
  PageSection,
  PageSectionScroller,
  PageSectionTitle,
} from "@/components/ui/page";

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
  return (
    <main>
      <Header />
      <PageContainer>
        <SearchInput />
        <Image
          src={banner4}
          alt="Agende agora!"
          sizes="100vw"
          className="h-auto w-full rounded-2xl"
        />

        <PageSection>
          <PageSectionTitle>Agendamentos</PageSectionTitle>
          <BookingItem
            serviceName="Corte de cabelo"
            barbershopName="Barbearia do joao"
            barbershopImageUrl="https://utfs.io/f/c97a2dc9-cf62-468b-a851-bfd2bdde775f-16p.png"
            date={new Date()}
          />
        </PageSection>

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
