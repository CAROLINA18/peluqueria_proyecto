import 'dotenv/config';
import argon2 from 'argon2';
import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();
const email = (process.env.ADMIN_EMAIL ?? 'admin@linaquirama.local').trim();
const password = process.env.ADMIN_INITIAL_PASSWORD ?? 'ChangeMe123!';

async function main() {
  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
  const admin = await prisma.user.upsert({
    where: { normalizedEmail: email.toLowerCase() },
    update: {},
    create: { name: 'Administración', email, normalizedEmail: email.toLowerCase(), passwordHash, role: Role.ADMIN, mustChangePassword: process.env.NODE_ENV === 'production' },
  });

  const categories = [
    { name: 'Uñas', order: 10 }, { name: 'Masajes', order: 20 }, { name: 'Depilación', order: 30 }, { name: 'Facial', order: 40 }, { name: 'Bonos', order: 50 },
  ];
  const categoryMap = new Map<string, string>();
  for (const item of categories) {
    const row = await prisma.serviceCategory.upsert({
      where: { normalizedName: item.name.toLowerCase() },
      update: {},
      create: { name: item.name, normalizedName: item.name.toLowerCase(), displayOrder: item.order, createdById: admin.id, updatedById: admin.id },
    });
    categoryMap.set(item.name, row.id);
  }

  const methods = [
    ['CARD', 'Tarjeta'], ['CASH', 'Efectivo'], ['GIFT_VOUCHER', 'Bono regalo'], ['TREATWELL', 'Treatwell'], ['PREPAID_VOUCHER', 'Bono pagado'], ['OTHER', 'Otros'],
  ];
  for (const [index, item] of methods.entries()) {
    const [code, name] = item as [string, string];
    await prisma.paymentMethod.upsert({
      where: { normalizedCode: code.toLowerCase() },
      update: {},
      create: { code, normalizedCode: code.toLowerCase(), name, normalizedName: name.toLowerCase(), displayOrder: (index + 1) * 10, createdById: admin.id, updatedById: admin.id },
    });
  }

  const services = [
    ['Manicura básica', 'Uñas', '25.00'], ['Manicura BIAB', 'Uñas', '38.00'], ['Pedicura básica', 'Uñas', '30.00'], ['Pedicura BIAB', 'Uñas', '42.00'],
    ['Masaje 30 min', 'Masajes', '35.00'], ['Masaje 60 min', 'Masajes', '60.00'], ['Depilación cera', 'Depilación', '25.00'], ['Depilación láser', 'Depilación', '55.00'], ['Tratamiento facial', 'Facial', '65.00'], ['Bono regalo', 'Bonos', '50.00'],
  ];
  for (const [name, category, price] of services) {
    await prisma.service.upsert({
      where: { normalizedName: name.toLowerCase() },
      update: {},
      create: { name, normalizedName: name.toLowerCase(), categoryId: categoryMap.get(category), suggestedPrice: price, createdById: admin.id, updatedById: admin.id },
    });
  }
  console.log(`Seed listo. Administrador: ${email}`);
}

main().finally(() => prisma.$disconnect());
