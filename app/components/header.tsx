"use client";

import type { LucideIcon } from "lucide-react";
import {
  Calendar,
  Droplets,
  Eye,
  HandHeart,
  Home,
  LogOut,
  MenuIcon,
  MessageCircleIcon,
  Scissors,
  Slice,
  Sparkles,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { useAuthUI } from "@/app/context/auth-ui-context";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { CATEGORY_SLUGS, type CategorySlug } from "@/lib/search-categories";
import { authClient } from "@/lib/auth-client";

import AuthSection from "../authentication/AuthSection";

const NAV_LINKS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/appointments", label: "Appointments", icon: Calendar },
] as const;

const CATEGORY_ITEMS: {
  slug: CategorySlug;
  label: string;
  icon: LucideIcon;
}[] = [
  { slug: "cabelo", label: CATEGORY_SLUGS.cabelo.label, icon: Scissors },
  { slug: "barba", label: CATEGORY_SLUGS.barba.label, icon: Slice },
  { slug: "acabamento", label: CATEGORY_SLUGS.acabamento.label, icon: Sparkles },
  { slug: "sobrancelha", label: CATEGORY_SLUGS.sobrancelha.label, icon: Eye },
  { slug: "massagem", label: CATEGORY_SLUGS.massagem.label, icon: HandHeart },
  { slug: "hidratacao", label: CATEGORY_SLUGS.hidratacao.label, icon: Droplets },
];

const menuNavLinkClass =
  "hover:text-accent flex items-center gap-2 text-sm transition-colors max-lg:py-0.5";

const menuCategoryButtonClass =
  "hover:text-accent flex w-full items-center gap-2 text-left text-sm transition-colors max-lg:py-0.5";

const Header = () => {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const { isOpen, setOpen } = useAuthUI();

  const handleFilter = (value: CategorySlug) => {
    setOpen(false);
    router.push(`/search?query=${value}`);
  };

  const closeMenu = () => setOpen(false);

  return (
    <header className="flex w-full items-center justify-between px-5 pt-7 lg:mx-auto lg:max-w-6xl">
      <Link href="/" aria-label="Go to home" className="cursor-pointer">
        <Image src="/logo.svg" alt="CutWave" width={100} height={26} />
      </Link>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon">
          <Link href="/chat">
            <MessageCircleIcon />
          </Link>
        </Button>

        <Sheet open={isOpen} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon">
              <MenuIcon />
            </Button>
          </SheetTrigger>

          <SheetContent
            side="right"
            className={cn(
              "flex h-full flex-col gap-0 p-0 sm:max-w-none",
              "w-[70%] max-lg:max-w-[min(320px,85vw)]",
              "lg:w-[min(32rem,42vw)] lg:max-w-[32rem]",
            )}
          >
            <SheetHeader className="border-border/60 space-y-1 border-b px-5 pt-6 pb-5 lg:px-8">
              <SheetTitle className="text-lg tracking-tight lg:text-xl">
                Menu
              </SheetTitle>
              <p className="text-muted-foreground hidden text-sm lg:block">
                Browse services and manage your bookings
              </p>
            </SheetHeader>

            <div className="scrollbar-hide flex flex-1 flex-col overflow-y-auto">
              <div className="space-y-6 px-5 py-6 lg:space-y-8 lg:px-8 lg:py-8">
                {/* Auth */}
                <section
                  className={cn(
                    "max-lg:flex max-lg:items-center max-lg:justify-between max-lg:gap-3",
                    "lg:bg-muted/35 lg:border-border/60 lg:flex lg:flex-col lg:gap-4 lg:rounded-2xl lg:border lg:p-5",
                    "lg:[&_button]:w-full lg:[&_button]:justify-center",
                  )}
                >
                  <AuthSection session={session} isPending={isPending} />
                </section>

                {/* Primary nav */}
                <section className="space-y-3">
                  <p className="text-muted-foreground hidden text-[11px] font-semibold tracking-widest uppercase lg:block">
                    Navigation
                  </p>
                  <nav
                    className={cn(
                      "space-y-3 text-sm",
                      "lg:grid lg:grid-cols-2 lg:gap-3 lg:space-y-0",
                    )}
                  >
                    {NAV_LINKS.map(({ href, label, icon: Icon }) => (
                      <Link
                        key={href}
                        href={href}
                        onClick={closeMenu}
                        className={cn(
                          menuNavLinkClass,
                          "lg:hover:border-primary/25 lg:hover:bg-muted/60 lg:border-border/60 lg:bg-background lg:flex lg:rounded-xl lg:border lg:px-4 lg:py-3.5 lg:transition-all",
                        )}
                      >
                        <span className="lg:bg-primary/10 lg:text-primary flex h-8 w-8 shrink-0 items-center justify-center rounded-lg lg:rounded-md">
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className="lg:font-medium">{label}</span>
                      </Link>
                    ))}
                  </nav>
                </section>

                <Separator className="max-lg:block lg:hidden" />

                {/* Categories */}
                <section className="space-y-3">
                  <p
                    className={cn(
                      "text-foreground text-xs font-bold uppercase",
                      "lg:text-muted-foreground lg:text-[11px] lg:tracking-widest",
                    )}
                  >
                    Categories
                  </p>
                  <div
                    className={cn(
                      "space-y-3",
                      "lg:grid lg:grid-cols-2 lg:gap-2.5 lg:space-y-0",
                    )}
                  >
                    {CATEGORY_ITEMS.map(({ slug, label, icon: Icon }) => (
                      <button
                        key={slug}
                        type="button"
                        onClick={() => handleFilter(slug)}
                        className={cn(
                          menuCategoryButtonClass,
                          "lg:hover:border-primary/25 lg:hover:bg-muted/60 lg:group lg:border-border/60 lg:bg-background lg:rounded-xl lg:border lg:p-3.5 lg:transition-all",
                        )}
                      >
                        <span className="lg:bg-primary/10 lg:group-hover:bg-primary/15 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors">
                          <Icon className="text-foreground lg:text-primary h-4 w-4" />
                        </span>
                        <span className="lg:font-medium">{label}</span>
                      </button>
                    ))}
                  </div>
                </section>
              </div>
            </div>

            {session && (
              <div className="border-border/60 border-t px-5 py-5 lg:px-8">
                <Button
                  variant="outline"
                  className="w-full justify-center rounded-xl text-sm lg:h-11"
                  onClick={() => authClient.signOut()}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
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
