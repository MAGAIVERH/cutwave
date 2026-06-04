import { ArrowLeft, Smartphone } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import Footer from "@/app/components/footer";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  PageContainer,
  PageSection,
  PageSectionTitle,
} from "@/components/ui/page";
import { Separator } from "@/components/ui/separator";
import { prisma } from "@/lib/prisma";

import { CopyButton } from "../components/copy-button";
import ServiceItem from "../components/service-item";

type BarbershopPageProps = {
  params: {
    id: string;
  };
};

const BarbershopPage = async ({
  params,
}: {
  params: Promise<{ id: string }>;
}) => {
  const { id } = await params;

  if (!id) {
    notFound(); // ✅ FINALIZA render corretamente
  }

  const barbershop = await prisma.barbershop.findUnique({
    where: { id },
    include: {
      services: {
        include: {
          barbershop: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  });

  // 📌 BARBEARIA NÃO ENCONTRADA

  if (!barbershop) {
    return (
      <PageContainer>
        <p className="text-foreground">Barbershop not found.</p>
      </PageContainer>
    );
  }

  // 📌 PÁGINA PRINCIPAL

  return (
    <main>
      {/* TOP IMAGE  */}
      <div className="relative h-64 w-full overflow-hidden rounded-b-2xl lg:mx-auto lg:mt-4 lg:h-56 lg:max-w-6xl lg:rounded-2xl">
        <Link
          href="/"
          className="bg-background/80 absolute top-4 left-4 z-20 rounded-full p-2 backdrop-blur-md"
        >
          <ArrowLeft className="text-foreground h-5 w-5" />
        </Link>

        <Image
          src={barbershop.imageUrl}
          alt={barbershop.name}
          fill
          sizes="(max-width: 1024px) 100vw, 1152px"
          className="object-cover lg:object-[center_30%]"
        />

        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 z-10 hidden h-14 bg-linear-to-t from-background via-background/60 to-transparent lg:block"
          aria-hidden
        />
      </div>

      <PageContainer className="lg:pt-4">
        {/* TÍTULO --- */}
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={barbershop.imageUrl} alt={barbershop.name} />
            <AvatarFallback>{barbershop.name.charAt(0)}</AvatarFallback>
          </Avatar>

          <div className="leading-tight">
            <h1 className="text-foreground text-base font-bold">
              {barbershop.name}
            </h1>
            <p className="text-muted-foreground text-xs">
              {barbershop.address}
            </p>
          </div>
        </div>
        <Separator />
        {/* SOBRE NÓS  */}
        <PageSection>
          <PageSectionTitle>About us</PageSectionTitle>
          <p className="text-muted-foreground text-sm leading-relaxed">
            {barbershop.description}
          </p>
        </PageSection>
        <Separator />

        {/* SERVIÇOS  */}
        <PageSection>
          <PageSectionTitle>Services</PageSectionTitle>

          <div className="space-y-4">
            {barbershop.services.map(
              (service: (typeof barbershop.services)[number]) => (
                <ServiceItem key={service.id} service={service} />
              ),
            )}
          </div>
        </PageSection>

        {/* CONTATO */}
        <PageSection>
          <PageSectionTitle>Contact</PageSectionTitle>

          <div className="space-y-2">
            {barbershop.phones.map(
              (phone: (typeof barbershop.phones)[number]) => (
                <div
                  key={phone}
                  className="bg-card border-border flex items-center justify-between rounded-xl border p-4"
                >
                  {/* TELEFONE COM ÍCONE */}
                  <div className="text-foreground flex items-center gap-2 text-sm">
                    <Smartphone className="text-muted-foreground h-4 w-4" />
                    <span>{phone}</span>
                  </div>

                  {/* BOTÃO DE COPIAR */}
                  <CopyButton value={phone} />
                </div>
              ),
            )}
          </div>
        </PageSection>
      </PageContainer>
      <Footer />
    </main>
  );
};

export default BarbershopPage;
