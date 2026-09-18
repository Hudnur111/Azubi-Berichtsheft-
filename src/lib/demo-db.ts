/* Demo-DB: Liefert statische Demo-Daten wenn DATABASE_URL nicht gesetzt ist. */
/* eslint-disable @typescript-eslint/no-explicit-any */

export const DEMO_ADMIN = {
  id: "demo-admin",
  email: "admin@demo.local",
  username: "admin",
  loginGroup: "STAFF",
  passwordHash: "",
  firstName: "Demo",
  lastName: "Admin",
  role: "ADMIN" as const,
  active: true,
  mustChangePassword: false,
  departmentId: null,
  department: null,
  trainerId: null,
  trainer: null,
  beruf: null,
  ausbildungsjahr: null,
  ausbildungsbeginn: null,
  ausbildungsende: null,
  berichtsheftTyp: null,
  inviteCode: null,
  invitedById: null,
  registeredAt: null,
  lastLoginAt: null,
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
};

export const DEMO_AZUBI = {
  id: "demo-azubi",
  email: "azubi@demo.local",
  username: "azubi",
  loginGroup: "AZUBI",
  passwordHash: "",
  firstName: "Demo",
  lastName: "Azubi",
  role: "AZUBI" as const,
  active: true,
  mustChangePassword: false,
  departmentId: null,
  department: null,
  trainerId: null,
  trainer: null,
  beruf: "Fachinformatiker/in für Anwendungsentwicklung",
  ausbildungsjahr: 2,
  ausbildungsbeginn: new Date("2023-09-01"),
  ausbildungsende: new Date("2026-01-31"),
  berichtsheftTyp: "WEEKLY" as const,
  inviteCode: null,
  invitedById: null,
  registeredAt: new Date("2023-09-01"),
  lastLoginAt: null,
  createdAt: new Date("2023-09-01"),
  updatedAt: new Date("2023-09-01"),
};

const DEMO_USERS = [DEMO_ADMIN, DEMO_AZUBI];

const asyncNoop = async () => {};
const asyncNull = async () => null;
const asyncZero = async () => 0;
const asyncEmpty = async () => [];
const asyncObj = async (a?: any) => ({ id: "demo", ...a?.create });

function userModel() {
  return {
    findUnique: async ({ where }: any) => {
      if (where?.id) return DEMO_USERS.find((u) => u.id === where.id) ?? null;
      if (where?.email) return DEMO_USERS.find((u) => u.email === where.email) ?? null;
      if (where?.username) return DEMO_USERS.find((u) => u.username === where.username) ?? null;
      if (where?.inviteCode) return null;
      return null;
    },
    findFirst: async ({ where }: any) => {
      const usernameFilter = where?.username?.equals ?? where?.username;
      if (usernameFilter) {
        const lg = where?.loginGroup;
        return (
          DEMO_USERS.find(
            (u) =>
              u.username.toLowerCase() === usernameFilter.toLowerCase() &&
              (!lg || u.loginGroup === lg),
          ) ?? null
        );
      }
      if (where?.email) return DEMO_USERS.find((u) => u.email === where.email) ?? null;
      return null;
    },
    findMany: async () => [],
    count: async ({ where }: any) => {
      if (where?.role === "ADMIN") return 1;
      return 0;
    },
    create: async ({ data }: any) => ({ id: "demo-new", ...data }),
    update: async ({ where, data }: any) => {
      return { ...(DEMO_USERS.find((u) => u.id === where?.id) ?? {}), ...data };
    },
    updateMany: async () => ({ count: 0 }),
    delete: asyncNoop,
    deleteMany: async () => ({ count: 0 }),
  };
}

function genericModel() {
  return {
    findUnique: asyncNull,
    findFirst: asyncNull,
    findMany: asyncEmpty,
    count: asyncZero,
    create: async ({ data }: any) => ({ id: `demo-${Date.now()}`, createdAt: new Date(), ...data }),
    update: async ({ data }: any) => ({ id: "demo", ...data }),
    updateMany: async () => ({ count: 0 }),
    delete: asyncNoop,
    deleteMany: async () => ({ count: 0 }),
    upsert: asyncObj,
    groupBy: asyncEmpty,
    aggregate: async () => ({ _avg: {}, _count: {}, _max: {}, _min: {}, _sum: {} }),
  };
}

export function createDemoDb() {
  const generic = genericModel();
  return {
    user: userModel(),
    report: { ...generic, groupBy: asyncEmpty },
    reportEntry: generic,
    reportComment: generic,
    auditLog: generic,
    notification: generic,
    department: generic,
    appSetting: {
      ...generic,
      findUnique: asyncNull,
    },
    template: generic,
    rotation: generic,
    oneTimeSecret: generic,
    passwordResetToken: generic,
    $transaction: async (ops: any) => {
      if (Array.isArray(ops)) return Promise.all(ops);
      return ops(() => Promise.resolve(null));
    },
    $disconnect: asyncNoop,
    $connect: asyncNoop,
  };
}
