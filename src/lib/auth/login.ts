import { verifyPassword } from "./password";

type LoginPrisma = {
  user: {
    findUnique(args: { where: { email: string } }): Promise<{
      id: string;
      email: string;
      name: string;
      passwordHash: string;
    } | null>;
  };
};

export async function verifyLogin(prisma: LoginPrisma, email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
  if (!user) return null;

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) return null;

  return { id: user.id, email: user.email, name: user.name };
}
