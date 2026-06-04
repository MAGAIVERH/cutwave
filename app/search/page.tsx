import BarbershopItem from "@/app/components/barbershop-item";
import SearchInput from "@/app/components/search-input";
import SearchQuickFilters from "@/app/components/search-quick-filters";
import { PageSectionScroller } from "@/components/ui/page";
import { prisma } from "@/lib/prisma";
import { resolveSearchQuery } from "@/lib/search-categories";

import Header from "../components/header";

interface SearchPageProps {
  searchParams: Promise<{
    query?: string;
  }>;
}

export default async function SearchPage(props: SearchPageProps) {
  const searchParams = await props.searchParams;

  const query = searchParams.query || "";
  const { displayLabel, dbQuery } = resolveSearchQuery(query);

  const barbershops = await prisma.barbershop.findMany({
    where: {
      services: {
        some: {
          name: {
            contains: dbQuery,
            mode: "insensitive",
          },
        },
      },
    },
  });

  return (
    <>
      <Header />
      <div className="space-y-5 px-5 pt-5 lg:mx-auto lg:max-w-6xl">
        <SearchInput />
        <PageSectionScroller>
          <SearchQuickFilters />
        </PageSectionScroller>

        <h2 className="mt-2 text-xl font-bold">
          Results for: &quot;{displayLabel}&quot;
        </h2>

        {barbershops.length === 0 && (
          <p className="text-muted-foreground mt-2">
            No barbershops found for &quot;{displayLabel}&quot;.
          </p>
        )}

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {barbershops.map((shop) => (
            <BarbershopItem key={shop.id} barbershop={shop} />
          ))}
        </div>
      </div>
    </>
  );
}
