import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

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

  // ▶ info de conflito global (outro agendamento do mesmo usuário)
  const [conflictInfo, setConflictInfo] = useState<null | {
    barbershopName?: string;
    serviceName?: string;
    date?: string;
  }>(null);

  // ▶ controla abertura do AlertDialog
  const [isConflictDialogOpen, setIsConflictDialogOpen] = useState(false);

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
  // const handleConfirm = async () => {
  //   if (!selectedDate || !selectedHour) return;

  //   const [h, m] = selectedHour.split(":").map(Number);

  //   const bookingDate = new Date(selectedDate);
  //   bookingDate.setHours(h, m, 0, 0);

  //   const response = await fetch("/api/bookings", {
  //     method: "POST",
  //     headers: { "Content-Type": "application/json" },
  //     body: JSON.stringify({
  //       barbershopId,
  //       serviceId,
  //       date: bookingDate,
  //     }),
  //   });

  //   if (!response.ok) {
  //     // 👉 se o backend disser que é conflito de agendamento do usuário
  //     if (response.status === 409) {
  //       const data = await response.json();

  //       if (data?.error === "USER_BOOKING_CONFLICT") {
  //         setConflictInfo(data.conflict);
  //         setIsConflictDialogOpen(true);
  //         // não precisa alert() aqui
  //         return;
  //       }
  //     }

  //     // fallback genérico para outros erros (ex: horário ocupado na barbearia)
  //     alert("Esse horário já está ocupado.");
  //     setSelectedHour(null);
  //     return;
  //   }

  //   // ✅ SUCESSO — RESERVA CRIADA
  //   toast.success("Agendamento realizado com sucesso!");

  //   // ✅ limpa estados locais
  //   setSelectedHour(null);
  //   setSelectedDate(new Date());

  //   // ✅ fecha o sheet
  //   onOpenChange(false);
  // };

  // Confirmar Reserva
  const handleConfirm = async () => {
    // 1. Validação simples (igual antes)
    if (!selectedDate || !selectedHour) return;

    // 2. Monta o horário igual ao seu fluxo atual
    const [h, m] = selectedHour.split(":").map(Number);
    const bookingDate = new Date(selectedDate);
    bookingDate.setHours(h, m, 0, 0);

    // 3. Chamada para o backend — AGORA usando Stripe
    const response = await fetch(
      "/api/stripe/create-booking-checkout-session",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId,
          date: bookingDate,
        }),
      },
    );

    // 4. Se houve erro no backend (ex: conflito)
    if (!response.ok) {
      if (response.status === 409) {
        const data = await response.json();
        if (data?.error === "USER_BOOKING_CONFLICT") {
          setConflictInfo(data.conflict);
          setIsConflictDialogOpen(true);
          return;
        }
      }

      toast.error("Não foi possível iniciar o pagamento.");
      return;
    }

    // 5. Backend retornou sucesso → Stripe retorna uma URL
    const data = await response.json();

    if (!data.url) {
      toast.error("Sessão de pagamento inválida.");
      return;
    }

    // 6. Antes de redirecionar → FECHA O SHEET IGUAL O ORIGINAL
    onOpenChange(false);

    // 7. Redireciona para o Stripe Checkout
    window.location.href = data.url;
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex h-full w-[80%] flex-col p-0">
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

      {/* ALERTA DE CONFLITO DE AGENDAMENTO */}
      <AlertDialog
        open={isConflictDialogOpen}
        onOpenChange={setIsConflictDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você já possui um agendamento</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>Você já tem um serviço agendado nesse mesmo horário.</p>

              {conflictInfo && (
                <div className="bg-muted space-y-1 rounded-lg p-3 text-sm">
                  {conflictInfo.barbershopName && (
                    <p>
                      <span className="font-semibold">Barbearia: </span>
                      {conflictInfo.barbershopName}
                    </p>
                  )}
                  {conflictInfo.serviceName && (
                    <p>
                      <span className="font-semibold">Serviço: </span>
                      {conflictInfo.serviceName}
                    </p>
                  )}
                  {conflictInfo.date && (
                    <p>
                      <span className="font-semibold">Data: </span>
                      {new Date(conflictInfo.date).toLocaleString("pt-BR")}
                    </p>
                  )}
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogAction>Entendi</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Sheet>
  );
};
