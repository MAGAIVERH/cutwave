import Image from "next/image";
import Header from "./components/header";
import SearchInput from "./components/search-input";
import banner4 from "../public/banner4.png";
import BookingItem from "./components/booking-item";

export default function Home() {
  return (
    <main>
      <Header />
      <div className="space-y-4 px-5">
        <SearchInput />
        <Image
          src={banner4}
          alt="Agende agora!"
          sizes="100vw"
          className="h-auto w-full rounded-2xl"
        />

        <h2 className="text-foreground text-xs font-semibold uppercase">
          Agendamentos
        </h2>
        <BookingItem
          serviceName="Corte de cabelo"
          barbershopName="Barbearia do joao"
          barbershopImageUrl="https://utfs.io/f/c97a2dc9-cf62-468b-a851-bfd2bdde775f-16p.png"
          date={new Date()}
        />
      </div>
    </main>
  );
}
