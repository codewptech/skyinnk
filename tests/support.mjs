import { mock } from "node:test";

// Persistence is a boundary double, never an actual Prisma client or connection.
export class RequestError extends Error {
  constructor(code, meta) {
    super("Private persistence details");
    this.code = code;
    this.meta = meta;
  }
}
export class ConnectionError extends Error {}

export const database = {
  user: {
    upsert: mock.fn(async () => ({ id: "stored-user" })),
    findFirst: mock.fn(async () => ({ id: "stored-user" })),
  },
};

mock.module("@prisma/client", {
  exports: {
    Prisma: {
      PrismaClientKnownRequestError: RequestError,
      PrismaClientInitializationError: ConnectionError,
    },
  },
});
mock.module("../server/utils/prisma.ts", { exports: { default: database } });

export function resetDatabase() {
  for (const operation of Object.values(database.user)) {
    operation.mock.resetCalls();
    operation.mock.mockImplementation(async () => ({ id: "stored-user" }));
  }
}
