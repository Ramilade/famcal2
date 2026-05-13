import { FamilyRole } from "@prisma/client";
import { hashPassword } from "../src/lib/auth/password";
import { prisma } from "../src/lib/db";

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL ?? "admin@example.com";
  const password = process.env.SEED_ADMIN_PASSWORD ?? "change-this-password";
  const name = process.env.SEED_ADMIN_NAME ?? "Admin";
  const familyName = process.env.SEED_FAMILY_NAME ?? "Family";

  const user = await prisma.user.upsert({
    where: { email },
    update: { name },
    create: {
      email,
      name,
      passwordHash: await hashPassword(password),
    },
  });

  const existingMembership = await prisma.familyMember.findFirst({ where: { userId: user.id } });
  const family = existingMembership
    ? await prisma.family.findUniqueOrThrow({ where: { id: existingMembership.familyId } })
    : await prisma.family.create({ data: { name: familyName } });

  await prisma.familyMember.upsert({
    where: { familyId_userId: { familyId: family.id, userId: user.id } },
    update: { role: FamilyRole.admin },
    create: { familyId: family.id, userId: user.id, role: FamilyRole.admin },
  });
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
