"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Scissors, Slice, Brush, Eye, Sparkles, Droplets } from "lucide-react";

const filters = [
  { label: "Cabelo", icon: Scissors, value: "cabelo" },
  { label: "Barba", icon: Slice, value: "barba" },
  { label: "Sobrancelha", icon: Eye, value: "sobrancelha" },
  { label: "Massagem", icon: Sparkles, value: "massagem" },
  { label: "Acabamento", icon: Brush, value: "acabamento" },
  { label: "Hidratação", icon: Droplets, value: "hidratacao" },
];

const SearchQuickFilters = () => {
  const router = useRouter();

  const handleFilter = (value: string) => {
    router.push(`/search?query=${value}`);
  };

  return (
    <div className="flex gap-3">
      {filters.map((item) => {
        const Icon = item.icon;

        return (
          <Button
            key={item.value}
            onClick={() => handleFilter(item.value)}
            className="group bg-muted text-foreground border-border hover:bg-accent flex items-center gap-2 rounded-full border px-4 py-2 shadow-sm transition-colors hover:border-transparent"
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
