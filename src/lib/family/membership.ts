type Membership = { id: string; userId: string; familyId: string; role: "admin" | "member" };

type MembershipPrisma = {
  familyMember: {
    findFirst(args: unknown): Promise<Membership | null>;
  };
};

export async function getPrimaryMembership(prisma: MembershipPrisma, userId: string) {
  return prisma.familyMember.findFirst({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });
}

export async function requireFamilyAccess(prisma: MembershipPrisma, userId: string, familyId: string) {
  const membership = await prisma.familyMember.findFirst({ where: { userId, familyId } });
  if (!membership) throw new Error("Family access denied");
  return membership;
}
