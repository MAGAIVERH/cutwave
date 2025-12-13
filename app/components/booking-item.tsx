// import { Avatar, AvatarImage } from "@/components/ui/avatar";
// import { Badge } from "@/components/ui/badge";
// import { Card } from "@/components/ui/card";

// interface BookingItemProps {
//   serviceName: string;
//   barbershopName: string;
//   barbershopImageUrl: string;
//   date: Date;
// }

// const BookingItem = ({
//   serviceName,
//   barbershopName,
//   barbershopImageUrl,
//   date,
// }: BookingItemProps) => {
//   return (
//     <Card className="flex w-full min-w-full flex-row items-center justify-between p-0">
//       {/* Esquerda */}
//       <div className="flex flex-1 flex-col gap-4 p-4">
//         <Badge>Confirmado</Badge>

//         <div className="flex flex-col gap-2">
//           <p className="font-bold">{serviceName}</p>
//           <div className="flex items-center gap-2">
//             <Avatar className="h-6 w-6">
//               <AvatarImage src={barbershopImageUrl} />
//             </Avatar>
//             <p className="text-muted-foreground text-sm">{barbershopName}</p>
//           </div>
//         </div>
//       </div>

//       {/* Direita */}
//       <div className="flex h-full flex-col items-center justify-center border-l p-4 py-3">
//         <p className="text-xs capitalize">
//           {date.toLocaleDateString("pt-br", { month: "long" })}
//         </p>
//         <p>{date.toLocaleDateString("pt-br", { day: "2-digit" })}</p>
//         <p className="text-xs capitalize">
//           {date.toLocaleTimeString("pt-br", {
//             hour: "2-digit",
//             minute: "2-digit",
//           })}
//         </p>
//       </div>
//     </Card>
//   );
// };

// export default BookingItem;
import { Booking } from "@prisma/client";

import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

export interface BookingWithRelations extends Booking {
  service: {
    name: string;
    priceInCents: number;
  };
  barbershop: {
    name: string;
    imageUrl: string;
    address: string;
    phones: string[];
  };
}

interface BookingItemProps {
  booking: BookingWithRelations;
  status?: "confirmed" | "finished";
}

const BookingItem = ({ booking, status = "confirmed" }: BookingItemProps) => {
  const label = status === "finished" ? "Finalizado" : "Confirmado";

  return (
    <Card className="flex w-full min-w-[85%] flex-row items-center justify-between p-0">
      {/* ESQUERDA */}
      <div className="flex flex-1 flex-col gap-3 p-4">
        <Badge variant={status === "finished" ? "secondary" : "default"}>
          {label}
        </Badge>

        <div>
          <p className="font-semibold">{booking.service.name}</p>

          <div className="mt-1 flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarImage src={booking.barbershop.imageUrl} />
            </Avatar>

            <span className="text-muted-foreground text-sm">
              {booking.barbershop.name}
            </span>
          </div>
        </div>
      </div>

      {/* DIREITA */}
      <div className="flex flex-col items-center justify-center border-l px-4">
        <p className="text-xs capitalize">
          {booking.date.toLocaleDateString("pt-BR", { month: "long" })}
        </p>

        <p className="text-lg font-bold">
          {booking.date.toLocaleDateString("pt-BR", { day: "2-digit" })}
        </p>

        <p className="text-xs">
          {booking.date.toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>
    </Card>
  );
};

export default BookingItem;
