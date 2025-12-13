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
  MessageCircleIcon,
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
import { useRouter } from "next/navigation";

const Header = () => {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();

  // ✅ CONTROLE EXTERNO DO SHEET
  const { isOpen, setOpen } = useAuthUI();

  const handleFilter = (value: string) => {
    setOpen(false); // fecha o menu
    router.push(`/search?query=${value}`);
  };

  return (
    <header className="flex items-center justify-between px-5 pt-7">
      <Image src="/logo.svg" alt="CutWave" width={100} height={26} />
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon">
          <Link href="/chat">
            <MessageCircleIcon />
          </Link>
        </Button>

        {/* ✅ Sheet AGORA CONTROLADO */}
        <Sheet open={isOpen} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon">
              <MenuIcon />
            </Button>
          </SheetTrigger>

          <SheetContent
            side="right"
            className="flex h-full w-[70%] flex-col p-0"
          >
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
                    className="hover:text-accent flex items-center gap-2 text-sm transition-colors"
                  >
                    <Home className="h-4 w-4" />
                    <span>Início</span>
                  </Link>

                  <Link
                    href="/appointments"
                    onClick={() => setOpen(false)}
                    className="hover:text-accent flex items-center gap-2 text-sm transition-colors"
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

                <button
                  onClick={() => handleFilter("cabelo")}
                  className="hover:text-accent flex w-full items-center gap-2 text-left transition-colors"
                >
                  <Scissors className="hover:text-accent h-4 w-4 transition-colors" />
                  <span className="hover:text-accent transition-colors">
                    Cabelo
                  </span>
                </button>

                <button
                  onClick={() => handleFilter("barba")}
                  className="hover:text-accent flex w-full items-center gap-2 text-left transition-colors"
                >
                  <Slice className="hover:text-accent h-4 w-4 transition-colors" />
                  <span className="hover:text-accent transition-colors">
                    Barba
                  </span>
                </button>

                <button
                  onClick={() => handleFilter("acabamento")}
                  className="hover:text-accent flex w-full items-center gap-2 text-left transition-colors"
                >
                  <Sparkles className="hover:text-accent h-4 w-4 transition-colors" />
                  <span className="hover:text-accent transition-colors">
                    Acabamento
                  </span>
                </button>

                <button
                  onClick={() => handleFilter("sobrancelha")}
                  className="hover:text-accent flex w-full items-center gap-2 text-left transition-colors"
                >
                  <Eye className="hover:text-accent h-4 w-4 transition-colors" />
                  <span className="hover:text-accent transition-colors">
                    Sobrancelha
                  </span>
                </button>

                <button
                  onClick={() => handleFilter("massagem")}
                  className="hover:text-accent flex w-full items-center gap-2 text-left transition-colors"
                >
                  <HandHeart className="hover:text-accent h-4 w-4 transition-colors" />
                  <span className="hover:text-accent transition-colors">
                    Massagem
                  </span>
                </button>

                <button
                  onClick={() => handleFilter("hidratacao")}
                  className="hover:text-accent flex w-full items-center gap-2 text-left transition-colors"
                >
                  <Droplets className="hover:text-accent h-4 w-4 transition-colors" />
                  <span className="hover:text-accent transition-colors">
                    Hidratação
                  </span>
                </button>
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
      </div>
    </header>
  );
};

export default Header;
