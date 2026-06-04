"use client";

import { Brush, Droplets, Eye, Scissors, Slice, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { CATEGORY_SLUGS, type CategorySlug } from "@/lib/search-categories";

const filters: {
  label: string;
  icon: typeof Scissors;
  value: CategorySlug;
}[] = [
  { label: CATEGORY_SLUGS.cabelo.label, icon: Scissors, value: "cabelo" },
  { label: CATEGORY_SLUGS.barba.label, icon: Slice, value: "barba" },
  { label: CATEGORY_SLUGS.sobrancelha.label, icon: Eye, value: "sobrancelha" },
  { label: CATEGORY_SLUGS.massagem.label, icon: Sparkles, value: "massagem" },
  { label: CATEGORY_SLUGS.acabamento.label, icon: Brush, value: "acabamento" },
  { label: CATEGORY_SLUGS.hidratacao.label, icon: Droplets, value: "hidratacao" },
];

const SearchQuickFilters = () => {
  const router = useRouter();

  const handleFilter = (value: string) => {
    router.push(`/search?query=${value}`);
  };

  return (
    <div className="scrollbar-hide flex gap-3 overflow-x-auto lg:grid lg:w-full lg:grid-cols-6 lg:gap-3 lg:overflow-visible">
      {filters.map((item) => {
        const Icon = item.icon;

        return (
          <Button
            key={item.value}
            onClick={() => handleFilter(item.value)}
            className="group bg-muted text-foreground border-border hover:bg-accent flex shrink-0 items-center justify-center gap-2 rounded-full border px-4 py-2 shadow-sm transition-colors hover:border-transparent lg:w-full"
          >
            <Icon
              size={16}
              className="text-foreground transition-colors duration-200"
            />
            <span className="text-sm font-medium">{item.label}</span>
          </Button>
        );
      })}
    </div>
  );
};

export default SearchQuickFilters;
