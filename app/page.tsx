import Image from "next/image";
import Header from "./components/header";
import SearchInput from "./components/search-input";
import banner4 from "../public/banner4.png";
import BookingItem from "./components/booking-item";
import BarbershopItem from "./components/barbershop-item";
import { prisma } from "@/lib/prisma";

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
      <div className="space-y-4 p-5">
        <SearchInput />
        <Image
          src={banner4}
          alt="Agende agora!"
          sizes="100vw"
          className="h-auto w-full rounded-2xl"
        />

        <h2 className="text-foreground text-xs font-bold uppercase">
          Agendamentos
        </h2>
        <BookingItem
          serviceName="Corte de cabelo"
          barbershopName="Barbearia do joao"
          barbershopImageUrl="https://utfs.io/f/c97a2dc9-cf62-468b-a851-bfd2bdde775f-16p.png"
          date={new Date()}
        />

        <h2 className="text-foreground text-xs font-bold uppercase">
          Recomendados
        </h2>

        <div className="flex gap-4 overflow-x-auto [&::-webkit-scrolbar]:hidden">
          {recomendedBarbershops.map((barbershop) => (
            <BarbershopItem key={barbershop.id} barbershop={barbershop} />
          ))}
        </div>

        <h2 className="text-foreground text-xs font-bold uppercase">
          Populares
        </h2>

        <div className="flex gap-4 overflow-x-auto [&::-webkit-scrolbar]:hidden">
          {popularBarbershops.map((barbershop) => (
            <BarbershopItem key={barbershop.id} barbershop={barbershop} />
          ))}
        </div>
      </div>
    </main>
  );
};
export default Home;
