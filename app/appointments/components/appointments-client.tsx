"use client";

import { useState } from "react";
import BookingItem, {
  BookingWithRelations,
} from "@/app/components/booking-item";

import { Separator } from "@/components/ui/separator";
import BookingDetailsSheet from "./booking-details-sheet";

interface AppointmentsClientProps {
  confirmed: BookingWithRelations[];
  finished: BookingWithRelations[];
}

const AppointmentsClient = ({
  confirmed,
  finished,
}: AppointmentsClientProps) => {
  const [selectedBooking, setSelectedBooking] =
    useState<BookingWithRelations | null>(null);

  const [isSheetOpen, setIsSheetOpen] = useState(false);

  return (
    <>
      {/* CONFIRMADOS */}
      {confirmed.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-muted-foreground text-xs font-semibold uppercase">
            Confirmados
          </h2>

          {confirmed.map((booking) => (
            <div
              key={booking.id}
              className="cursor-pointer"
              onClick={() => {
                setSelectedBooking(booking);
                setIsSheetOpen(true);
              }}
            >
              <BookingItem booking={booking} status="confirmed" />
            </div>
          ))}
        </section>
      )}

      {confirmed.length > 0 && finished.length > 0 && <Separator />}

      {/* FINALIZADOS */}
      {finished.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-muted-foreground text-xs font-semibold uppercase">
            Finalizados
          </h2>

          {finished.map((booking) => (
            <BookingItem key={booking.id} booking={booking} status="finished" />
          ))}
        </section>
      )}

      {/* SHEET */}
      <BookingDetailsSheet
        booking={selectedBooking}
        open={isSheetOpen}
        onOpenChange={setIsSheetOpen}
      />
    </>
  );
};

export default AppointmentsClient;
