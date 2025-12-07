"use client";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { BarbershopService } from "@prisma/client";
import { useState } from "react";
import { ReserveSheet } from "@/app/components/reserve-sheet";

interface ServiceItemProps {
  service: BarbershopService & {
    barbershop: {
      name: string;
    };
  };
}

const ServiceItem = ({ service }: ServiceItemProps) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-card border-border flex items-center gap-4 rounded-xl border p-4">
      {/* IMAGEM DO SERVIÇO */}
      <div className="relative h-20 w-20 overflow-hidden rounded-lg">
        <Image
          src={service.imageUrl}
          alt={service.name}
          fill
          className="object-cover"
        />
      </div>

      {/* TEXTOS DO SERVIÇO */}
      <div className="flex-1">
        <h3 className="text-foreground text-sm font-semibold">
          {service.name}
        </h3>

        <p className="text-muted-foreground text-xs">{service.description}</p>

        <p className="text-foreground mt-1 text-sm font-semibold">
          R$ {(service.priceInCents / 100).toFixed(2)}
        </p>
      </div>

      {/* BOTÃO – ABRI SHEET DE SERVA DE HORARIOS */}
      <Button variant="default" onClick={() => setOpen(true)}>
        Reservar
      </Button>

      <ReserveSheet
        open={open}
        onOpenChange={setOpen}
        serviceId={service.id}
        barbershopId={service.barbershopId}
        serviceName={service.name}
        servicePrice={service.priceInCents}
        barbershopName={service.barbershop.name}
      />
    </div>
  );
};

export default ServiceItem;
