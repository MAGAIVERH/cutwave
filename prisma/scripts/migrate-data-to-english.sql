-- Run on existing databases with Portuguese seed data (preserves bookings).
-- Example: psql $DATABASE_URL -f prisma/scripts/migrate-data-to-english.sql

UPDATE "BarbershopService" SET name = 'Haircut', description = 'Personalized style with the latest trends.' WHERE name = 'Corte de Cabelo';
UPDATE "BarbershopService" SET name = 'Beard', description = 'Full shaping to highlight your look.' WHERE name = 'Barba';
UPDATE "BarbershopService" SET name = 'Lineup', description = 'Clean neckline finish for a fresh look.' WHERE name = 'Pézinho';
UPDATE "BarbershopService" SET name = 'Eyebrows', description = 'Precise shaping for a defined expression.' WHERE name = 'Sobrancelha';
UPDATE "BarbershopService" SET name = 'Massage', description = 'Relax with a revitalizing massage.' WHERE name = 'Massagem';
UPDATE "BarbershopService" SET name = 'Hydration', description = 'Deep hydration for hair and beard.' WHERE name = 'Hidratação';

UPDATE "Barbershop" SET name = 'Vintage Barber Shop' WHERE name = 'Barbearia Vintage';
UPDATE "Barbershop" SET name = 'Cut & Style' WHERE name = 'Corte & Estilo';
UPDATE "Barbershop" SET name = 'Beard & Razor' WHERE name = 'Barba & Navalha';
UPDATE "Barbershop" SET name = 'The Dapper Den' WHERE name = 'The Dapper Den';
UPDATE "Barbershop" SET name = 'Hair & Co.' WHERE name = 'Cabelo & Cia.';
UPDATE "Barbershop" SET name = 'Axe & Scissors' WHERE name = 'Machado & Tesoura';
UPDATE "Barbershop" SET name = 'Elegance Barbershop' WHERE name = 'Barbearia Elegance';
UPDATE "Barbershop" SET name = 'Impeccable Look' WHERE name = 'Aparência Impecável';
UPDATE "Barbershop" SET name = 'Urban Style' WHERE name = 'Estilo Urbano';
UPDATE "Barbershop" SET name = 'Classic Style' WHERE name = 'Estilo Clássico';

UPDATE "Barbershop" SET address = 'Barber Street, 123' WHERE address = 'Rua da Barbearia, 123';
UPDATE "Barbershop" SET address = 'Cuts Avenue, 456' WHERE address = 'Avenida dos Cortes, 456';
UPDATE "Barbershop" SET address = 'Beard Square, 789' WHERE address = 'Praça da Barba, 789';
UPDATE "Barbershop" SET address = 'Razor Lane, 101' WHERE address = 'Travessa da Navalha, 101';
UPDATE "Barbershop" SET address = 'Styles Boulevard, 202' WHERE address = 'Alameda dos Estilos, 202';
UPDATE "Barbershop" SET address = 'Axe Road, 303' WHERE address = 'Estrada do Machado, 303';
UPDATE "Barbershop" SET address = 'Elegant Avenue, 404' WHERE address = 'Avenida Elegante, 404';
UPDATE "Barbershop" SET address = 'Appearance Plaza, 505' WHERE address = 'Praça da Aparência, 505';
UPDATE "Barbershop" SET address = 'Urban Street, 606' WHERE address = 'Rua Urbana, 606';
UPDATE "Barbershop" SET address = 'Classic Avenue, 707' WHERE address = 'Avenida Clássica, 707';
