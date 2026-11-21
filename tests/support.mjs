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

const stored = () => ({ id: "stored-user" });
const defaults = {
  createManyAndReturn: async () => [stored()],
  updateManyAndReturn: async () => [stored()],
  findUniqueOrThrow: async () => stored(),
  findFirst: async () => stored(),
};

export const database = {
  $transaction: mock.fn(async (run) => run(database)),
  user: {
    createManyAndReturn: mock.fn(defaults.createManyAndReturn),
    updateManyAndReturn: mock.fn(defaults.updateManyAndReturn),
    findUniqueOrThrow: mock.fn(defaults.findUniqueOrThrow),
    findFirst: mock.fn(defaults.findFirst),
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
  database.$transaction.mock.resetCalls();
  for (const [name, operation] of Object.entries(database.user)) {
    operation.mock.resetCalls();
    operation.mock.mockImplementation(defaults[name]);
  }
}
