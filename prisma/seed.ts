// @ts-nocheck
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { faker } from "@faker-js/faker";
import bcrypt from "bcryptjs";

async function main() {
  console.log("Cleaning up database...");
  await prisma.review.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.meal.deleteMany();
  await prisma.category.deleteMany();
  await prisma.providerProfile.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.verification.deleteMany();
  await prisma.user.deleteMany();

  console.log("Seeding data...");

  const hashedPassword = await bcrypt.hash("password123", 10);

  // 1. Seed Categories (10)
  console.log("Seeding categories...");
  const categoryNames = [
    "Italian",
    "Japanese",
    "Mexican",
    "Indian",
    "Fast Food",
    "Healthy",
    "Desserts",
    "Beverages",
    "Thai",
    "Chinese",
  ];

  const categories = await Promise.all(
    categoryNames.map(async (name) => {
      return prisma.category.create({
        data: {
          name: name + " " + faker.string.nanoid(3),
          imageUrl: faker.image.urlLoremFlickr({ category: "food" }),
        },
      });
    }),
  );

  // 2. Seed Users (10 customers, 10 providers, 1 admin)
  console.log("Seeding users...");

  // Admin
  const adminEmail = process.env.ADMIN_EMAIL || "admin@foodhub.com";
  const admin = await prisma.user.create({
    data: {
      id: faker.string.uuid(),
      name: "Admin User",
      email: adminEmail,
      role: "admin",
      status: "active",
      emailVerified: true,
      accounts: {
        create: {
          id: faker.string.uuid(),
          accountId: faker.string.uuid(),
          providerId: "email",
          password: hashedPassword,
        },
      },
    },
  });

  // Providers
  const providers = await Promise.all(
    Array.from({ length: 10 }).map(async (_, i) => {
      const id = faker.string.uuid();
      return prisma.user.create({
        data: {
          id,
          name: faker.person.fullName(),
          email: `provider${i}@example.com`,
          role: "provider",
          status: "active",
          emailVerified: true,
          accounts: {
            create: {
              id: faker.string.uuid(),
              accountId: faker.string.uuid(),
              providerId: "email",
              password: hashedPassword,
            },
          },
          providerProfile: {
            create: {
              restaurantName: faker.company.name() + " Eatery",
              cuisineType: faker.helpers.arrayElement(categoryNames),
              address: faker.location.streetAddress(),
              coverImageUrl: faker.image.urlLoremFlickr({
                category: "restaurant",
              }),
            },
          },
        },
      });
    }),
  );

  // Customers
  const customers = await Promise.all(
    Array.from({ length: 10 }).map(async (_, i) => {
      const id = faker.string.uuid();
      return prisma.user.create({
        data: {
          id,
          name: faker.person.fullName(),
          email: `customer${i}@example.com`,
          role: "customer",
          status: "active",
          emailVerified: true,
          accounts: {
            create: {
              id: faker.string.uuid(),
              accountId: faker.string.uuid(),
              providerId: "email",
              password: hashedPassword,
            },
          },
        },
      });
    }),
  );

  // 3. Seed Meals (20 - 2 per provider)
  console.log("Seeding meals...");
  const meals: any[] = [];
  for (const provider of providers) {
    for (let i = 0; i < 2; i++) {
      const category = faker.helpers.arrayElement(categories);
      const meal = await prisma.meal.create({
        data: {
          providerId: provider.id,
          categoryId: category.id,
          name: faker.commerce.productName(),
          description: faker.commerce.productDescription(),
          price: faker.number.float({ min: 5, max: 50, fractionDigits: 2 }),
          imageUrl: faker.image.urlLoremFlickr({ category: "food" }),
          isAvailable: true,
        },
      });
      meals.push(meal);
    }
  }

  // 4. Seed Orders (10)
  console.log("Seeding orders...");
  const orders = await Promise.all(
    Array.from({ length: 10 }).map(async () => {
      const customer = faker.helpers.arrayElement(customers);
      const provider = faker.helpers.arrayElement(providers);
      const orderMeals = faker.helpers.arrayElements(
        meals.filter((m) => m.providerId === provider.id),
        { min: 1, max: 3 },
      );

      const totalAmount = orderMeals.reduce(
        (acc, meal) => acc + Number(meal.price),
        0,
      );

      return prisma.order.create({
        data: {
          customerId: customer.id,
          providerId: provider.id,
          deliveryAddress: faker.location.streetAddress(),
          totalAmount: totalAmount,
          status: faker.helpers.arrayElement([
            "placed",
            "preparing",
            "ready",
            "delivered",
          ]),
          items: {
            create: orderMeals.map((meal) => ({
              mealId: meal.id,
              quantity: 1,
              priceAtTime: meal.price,
            })),
          },
        },
      });
    }),
  );

  // 5. Seed Reviews (10)
  console.log("Seeding reviews...");
  await Promise.all(
    Array.from({ length: 10 }).map(async () => {
      const customer = faker.helpers.arrayElement(customers);
      const meal = faker.helpers.arrayElement(meals);

      try {
        await prisma.review.create({
          data: {
            customerId: customer.id,
            mealId: meal.id,
            rating: faker.number.int({ min: 1, max: 5 }),
            comment: faker.lorem.sentence(),
          },
        });
      } catch (e) {
        // Ignore duplicates
      }
    }),
  );

  // 6. Seed Sessions (10)
  console.log("Seeding sessions...");
  await Promise.all(
    Array.from({ length: 10 }).map(async () => {
      const user = faker.helpers.arrayElement([
        ...customers,
        ...providers,
        admin,
      ]);
      return prisma.session.create({
        data: {
          id: faker.string.uuid(),
          token: faker.string.alphanumeric(32),
          expiresAt: faker.date.future(),
          userId: user.id,
          ipAddress: faker.internet.ipv4(),
          userAgent: faker.internet.userAgent(),
        },
      });
    }),
  );

  // 7. Seed Verifications (10)
  console.log("Seeding verifications...");
  await Promise.all(
    Array.from({ length: 10 }).map(async () => {
      return prisma.verification.create({
        data: {
          id: faker.string.uuid(),
          identifier: faker.internet.email(),
          value: faker.string.numeric(6),
          expiresAt: faker.date.future(),
        },
      });
    }),
  );

  console.log("Seed completed successfully!");
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
