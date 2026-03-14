import { vi } from "vitest";

// Mock Prisma client
vi.mock("../db/index.js", () => ({
  default: {
    campaign: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      fields: {
        spent: "spent",
      },
    },
    user: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
      create: vi.fn(),
    },
    advertiser: {
      upsert: vi.fn(),
    },
    publisher: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
    },
    viewer: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    impression: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    rateLimit: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    payout: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    $transaction: vi.fn((callback) =>
      callback({
        publisher: {
          update: vi.fn(),
        },
        viewer: {
          update: vi.fn(),
        },
      }),
    ),
  },
}));
