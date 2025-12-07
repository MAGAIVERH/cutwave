"use client";

import Image from "next/image";
import { MenuIcon, Home, Calendar, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { authClient } from "@/lib/auth-client";

// ✅ layout do projeto
import {
  PageContainer,
  PageSection,
  PageSectionTitle,
} from "@/components/ui/page";
import { Separator } from "@/components/ui/separator";
import AuthSection from "../authentication/AuthSection";

// ✅ CONTEXTO (novo)
import { useAuthUI } from "@/app/context/auth-ui-context";

const Header = () => {
  const { data: session, isPending } = authClient.useSession();

  // ✅ CONTROLE EXTERNO DO SHEET
  const { isOpen, setOpen } = useAuthUI();

  return (
    <header className="flex items-center justify-between px-5 py-6">
      <Image src="/logo.svg" alt="CutWave" width={100} height={26} />

      {/* ✅ Sheet AGORA CONTROLADO */}
      <Sheet open={isOpen} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" size="icon">
            <MenuIcon />
          </Button>
        </SheetTrigger>

        <SheetContent side="right" className="flex h-full w-[90%] flex-col p-0">
          <SheetHeader className="p-5 pb-0">
            <SheetTitle>Menu</SheetTitle>
          </SheetHeader>

          <div className="px-5">
            <Separator />
          </div>

          <PageContainer className="flex-1 overflow-y-auto">
            {/* LOGIN / USER */}
            <PageSection>
              <div className="flex items-center justify-between rounded-lg">
                <AuthSection session={session} isPending={isPending} />
              </div>
            </PageSection>

            {/* MENU */}
            <PageSection>
              <nav className="space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <Home className="h-4 w-4" />
                  Início
                </div>

                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Agendamentos
                </div>
              </nav>
            </PageSection>

            <Separator />

            {/* CATEGORIAS */}
            <PageSection>
              <PageSectionTitle>Categorias</PageSectionTitle>

              <div className="text-muted-foreground space-y-2 text-sm">
                <p>Cabelo</p>
                <p>Barba</p>
                <p>Acabamento</p>
                <p>Sobrancelha</p>
                <p>Massagem</p>
                <p>Hidratação</p>
              </div>
            </PageSection>

            <Separator />
          </PageContainer>

          {/* LOGOUT */}
          {session && (
            <div className="p-5">
              <Button
                variant="ghost"
                className="w-full justify-start text-sm"
                onClick={() => authClient.signOut()}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sair da conta
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </header>
  );
};

export default Header;
