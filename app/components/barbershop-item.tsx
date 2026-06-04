"use client";

import { Barbershop } from "@prisma/client";
import Image from "next/image";
import { useRouter } from "next/navigation";

import { useAuthUI } from "@/app/context/auth-ui-context";
import { authClient } from "@/lib/auth-client";

interface BarbershopItemProps {
  barbershop: Barbershop;
}

const BarbershopItem = ({ barbershop }: BarbershopItemProps) => {
  const router = useRouter();
  const { openAuthSheet } = useAuthUI();
  const { data: session, isPending } = authClient.useSession();

  const handleClick = () => {
    const targetUrl = `/barbershops/${barbershop.id}`;

    // 🔴 se ainda está carregando auth, não faz nada
    if (isPending) return;

    // ❌ NÃO LOGADO → abre Sheet
    if (!session) {
      localStorage.setItem("redirectAfterLogin", targetUrl);
      openAuthSheet();
      return;
    }

    // ✅ LOGADO → navega
    router.push(targetUrl);
  };

  return (
    <div
      onClick={handleClick}
      className="relative min-h-[200px] min-w-[340px] max-lg:shrink-0 cursor-pointer overflow-hidden rounded-xl lg:aspect-[5/3] lg:min-h-[200px] lg:w-full lg:min-w-0"
    >
      <div className="absolute inset-0 z-10 bg-linear-to-t from-black/70 to-transparent" />

      <Image
        src={barbershop.imageUrl}
        alt={barbershop.name}
        fill
        className="object-cover lg:object-[center_35%]"
      />

      <div className="absolute right-0 bottom-0 left-0 z-20 p-4">
        <h3 className="text-background text-lg font-bold">{barbershop.name}</h3>
        <p className="text-background text-xs">{barbershop.address}</p>
      </div>
    </div>
  );
};

export default BarbershopItem;
