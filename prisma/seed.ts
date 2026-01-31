import "dotenv/config";
import { auth } from "../src/utils/auth";
import { prisma } from "../src/lib/prisma";

async function main() {
  const email = process.env.ADMIN_EMAIL || "admin@foodhub.com";
  const password = process.env.ADMIN_PASSWORD || "admin123";
  const name = process.env.ADMIN_NAME || "Admin";

  // If user exists, just ensure role/status and exit
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    await prisma.user.update({
      where: { email },
      data: {
        role: "admin",
        status: "active",
        name,
        emailVerified: true,
      },
    });

    console.log("Admin already existed; updated role/status.");
    console.log({ email, password });
    return;
  }

  // Create using Better Auth so password hashing matches
  await auth.api.signUpEmail({
    body: { email, password, name },
  });

  // Upgrade to admin + activate
  await prisma.user.update({
    where: { email },
    data: {
      role: "admin",
      status: "active",
      emailVerified: true,
    },
  });

  console.log("Seeded admin via Better Auth and upgraded role.");
  console.log({ email, password });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });