import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type ReserveSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;

  barbershopId: string;
  serviceId: string;

  serviceName: string;
  servicePrice: number;
  barbershopName: string;
};

const MOCK_HOURS = [
  "08:00",
  "08:30",
  "09:00",
  "09:30",
  "10:00",
  "10:30",
  "11:00",
  "11:30",
  "13:00",
  "13:30",
  "14:00",
  "14:30",
  "15:00",
  "15:30",
  "16:00",
  "16:30",
  "17:00",
];

export const ReserveSheet = ({
  open,
  onOpenChange,
  barbershopId,
  serviceId,
  serviceName,
  servicePrice,
  barbershopName,
}: ReserveSheetProps) => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    new Date(),
  );
  const [selectedHour, setSelectedHour] = useState<string | null>(null);

  // ▶ horários já ocupados vindos do backend
  const [bookedHours, setBookedHours] = useState<string[]>([]);

  /* HANDLERS */

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    setSelectedHour(null);
  };

  const handleHourSelect = (hour: string) => {
    setSelectedHour(hour);
  };

  const isConfirmEnabled =
    Boolean(selectedDate && selectedHour) &&
    !bookedHours.includes(selectedHour ?? "");

  /* FORMATAÇÕES */

  const formattedDate = selectedDate
    ? format(selectedDate, "dd 'de' MMMM", { locale: ptBR })
    : "";

  /* REGRA 1: HORÁRIOS QUE NÃO PASSARAM */

  const now = new Date();

  const availableHours = MOCK_HOURS.filter((hour) => {
    if (!selectedDate) return false;

    const [h, m] = hour.split(":").map(Number);

    const slotDate = new Date(selectedDate);
    slotDate.setHours(h, m, 0, 0);

    // se for hoje, só horários futuros
    if (slotDate.toDateString() === now.toDateString() && slotDate <= now) {
      return false;
    }

    return true;
  });

  /* REGRA 2: BUSCAR HORÁRIOS OCUPADOS */

  useEffect(() => {
    if (!selectedDate) return;

    const fetchBookedHours = async () => {
      // usamos timestamp para evitar problema de fuso
      const timestamp = selectedDate.getTime();

      const response = await fetch(
        `/api/bookings?barbershopId=${barbershopId}&serviceId=${serviceId}&timestamp=${timestamp}`,
      );

      if (!response.ok) {
        setBookedHours([]);
        return;
      }

      const data: string[] = await response.json();
      setBookedHours(data);

      // se o horário selecionado acabou de ser marcado como ocupado, limpa
      if (selectedHour && data.includes(selectedHour)) {
        setSelectedHour(null);
      }
    };

    fetchBookedHours();
  }, [selectedDate, barbershopId, serviceId, selectedHour]);

  /* CONFIRMAR RESERVA */

  const handleConfirm = async () => {
    if (!selectedDate || !selectedHour) return;

    const [h, m] = selectedHour.split(":").map(Number);

    const bookingDate = new Date(selectedDate);
    bookingDate.setHours(h, m, 0, 0);

    const response = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        barbershopId,
        serviceId,
        date: bookingDate,
      }),
    });

    if (!response.ok) {
      alert("Esse horário já está ocupado.");

      // 🔁 atualiza lista de horários ocupados
      const dateISO = selectedDate.toISOString().split("T")[0];

      const res = await fetch(
        `/api/bookings?barbershopId=${barbershopId}&serviceId=${serviceId}&date=${dateISO}`,
      );

      const data: string[] = await res.json();
      setBookedHours(data);
      setSelectedHour(null);

      return;
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex h-full w-[90%] flex-col p-0">
        {/* HEADER */}
        <SheetHeader className="border-b p-4">
          <SheetTitle>Fazer Reserva</SheetTitle>
        </SheetHeader>

        {/* CONTEÚDO */}
        <div className="flex-1 overflow-y-auto px-4">
          {/* CALENDÁRIO */}
          <div className="mt-4">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={handleDateSelect}
              locale={ptBR}
              className="w-full"
              // bloqueia dias passados
              disabled={(date) => {
                const today = new Date();
                today.setHours(0, 0, 0, 0);

                const d = new Date(date);
                d.setHours(0, 0, 0, 0);

                return d < today;
              }}
            />
          </div>

          {/* HORÁRIOS */}
          {selectedDate && (
            <>
              <Separator className="my-4" />

              <div className="flex snap-x snap-mandatory gap-2 overflow-x-auto pb-2 [&::-webkit-scrollbar]:hidden">
                {availableHours.map((hour) => {
                  const isBooked = bookedHours.includes(hour);

                  return (
                    <Button
                      key={hour}
                      disabled={isBooked}
                      variant={selectedHour === hour ? "default" : "outline"}
                      className={`min-w-[72px] snap-start rounded-full ${
                        isBooked ? "cursor-not-allowed opacity-40" : ""
                      }`}
                      onClick={() => {
                        if (!isBooked) handleHourSelect(hour);
                      }}
                    >
                      {hour}
                    </Button>
                  );
                })}
              </div>

              <Separator className="my-4" />
            </>
          )}

          {/* RESUMO */}
          {isConfirmEnabled && (
            <>
              <Separator className="my-4" />

              <div className="space-y-2 rounded-lg border p-4 text-sm">
                <div className="flex justify-between font-medium">
                  <span>{serviceName}</span>
                  <span>
                    {(servicePrice / 100).toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
                  </span>
                </div>

                <div className="text-muted-foreground flex justify-between">
                  <span>Data</span>
                  <span>{formattedDate}</span>
                </div>

                <div className="text-muted-foreground flex justify-between">
                  <span>Horário</span>
                  <span>{selectedHour}</span>
                </div>

                <div className="text-muted-foreground flex justify-between">
                  <span>Barbearia</span>
                  <span>{barbershopName}</span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* BOTÃO */}
        <div className="border-t p-4">
          <Button
            className="w-full rounded-full"
            disabled={!isConfirmEnabled}
            onClick={handleConfirm}
          >
            Confirmar
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};
