import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SERVICE_UPDATES: [string, { name: string; description: string }][] = [
  [
    "Corte de Cabelo",
    {
      name: "Haircut",
      description: "Personalized style with the latest trends.",
    },
  ],
  [
    "Barba",
    { name: "Beard", description: "Full shaping to highlight your look." },
  ],
  [
    "Pézinho",
    {
      name: "Lineup",
      description: "Clean neckline finish for a fresh look.",
    },
  ],
  [
    "Sobrancelha",
    {
      name: "Eyebrows",
      description: "Precise shaping for a defined expression.",
    },
  ],
  [
    "Massagem",
    {
      name: "Massage",
      description: "Relax with a revitalizing massage.",
    },
  ],
  [
    "Hidratação",
    {
      name: "Hydration",
      description: "Deep hydration for hair and beard.",
    },
  ],
];

const BARBERSHOP_NAME_UPDATES: [string, string][] = [
  ["Barbearia Vintage", "Vintage Barber Shop"],
  ["Corte & Estilo", "Cut & Style"],
  ["Barba & Navalha", "Beard & Razor"],
  ["Cabelo & Cia.", "Hair & Co."],
  ["Machado & Tesoura", "Axe & Scissors"],
  ["Barbearia Elegance", "Elegance Barbershop"],
  ["Aparência Impecável", "Impeccable Look"],
  ["Estilo Urbano", "Urban Style"],
  ["Estilo Clássico", "Classic Style"],
];

const ADDRESS_UPDATES: [string, string][] = [
  ["Rua da Barbearia, 123", "Barber Street, 123"],
  ["Avenida dos Cortes, 456", "Cuts Avenue, 456"],
  ["Praça da Barba, 789", "Beard Square, 789"],
  ["Travessa da Navalha, 101", "Razor Lane, 101"],
  ["Alameda dos Estilos, 202", "Styles Boulevard, 202"],
  ["Estrada do Machado, 303", "Axe Road, 303"],
  ["Avenida Elegante, 404", "Elegant Avenue, 404"],
  ["Praça da Aparência, 505", "Appearance Plaza, 505"],
  ["Rua Urbana, 606", "Urban Street, 606"],
  ["Avenida Clássica, 707", "Classic Avenue, 707"],
];

async function main() {
  let updated = 0;

  for (const [oldName, data] of SERVICE_UPDATES) {
    const result = await prisma.barbershopService.updateMany({
      where: { name: oldName },
      data,
    });
    updated += result.count;
  }

  for (const [oldName, newName] of BARBERSHOP_NAME_UPDATES) {
    const result = await prisma.barbershop.updateMany({
      where: { name: oldName },
      data: { name: newName },
    });
    updated += result.count;
  }

  for (const [oldAddress, newAddress] of ADDRESS_UPDATES) {
    const result = await prisma.barbershop.updateMany({
      where: { address: oldAddress },
      data: { address: newAddress },
    });
    updated += result.count;
  }

  console.log(`Migration complete. ${updated} row(s) updated.`);
}

main()
  .catch((error) => {
    console.error("Migration failed:", error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
