"use client";

import { Smartphone } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { CopyButton } from "@/app/barbershops/components/copy-button";
import { BookingWithRelations } from "@/app/components/booking-item";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  PageContainer,
  PageSection,
  PageSectionTitle,
} from "@/components/ui/page";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import mapImage from "@/public/map.png";

interface BookingDetailsSheetProps {
  booking: BookingWithRelations | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const BookingDetailsSheet = ({
  booking,
  open,
  onOpenChange,
}: BookingDetailsSheetProps) => {
  const router = useRouter();

  const [isCancelling, setIsCancelling] = useState(false);

  if (!booking) return null;

  const handleCancel = async () => {
    setIsCancelling(true);

    try {
      const res = await fetch("/api/bookings/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: booking.id }),
      });

      if (!res.ok) {
        throw new Error();
      }

      toast.success("Reserva cancelada com sucesso.");

      onOpenChange(false); // fecha o sheet (mesmo comportamento do Voltar)
      router.refresh(); // FORÇA atualizar a page
    } catch {
      toast.error("Não foi possível cancelar a reserva.");
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex h-full w-[80%] p-0">
        {/* HEADER */}
        <div className="border-b px-5 py-4">
          <SheetTitle>Informações da Reserva</SheetTitle>
          {/* <h2 className="text-sm font-semibold">Informações da Reserva</h2> */}
        </div>

        {/* CONTEÚDO PADRONIZADO */}
        <PageContainer className="flex-1 pt-4">
          <PageSection>
            {/* CONTAINER DO MAPA */}
            <div className="relative">
              <div className="relative h-36 w-full overflow-hidden rounded-xl">
                <Image
                  src={mapImage}
                  alt="Mapa"
                  fill
                  className="object-cover"
                  priority
                />
              </div>

              {/* CARD FLUTUANTE SOBRE O MAPA */}
              <div className="absolute top-14 right-4 left-4">
                <div className="bg-background flex items-center gap-3 rounded-xl border p-3 shadow-sm">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={booking.barbershop.imageUrl} />
                    <AvatarFallback>
                      {booking.barbershop.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="leading-tight">
                    <p className="text-sm font-medium">
                      {booking.barbershop.name}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {booking.barbershop.address}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* ESPAÇO PARA NÃO COLIDIR COM O CONTEÚDO ABAIXO */}
          </PageSection>

          {/* RESUMO DA RESERVA */}
          <PageSection>
            {/* BADGE */}

            <Badge className="mb-2 w-fit">Confirmado</Badge>

            {/* CARD */}
            <div className="space-y-3 rounded-xl border p-4 text-sm">
              {/* SERVIÇO + PREÇO */}
              <div className="flex items-center justify-between font-bold">
                <span>{booking.service.name}</span>
                <span>
                  {(booking.service.priceInCents / 100).toLocaleString(
                    "pt-BR",
                    {
                      style: "currency",
                      currency: "BRL",
                    },
                  )}
                </span>
              </div>

              {/* DATA */}
              <div className="text-muted-foreground flex justify-between">
                <span>Data</span>
                <span>
                  {booking.date.toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "long",
                  })}
                </span>
              </div>

              {/* HORÁRIO */}
              <div className="text-muted-foreground flex justify-between">
                <span>Horário</span>
                <span>
                  {booking.date.toLocaleTimeString("pt-BR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>

              {/* BARBEARIA */}
              <div className="text-muted-foreground flex justify-between">
                <span>Barbearia</span>
                <span>{booking.barbershop.name}</span>
              </div>
            </div>
          </PageSection>

          {/* CONTATOS */}
          <PageSection>
            <PageSectionTitle>Contato</PageSectionTitle>

            {booking.barbershop.phones.map((phone) => (
              <div
                key={phone}
                className="flex items-center justify-between rounded-xl border p-3 text-sm"
              >
                <div className="text-foreground flex items-center gap-2 text-sm">
                  <Smartphone className="text-muted-foreground h-4 w-4" />
                  <span>{phone}</span>
                </div>

                <CopyButton value={phone} />
              </div>
            ))}
          </PageSection>
        </PageContainer>

        {/* FOOTER COM BOTÕES — FIXO */}
        <Separator />
        <div className="flex gap-3 px-5 pb-5">
          <Button
            variant="outline"
            className="w-1/2 rounded-2xl"
            onClick={() => onOpenChange(false)}
          >
            Voltar
          </Button>

          <Button
            variant="destructive"
            className="w-1/2 rounded-2xl"
            onClick={handleCancel}
            disabled={isCancelling}
          >
            {isCancelling ? "Cancelando..." : "Cancelar Reserva"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default BookingDetailsSheet;
