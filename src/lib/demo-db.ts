/**
 * In-Memory-Datenbank für den Demo-Modus.
 *
 * Bildet den Teil der Prisma-Client-API nach, den die App verwendet:
 * findUnique/findFirst/findMany/count/create/createMany/update/updateMany/upsert/delete/deleteMany/
 * groupBy/aggregate, where-Filter (AND/OR/NOT, Vergleiche, contains, in, Relationen mit some/is),
 * select/include/omit inkl. verschachtelter Relationen und _count, orderBy, skip/take, $transaction.
 *
 * Die Daten leben im Prozess-Speicher (globalThis) und werden beim Start aus demo-data.ts befüllt.
 * Ein Neustart (oder auf Vercel ein Kaltstart der Function) setzt sie auf den Ausgangszustand zurück.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import type { PrismaClient } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { seedDemoData } from "./demo-data";

type Rec = Record<string, any>;
export type ModelName =
  | "department" | "user" | "report" | "reportEntry" | "comment" | "template" | "rotation"
  | "notification" | "auditLog" | "attachment" | "message" | "appSetting" | "passwordResetToken" | "oneTimeSecret";

type OneRel = { kind: "one"; model: ModelName; fk: string; onDelete: "Cascade" | "SetNull" };
type ManyRel = { kind: "many"; model: ModelName; fk: string };
type Relation = OneRel | ManyRel;
type ModelMeta = {
  relations: Record<string, Relation>;
  unique: string[][];
  defaults: () => Rec;
  updatedAt?: boolean;
  coerce?: Record<string, (v: any) => any>;
};

const one = (model: ModelName, fk: string, onDelete: OneRel["onDelete"]): OneRel => ({ kind: "one", model, fk, onDelete });
const many = (model: ModelName, fk: string): ManyRel => ({ kind: "many", model, fk });
const toDecimal = (v: any) => (v == null ? v : Prisma.Decimal.isDecimal(v) ? v : new Prisma.Decimal(v));

/* ---------- Schema-Metadaten (aus prisma/schema.prisma abgeleitet) ---------- */

const META: Record<ModelName, ModelMeta> = {
  department: {
    relations: { users: many("user", "departmentId"), reports: many("report", "departmentId"), templates: many("template", "departmentId"), rotations: many("rotation", "departmentId") },
    unique: [["name"], ["code"]],
    defaults: () => ({ description: null }),
  },
  user: {
    relations: {
      department: one("department", "departmentId", "SetNull"),
      trainer: one("user", "trainerId", "SetNull"),
      azubis: many("user", "trainerId"),
      reports: many("report", "azubiId"),
      reviewedReports: many("report", "reviewerId"),
      comments: many("comment", "authorId"),
      notifications: many("notification", "userId"),
      auditLogs: many("auditLog", "actorId"),
      templates: many("template", "ownerId"),
      rotations: many("rotation", "azubiId"),
      attachments: many("attachment", "uploadedById"),
      sentMessages: many("message", "senderId"),
      receivedMessages: many("message", "recipientId"),
    },
    unique: [["email"], ["inviteCode"], ["username", "loginGroup"]],
    updatedAt: true,
    defaults: () => ({
      email: null, loginGroup: "AZUBI", passwordHash: "", role: "AZUBI", active: true, mustChangePassword: false,
      departmentId: null, trainerId: null, beruf: null, ausbildungsjahr: null, ausbildungsbeginn: null, ausbildungsende: null,
      berichtsheftTyp: null, inviteCode: null, invitedById: null, registeredAt: null, lastLoginAt: null,
    }),
  },
  report: {
    relations: {
      azubi: one("user", "azubiId", "Cascade"),
      department: one("department", "departmentId", "SetNull"),
      reviewer: one("user", "reviewerId", "SetNull"),
      entries: many("reportEntry", "reportId"),
      comments: many("comment", "reportId"),
      attachments: many("attachment", "reportId"),
    },
    unique: [["azubiId", "year", "week", "day"]],
    updatedAt: true,
    defaults: () => ({ type: "WEEKLY", day: 0, status: "DRAFT", departmentId: null, ausbildungsjahr: null, summary: null, submittedAt: null, reviewedAt: null, reviewerId: null, reviewNote: null, version: 1 }),
  },
  reportEntry: {
    relations: { report: one("report", "reportId", "Cascade") },
    unique: [],
    defaults: () => ({ category: "BETRIEB", description: "", hours: new Prisma.Decimal(8), sortOrder: 0 }),
    coerce: { hours: toDecimal },
  },
  comment: {
    relations: { report: one("report", "reportId", "Cascade"), author: one("user", "authorId", "Cascade") },
    unique: [],
    defaults: () => ({}),
  },
  template: {
    relations: { department: one("department", "departmentId", "SetNull"), owner: one("user", "ownerId", "Cascade") },
    unique: [],
    defaults: () => ({ category: "BETRIEB", departmentId: null, ownerId: null, isGlobal: false }),
  },
  rotation: {
    relations: { azubi: one("user", "azubiId", "Cascade"), department: one("department", "departmentId", "Cascade") },
    unique: [],
    defaults: () => ({ note: null }),
  },
  notification: {
    relations: { user: one("user", "userId", "Cascade") },
    unique: [],
    defaults: () => ({ link: null, read: false }),
  },
  auditLog: {
    relations: { actor: one("user", "actorId", "SetNull") },
    unique: [],
    defaults: () => ({ actorId: null, targetId: null, details: null }),
  },
  attachment: {
    relations: { report: one("report", "reportId", "Cascade"), uploadedBy: one("user", "uploadedById", "SetNull") },
    unique: [],
    defaults: () => ({ uploadedById: null }),
  },
  message: {
    relations: { sender: one("user", "senderId", "Cascade"), recipient: one("user", "recipientId", "Cascade") },
    unique: [],
    defaults: () => ({ readAt: null }),
  },
  appSetting: {
    relations: {},
    unique: [],
    updatedAt: true,
    defaults: () => ({ id: "default", companyName: "Azubi-Berichtsheft", logoData: null, logoMime: null, impressum: null, datenschutz: null, bundesland: "BW", supportEmail: null }),
  },
  passwordResetToken: {
    relations: {},
    unique: [["tokenHash"]],
    defaults: () => ({ usedAt: null }),
  },
  oneTimeSecret: {
    relations: {},
    unique: [],
    defaults: () => ({}),
  },
};

/** Reihenfolge der Enums (Postgres sortiert Enums nach Definitionsreihenfolge, nicht alphabetisch). */
const ENUM_ORDER: Record<string, string[]> = {
  role: ["ADMIN", "AUSBILDER", "ABTEILUNGSLEITER", "AZUBI"],
  status: ["DRAFT", "SUBMITTED", "APPROVED", "REJECTED"],
  type: ["WEEKLY", "DAILY"],
  berichtsheftTyp: ["WEEKLY", "DAILY"],
  category: ["BETRIEB", "BERUFSSCHULE", "SEMINAR", "URLAUB", "KRANK", "FEIERTAG", "SONSTIGES"],
};

/* ---------- Hilfsfunktionen ---------- */

const isDecimal = (v: any) => Prisma.Decimal.isDecimal(v);
const isBytes = (v: any) => v instanceof Uint8Array;
const isFilterObject = (v: any) => typeof v === "object" && v !== null && !(v instanceof Date) && !Array.isArray(v) && !isBytes(v) && !isDecimal(v);

let seq = 0;
export const newId = () => `c${Date.now().toString(36)}${(++seq).toString(36).padStart(4, "0")}${Math.random().toString(36).slice(2, 8)}`;

function norm(v: any): any {
  if (v instanceof Date) return v.getTime();
  if (isDecimal(v)) return Number(v);
  return v;
}

function eq(a: any, b: any, ci = false): boolean {
  if (a == null || b == null) return a == null && b == null;
  const x = norm(a), y = norm(b);
  if (ci && typeof x === "string" && typeof y === "string") return x.toLowerCase() === y.toLowerCase();
  return x === y;
}

function cmp(field: string, a: any, b: any): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  const order = ENUM_ORDER[field];
  if (order && typeof a === "string" && typeof b === "string" && order.includes(a) && order.includes(b)) return order.indexOf(a) - order.indexOf(b);
  const x = norm(a), y = norm(b);
  if (typeof x === "string" && typeof y === "string") return x.localeCompare(y, "de");
  if (typeof x === "boolean" && typeof y === "boolean") return Number(x) - Number(y);
  return x < y ? -1 : x > y ? 1 : 0;
}

function cloneVal(v: any): any {
  if (v instanceof Date) return new Date(v.getTime());
  if (v == null || typeof v !== "object" || isDecimal(v) || isBytes(v)) return v;
  return JSON.parse(JSON.stringify(v));
}

function cloneRec(rec: Rec): Rec {
  const out: Rec = {};
  for (const k of Object.keys(rec)) out[k] = cloneVal(rec[k]);
  return out;
}

const digJson = (v: any, path: string[]) => path.reduce((acc, key) => (acc != null && typeof acc === "object" ? acc[key] : undefined), v);

function matchScalar(val: any, cond: any): boolean {
  if (cond === undefined) return true;
  if (cond === null) return val == null;
  if (!isFilterObject(cond)) return eq(val, cond);
  if (Array.isArray(cond.path)) {
    const rest = { ...cond };
    delete rest.path;
    return matchScalar(digJson(val, cond.path), rest);
  }
  const ci = cond.mode === "insensitive";
  const str = (s: any) => (ci ? String(s).toLowerCase() : String(s));
  for (const [op, v] of Object.entries(cond)) {
    if (v === undefined || op === "mode") continue;
    switch (op) {
      case "equals": if (!eq(val, v, ci)) return false; break;
      case "not": if (v === null ? val == null : isFilterObject(v) ? matchScalar(val, v) : eq(val, v, ci)) return false; break;
      case "in": if (!(v as any[]).some((x) => eq(val, x, ci))) return false; break;
      case "notIn": if ((v as any[]).some((x) => eq(val, x, ci))) return false; break;
      case "lt": if (val == null || !(norm(val) < norm(v))) return false; break;
      case "lte": if (val == null || !(norm(val) <= norm(v))) return false; break;
      case "gt": if (val == null || !(norm(val) > norm(v))) return false; break;
      case "gte": if (val == null || !(norm(val) >= norm(v))) return false; break;
      case "contains": if (typeof val !== "string" || !str(val).includes(str(v))) return false; break;
      case "startsWith": if (typeof val !== "string" || !str(val).startsWith(str(v))) return false; break;
      case "endsWith": if (typeof val !== "string" || !str(val).endsWith(str(v))) return false; break;
      default: throw new Error(`Demo-DB: Filter "${op}" wird nicht unterstützt.`);
    }
  }
  return true;
}

/* ---------- Store ---------- */

type Tables = Record<ModelName, Rec[]>;

function emptyTables(): Tables {
  return Object.fromEntries((Object.keys(META) as ModelName[]).map((m) => [m, [] as Rec[]])) as unknown as Tables;
}

class DemoEngine {
  constructor(public tables: Tables) {}

  table(model: ModelName) {
    return this.tables[model];
  }

  /* --- Relationen --- */

  getOne(rec: Rec, rel: OneRel): Rec | null {
    const id = rec[rel.fk];
    if (id == null) return null;
    return this.table(rel.model).find((r) => r.id === id) ?? null;
  }

  getMany(rec: Rec, rel: ManyRel): Rec[] {
    return this.table(rel.model).filter((r) => r[rel.fk] === rec.id);
  }

  /* --- where --- */

  expandWhere(model: ModelName, where: Rec): Rec {
    const out: Rec = {};
    for (const [key, cond] of Object.entries(where)) {
      if (key.includes("_") && isFilterObject(cond) && !META[model].relations[key] && key.split("_").every((f) => f in (cond as Rec))) {
        Object.assign(out, cond);
      } else out[key] = cond;
    }
    return out;
  }

  matches(model: ModelName, rec: Rec, where: Rec | undefined | null): boolean {
    if (!where) return true;
    for (const [key, cond] of Object.entries(this.expandWhere(model, where))) {
      if (cond === undefined) continue;
      if (key === "AND") {
        const arr = Array.isArray(cond) ? cond : [cond];
        if (!arr.every((w) => this.matches(model, rec, w))) return false;
        continue;
      }
      if (key === "OR") {
        const arr = Array.isArray(cond) ? cond : [cond];
        if (!arr.some((w) => this.matches(model, rec, w))) return false;
        continue;
      }
      if (key === "NOT") {
        const arr = Array.isArray(cond) ? cond : [cond];
        if (arr.some((w) => this.matches(model, rec, w))) return false;
        continue;
      }
      const rel = META[model].relations[key];
      if (rel) {
        if (rel.kind === "one") {
          const target = this.getOne(rec, rel);
          if (cond === null) { if (target !== null) return false; continue; }
          if ("is" in cond || "isNot" in cond) {
            if (cond.is !== undefined) {
              if (cond.is === null ? target !== null : !target || !this.matches(rel.model, target, cond.is)) return false;
            }
            if (cond.isNot !== undefined) {
              if (cond.isNot === null ? target === null : !!target && this.matches(rel.model, target, cond.isNot)) return false;
            }
            continue;
          }
          if (!target || !this.matches(rel.model, target, cond)) return false;
        } else {
          const list = this.getMany(rec, rel);
          if (cond.some !== undefined && !list.some((r) => this.matches(rel.model, r, cond.some))) return false;
          if (cond.every !== undefined && !list.every((r) => this.matches(rel.model, r, cond.every))) return false;
          if (cond.none !== undefined && list.some((r) => this.matches(rel.model, r, cond.none))) return false;
        }
        continue;
      }
      if (!matchScalar(rec[key], cond)) return false;
    }
    return true;
  }

  /* --- Lesen --- */

  query(model: ModelName, args: Rec = {}): Rec[] {
    let recs = this.table(model).filter((r) => this.matches(model, r, args.where));
    const orderBy = Array.isArray(args.orderBy) ? args.orderBy : args.orderBy ? [args.orderBy] : [];
    const specs = orderBy.flatMap((o: Rec) => Object.entries(o));
    if (specs.length) {
      recs = [...recs].sort((a, b) => {
        for (const [field, dir] of specs) {
          const c = cmp(field, a[field], b[field]);
          if (c) return dir === "desc" ? -c : c;
        }
        return 0;
      });
    }
    if (args.distinct) {
      const fields = Array.isArray(args.distinct) ? args.distinct : [args.distinct];
      const seen = new Set<string>();
      recs = recs.filter((r) => { const k = JSON.stringify(fields.map((f: string) => norm(r[f]))); if (seen.has(k)) return false; seen.add(k); return true; });
    }
    if (args.skip) recs = recs.slice(args.skip);
    if (args.take !== undefined && args.take !== null) recs = args.take < 0 ? recs.slice(args.take) : recs.slice(0, args.take);
    return recs;
  }

  shape(model: ModelName, rec: Rec, args: Rec = {}): Rec {
    const { select, include, omit } = args;
    const rels = META[model].relations;
    let out: Rec;
    if (select) {
      out = {};
      for (const [k, v] of Object.entries(select)) {
        if (!v) continue;
        if (k === "_count") out._count = this.countRelations(model, rec, v as Rec);
        else if (rels[k]) out[k] = this.resolveRelation(rec, rels[k], v === true ? {} : (v as Rec));
        else out[k] = cloneVal(rec[k]);
      }
    } else {
      out = cloneRec(rec);
      if (omit) for (const [k, v] of Object.entries(omit)) if (v) delete out[k];
      if (include) {
        for (const [k, v] of Object.entries(include)) {
          if (!v) continue;
          if (k === "_count") out._count = this.countRelations(model, rec, v as Rec);
          else if (rels[k]) out[k] = this.resolveRelation(rec, rels[k], v === true ? {} : (v as Rec));
          else throw new Error(`Demo-DB: Unbekannte Relation "${k}" in ${model}.`);
        }
      }
    }
    return out;
  }

  resolveRelation(rec: Rec, rel: Relation, args: Rec): Rec | Rec[] | null {
    if (rel.kind === "one") {
      const target = this.getOne(rec, rel);
      return target ? this.shape(rel.model, target, args) : null;
    }
    const where = args.where ? { AND: [{ [rel.fk]: rec.id }, args.where] } : { [rel.fk]: rec.id };
    return this.query(rel.model, { ...args, where }).map((r) => this.shape(rel.model, r, args));
  }

  countRelations(model: ModelName, rec: Rec, spec: Rec): Rec {
    const out: Rec = {};
    for (const [k, v] of Object.entries(spec.select ?? {})) {
      if (!v) continue;
      const rel = META[model].relations[k];
      if (!rel || rel.kind !== "many") throw new Error(`Demo-DB: _count für "${k}" nicht möglich.`);
      const list = this.getMany(rec, rel);
      out[k] = v === true ? list.length : list.filter((r) => this.matches(rel.model, r, (v as Rec).where)).length;
    }
    return out;
  }

  /* --- Schreiben --- */

  assertUnique(model: ModelName, rec: Rec) {
    for (const fields of META[model].unique) {
      if (fields.some((f) => rec[f] == null)) continue;
      const clash = this.table(model).find((r) => r.id !== rec.id && fields.every((f) => eq(r[f], rec[f])));
      if (clash) {
        const err = new Error(`Unique constraint failed on the fields: (${fields.join(",")})`) as Error & { code: string };
        err.code = "P2002";
        throw err;
      }
    }
  }

  applyScalar(model: ModelName, rec: Rec, key: string, value: any) {
    const coerce = META[model].coerce?.[key];
    if (isFilterObject(value) && ("set" in value || "increment" in value || "decrement" in value || "multiply" in value || "divide" in value)) {
      if ("set" in value) rec[key] = coerce ? coerce(value.set) : cloneVal(value.set);
      if ("increment" in value) rec[key] = Number(rec[key] ?? 0) + Number(value.increment);
      if ("decrement" in value) rec[key] = Number(rec[key] ?? 0) - Number(value.decrement);
      if ("multiply" in value) rec[key] = Number(rec[key] ?? 0) * Number(value.multiply);
      if ("divide" in value) rec[key] = Number(rec[key] ?? 0) / Number(value.divide);
      return;
    }
    rec[key] = coerce ? coerce(value) : cloneVal(value);
  }

  insert(model: ModelName, data: Rec): Rec {
    const meta = META[model];
    const now = new Date();
    const rec: Rec = { id: newId(), ...meta.defaults(), createdAt: now };
    if (meta.updatedAt) rec.updatedAt = now;
    const afterInsert: (() => void)[] = [];
    for (const [key, value] of Object.entries(data)) {
      if (value === undefined) continue;
      const rel = meta.relations[key];
      if (!rel) { this.applyScalar(model, rec, key, value); continue; }
      if (rel.kind === "one") {
        if (value?.connect) rec[rel.fk] = value.connect.id;
        else if (value?.create) rec[rel.fk] = this.insert(rel.model, value.create).id;
        else if (value?.disconnect) rec[rel.fk] = null;
      } else {
        afterInsert.push(() => this.nestedMany(rec, rel, value));
      }
    }
    if (meta.coerce) for (const [f, fn] of Object.entries(meta.coerce)) rec[f] = fn(rec[f]);
    this.assertUnique(model, rec);
    this.table(model).push(rec);
    afterInsert.forEach((fn) => fn());
    return rec;
  }

  nestedMany(parent: Rec, rel: ManyRel, value: Rec) {
    if (value.create) for (const d of Array.isArray(value.create) ? value.create : [value.create]) this.insert(rel.model, { ...d, [rel.fk]: parent.id });
    if (value.createMany) for (const d of Array.isArray(value.createMany.data) ? value.createMany.data : [value.createMany.data]) this.insert(rel.model, { ...d, [rel.fk]: parent.id });
    if (value.connect) for (const c of Array.isArray(value.connect) ? value.connect : [value.connect]) { const t = this.table(rel.model).find((r) => r.id === c.id); if (t) t[rel.fk] = parent.id; }
    if (value.disconnect) for (const c of Array.isArray(value.disconnect) ? value.disconnect : [value.disconnect]) { const t = this.table(rel.model).find((r) => r.id === c.id); if (t) t[rel.fk] = null; }
    if (value.deleteMany) for (const w of Array.isArray(value.deleteMany) ? value.deleteMany : [value.deleteMany]) this.removeWhere(rel.model, { AND: [{ [rel.fk]: parent.id }, w] });
    if (value.updateMany) for (const u of Array.isArray(value.updateMany) ? value.updateMany : [value.updateMany]) for (const r of this.query(rel.model, { where: { AND: [{ [rel.fk]: parent.id }, u.where] } })) this.patch(rel.model, r, u.data);
    if (value.update) for (const u of Array.isArray(value.update) ? value.update : [value.update]) { const r = this.query(rel.model, { where: { AND: [{ [rel.fk]: parent.id }, u.where] }, take: 1 })[0]; if (r) this.patch(rel.model, r, u.data); }
  }

  patch(model: ModelName, rec: Rec, data: Rec): Rec {
    const meta = META[model];
    const before = { ...rec };
    for (const [key, value] of Object.entries(data)) {
      if (value === undefined) continue;
      const rel = meta.relations[key];
      if (!rel) { this.applyScalar(model, rec, key, value); continue; }
      if (rel.kind === "one") {
        if (value?.connect) rec[rel.fk] = value.connect.id;
        else if (value?.create) rec[rel.fk] = this.insert(rel.model, value.create).id;
        else if (value?.disconnect || value === null) rec[rel.fk] = null;
      } else this.nestedMany(rec, rel, value);
    }
    if (meta.updatedAt) rec.updatedAt = new Date();
    try {
      this.assertUnique(model, rec);
    } catch (e) {
      Object.assign(rec, before);
      throw e;
    }
    return rec;
  }

  remove(model: ModelName, rec: Rec) {
    const list = this.table(model);
    const idx = list.indexOf(rec);
    if (idx < 0) return;
    list.splice(idx, 1);
    // Fremdschlüssel-Regeln (onDelete) aller Modelle, die auf dieses Modell zeigen
    for (const [childModel, meta] of Object.entries(META) as [ModelName, ModelMeta][]) {
      for (const rel of Object.values(meta.relations)) {
        if (rel.kind !== "one" || rel.model !== model) continue;
        const children = this.table(childModel).filter((c) => c[rel.fk] === rec.id);
        for (const c of children) {
          if (rel.onDelete === "Cascade") this.remove(childModel, c);
          else c[rel.fk] = null;
        }
      }
    }
  }

  removeWhere(model: ModelName, where: Rec | undefined): number {
    const victims = this.query(model, { where });
    victims.forEach((r) => this.remove(model, r));
    return victims.length;
  }

  /* --- Aggregation --- */

  aggregateRows(rows: Rec[], args: Rec): Rec {
    const out: Rec = {};
    const nums = (f: string) => rows.map((r) => r[f]).filter((v) => v != null);
    const wrap = (f: string, n: number | null) => (n === null ? null : rows.some((r) => isDecimal(r[f])) ? new Prisma.Decimal(n) : n);
    if (args._count) {
      out._count = args._count === true ? rows.length : Object.fromEntries(Object.entries(args._count).filter(([, v]) => v).map(([f]) => [f, f === "_all" ? rows.length : nums(f).length]));
    }
    if (args._sum) out._sum = Object.fromEntries(Object.keys(args._sum).filter((f) => args._sum[f]).map((f) => [f, wrap(f, nums(f).length ? nums(f).reduce((a, v) => a + Number(v), 0) : null)]));
    if (args._avg) out._avg = Object.fromEntries(Object.keys(args._avg).filter((f) => args._avg[f]).map((f) => [f, wrap(f, nums(f).length ? nums(f).reduce((a, v) => a + Number(v), 0) / nums(f).length : null)]));
    if (args._min) out._min = Object.fromEntries(Object.keys(args._min).filter((f) => args._min[f]).map((f) => [f, nums(f).length ? nums(f).reduce((a, v) => (cmp(f, v, a) < 0 ? v : a)) : null]));
    if (args._max) out._max = Object.fromEntries(Object.keys(args._max).filter((f) => args._max[f]).map((f) => [f, nums(f).length ? nums(f).reduce((a, v) => (cmp(f, v, a) > 0 ? v : a)) : null]));
    return out;
  }

  /* --- Model-Delegate (Prisma-ähnliche API) --- */

  delegate(model: ModelName) {
    const notFound = () => {
      const err = new Error(`No ${model} found`) as Error & { code: string };
      err.code = "P2025";
      return err;
    };
    const findFirst = async (args: Rec = {}) => {
      const rec = this.query(model, { ...args, take: 1 })[0];
      return rec ? this.shape(model, rec, args) : null;
    };
    const create = async (args: Rec) => this.shape(model, this.insert(model, args.data ?? {}), args);
    const update = async (args: Rec) => {
      const rec = this.query(model, { where: args.where, take: 1 })[0];
      if (!rec) throw notFound();
      return this.shape(model, this.patch(model, rec, args.data ?? {}), args);
    };
    return {
      findUnique: findFirst,
      findFirst,
      findUniqueOrThrow: async (args: Rec = {}) => { const r = await findFirst(args); if (!r) throw notFound(); return r; },
      findFirstOrThrow: async (args: Rec = {}) => { const r = await findFirst(args); if (!r) throw notFound(); return r; },
      findMany: async (args: Rec = {}) => this.query(model, args).map((r) => this.shape(model, r, args)),
      count: async (args: Rec = {}) => this.query(model, { where: args.where, skip: args.skip, take: args.take }).length,
      create,
      createMany: async (args: Rec) => {
        const rows = Array.isArray(args.data) ? args.data : [args.data];
        let count = 0;
        for (const d of rows) {
          try { this.insert(model, d); count++; } catch (e) { if (!args.skipDuplicates) throw e; }
        }
        return { count };
      },
      update,
      updateMany: async (args: Rec) => {
        const recs = this.query(model, { where: args.where });
        recs.forEach((r) => this.patch(model, r, args.data ?? {}));
        return { count: recs.length };
      },
      upsert: async (args: Rec) => {
        const rec = this.query(model, { where: args.where, take: 1 })[0];
        return rec ? this.shape(model, this.patch(model, rec, args.update ?? {}), args) : this.shape(model, this.insert(model, args.create ?? {}), args);
      },
      delete: async (args: Rec) => {
        const rec = this.query(model, { where: args.where, take: 1 })[0];
        if (!rec) throw notFound();
        const out = this.shape(model, rec, args);
        this.remove(model, rec);
        return out;
      },
      deleteMany: async (args: Rec = {}) => ({ count: this.removeWhere(model, args.where) }),
      aggregate: async (args: Rec = {}) => this.aggregateRows(this.query(model, args), args),
      groupBy: async (args: Rec) => {
        const by: string[] = Array.isArray(args.by) ? args.by : [args.by];
        const groups = new Map<string, Rec[]>();
        for (const r of this.query(model, { where: args.where })) {
          const key = JSON.stringify(by.map((f) => norm(r[f]) ?? null));
          if (!groups.has(key)) groups.set(key, []);
          groups.get(key)!.push(r);
        }
        return [...groups.values()].map((rows) => ({ ...Object.fromEntries(by.map((f) => [f, cloneVal(rows[0][f])])), ...this.aggregateRows(rows, args) }));
      },
    };
  }
}

/* ---------- Öffentliche API ---------- */

const g = globalThis as unknown as { __demoEngine?: DemoEngine };

function engine(): DemoEngine {
  if (!g.__demoEngine) {
    const e = new DemoEngine(emptyTables());
    seedDemoData((model: ModelName, data: Rec) => e.insert(model, data));
    g.__demoEngine = e;
  }
  return g.__demoEngine;
}

/** Setzt die Demo-Daten auf den Ausgangszustand zurück. */
export function resetDemoDb() {
  delete g.__demoEngine;
  engine();
}

export function createDemoDb(): PrismaClient {
  const e = engine();
  const client: Rec = {
    $connect: async () => {},
    $disconnect: async () => {},
    $queryRaw: async () => [{ "?column?": 1 }],
    $executeRaw: async () => 0,
    $transaction: async (arg: any) => (Array.isArray(arg) ? Promise.all(arg) : arg(client)),
  };
  for (const model of Object.keys(META) as ModelName[]) client[model] = e.delegate(model);
  return client as unknown as PrismaClient;
}
