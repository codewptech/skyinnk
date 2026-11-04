import { PrismaClient } from "@prisma/client";

const prismaClientSingleton = () => {
  return new PrismaClient();
};

declare global {
  var skyinnkPrisma: undefined | ReturnType<typeof prismaClientSingleton>;
}

const prisma = globalThis.skyinnkPrisma ?? prismaClientSingleton();

export default prisma;

if (process.env.NODE_ENV !== "production") globalThis.skyinnkPrisma = prisma;
