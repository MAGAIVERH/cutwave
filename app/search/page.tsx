import BarbershopItem from "@/app/components/barbershop-item";
import SearchInput from "@/app/components/search-input";
import SearchQuickFilters from "@/app/components/search-quick-filters";
import { PageSectionScroller } from "@/components/ui/page";
import { prisma } from "@/lib/prisma";

import Header from "../components/header";

interface SearchPageProps {
  searchParams: Promise<{
    query?: string;
  }>;
}

export default async function SearchPage(props: SearchPageProps) {
  // Agora SIM: unwrapping correto
  const searchParams = await props.searchParams;

  const query = searchParams.query || "";

  const filterLabels: Record<string, string> = {
    cabelo: "Cabelo",
    barba: "Barba",
    acabamento: "Acabamento",
    sobrancelha: "Sobrancelha",
    massagem: "Massagem",
    hidratacao: "Hidratação",
  };

  const displayQuery = filterLabels[query.toLowerCase()] || query;

  const barbershops = await prisma.barbershop.findMany({
    where: {
      services: {
        some: {
          name: {
            contains: query,
            mode: "insensitive",
          },
        },
      },
    },
  });

  return (
    <>
      <Header />
      <div className="space-y-5 px-5 pt-5">
        <SearchInput />
        <PageSectionScroller>
          <SearchQuickFilters />
        </PageSectionScroller>

        <h2 className="mt-2 text-xl font-bold">
          Resultados para: "{displayQuery}"
        </h2>

        {barbershops.length === 0 && (
          <p className="text-muted-foreground mt-2">
            Nenhuma barbearia encontrada para "{displayQuery}".
          </p>
        )}

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          {barbershops.map((shop) => (
            <BarbershopItem key={shop.id} barbershop={shop} />
          ))}
        </div>
      </div>
    </>
  );
}
