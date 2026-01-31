import app from "./app";
import { prisma } from "./lib/prisma";
import { env } from "./config/env";

const PORT = env.PORT;

async function main() {
  try {
    await prisma.$connect();
    console.log("Connected to the database");

    app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("An error occurred: ", error);
    process.exit(1);
  }
}

main();