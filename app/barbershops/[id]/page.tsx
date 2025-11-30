import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import {
  PageContainer,
  PageSection,
  PageSectionTitle,
} from "@/components/ui/page";
import { ArrowLeft, Smartphone } from "lucide-react";
import { CopyButton } from "../components/copy-button";
import ServiceItem from "../components/service-item";
import { Separator } from "@/components/ui/separator";
import Footer from "@/app/components/footer";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// 📌 ROTA DINÂMICA CORRETA

const BarbershopPage = async (props: PageProps<"/barbershops/[id]">) => {
  // params é Promise → precisa de await
  const { id } = await props.params;

  const barbershop = await prisma.barbershop.findUnique({
    where: { id },
    include: {
      services: true,
    },
  });

  // 📌 BARBEARIA NÃO ENCONTRADA

  if (!barbershop) {
    return (
      <PageContainer>
        <p className="text-foreground">Barbearia não encontrada.</p>
      </PageContainer>
    );
  }

  // 📌 PÁGINA PRINCIPAL

  return (
    <main>
      {/* TOP IMAGE  */}
      <div className="relative h-64 w-full overflow-hidden rounded-b-2xl">
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
          className="object-cover"
        />
      </div>

      <PageContainer>
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
          <PageSectionTitle>Sobre nós</PageSectionTitle>
          <p className="text-muted-foreground text-sm leading-relaxed">
            {barbershop.description}
          </p>
        </PageSection>
        <Separator />

        {/* SERVIÇOS  */}
        <PageSection>
          <PageSectionTitle>Serviços</PageSectionTitle>

          <div className="space-y-4">
            {barbershop.services.map((service) => (
              <ServiceItem key={service.id} service={service} />
            ))}
          </div>
        </PageSection>

        {/* CONTATO */}
        <PageSection>
          <PageSectionTitle>Contato</PageSectionTitle>

          <div className="space-y-2">
            {barbershop.phones.map((phone) => (
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
            ))}
          </div>
        </PageSection>
      </PageContainer>
      <Footer />
    </main>
  );
};

export default BarbershopPage;
