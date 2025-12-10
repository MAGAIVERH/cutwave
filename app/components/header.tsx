"use client";

import Image from "next/image";
import {
  MenuIcon,
  Home,
  Calendar,
  LogOut,
  Scissors,
  Sparkles,
  Eye,
  HandHeart,
  Droplets,
  Slice,
} from "lucide-react";
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
import Link from "next/link";

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

        <SheetContent side="right" className="flex h-full w-[80%] flex-col p-0">
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
                <Link
                  href="/"
                  onClick={() => setOpen(false)}
                  className="hover:text-foreground flex items-center gap-2 text-sm transition-colors"
                >
                  <Home className="h-4 w-4" />
                  <span>Início</span>
                </Link>

                <Link
                  href="/appointments"
                  onClick={() => setOpen(false)}
                  className="hover:text-foreground flex items-center gap-2 text-sm transition-colors"
                >
                  <Calendar className="h-4 w-4" />
                  <span>Agendamentos</span>
                </Link>
              </nav>
            </PageSection>

            <Separator />

            {/* CATEGORIAS */}
            <PageSection>
              <PageSectionTitle>Categorias</PageSectionTitle>

              <div className="text-muted-foreground space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Scissors className="h-4 w-4" />
                  <span>Cabelo</span>
                </div>

                <div className="flex items-center gap-2">
                  <Slice className="h-4 w-4" />
                  <span>Barba</span>
                </div>

                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  <span>Acabamento</span>
                </div>

                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  <span>Sobrancelha</span>
                </div>

                <div className="flex items-center gap-2">
                  <HandHeart className="h-4 w-4" />
                  <span>Massagem</span>
                </div>

                <div className="flex items-center gap-2">
                  <Droplets className="h-4 w-4" />
                  <span>Hidratação</span>
                </div>
              </div>
            </PageSection>

            <Separator />
          </PageContainer>

          {/* LOGOUT */}

          {session && (
            <div className="p-5">
              <Button
                className="justify-start rounded-2xl text-sm"
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
