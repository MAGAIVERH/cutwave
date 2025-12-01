"use client";

import Image from "next/image";
import { LogInIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

type AuthSectionProps = {
  session: any;
  isPending: boolean;
};

const AuthSection = ({ session, isPending }: AuthSectionProps) => {
  if (isPending) {
    return <p className="text-muted-foreground text-sm">Carregando...</p>;
  }

  if (!session) {
    return (
      <>
        <p className="text-muted-foreground text-sm font-bold">
          Olá. Faça seu login!
        </p>

        <Button
          className="rounded-2xl"
          size="sm"
          onClick={() => authClient.signIn.social({ provider: "google" })}
        >
          Login <LogInIcon />
        </Button>
      </>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <div className="bg-muted h-9 w-9 overflow-hidden rounded-full">
        {session.user.image ? (
          <Image
            src={session.user.image}
            alt={session.user.name ?? "Avatar"}
            width={36}
            height={36}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm font-medium">
            {session.user.name?.charAt(0)}
          </div>
        )}
      </div>

      <div className="leading-tight">
        <p className="text-sm font-medium">{session.user.name}</p>
        <p className="text-muted-foreground text-xs">{session.user.email}</p>
      </div>
    </div>
  );
};
export default AuthSection;
