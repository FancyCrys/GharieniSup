import { Redis } from "@upstash/redis";
import { SITE_RENAMES } from "./constants";

const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

const redis = url && token ? new Redis({ url, token }) : null;

// In-memory fallback for local development only.
const mem = globalThis.__ticketMem || (globalThis.__ticketMem = { seq: 0, tickets: new Map() });

const INDEX = "tickets:index";
const SEQ = "tickets:seq";
const key = (id) => `ticket:${id}`;

const normalize = (t) =>
  t && Array.isArray(t.sites) ? { ...t, sites: t.sites.map((s) => SITE_RENAMES[s] || s) } : t;

export function storageReady() {
  return Boolean(redis) || process.env.NODE_ENV !== "production";
}

export function usingMemory() {
  return !redis;
}

export async function createTicket(data) {
  const now = new Date().toISOString();
  const id = redis ? await redis.incr(SEQ) : ++mem.seq;
  const ticket = {
    id,
    ...data,
    status: "open",
    note: "",
    createdAt: now,
    updatedAt: now,
    doneAt: null,
  };
  if (redis) {
    await redis.set(key(id), ticket);
    await redis.zadd(INDEX, { score: Date.now(), member: String(id) });
  } else {
    mem.tickets.set(id, ticket);
  }
  return ticket;
}

export async function listTickets() {
  if (!redis) {
    return [...mem.tickets.values()].map(normalize).sort((a, b) => b.id - a.id);
  }
  const ids = await redis.zrange(INDEX, 0, -1, { rev: true });
  if (!ids || ids.length === 0) return [];
  const rows = await redis.mget(...ids.map((id) => key(id)));
  return rows.filter(Boolean).map(normalize);
}

export async function getTicket(id) {
  const n = Number(id);
  if (!redis) return normalize(mem.tickets.get(n)) || null;
  return normalize(await redis.get(key(n))) || null;
}

export async function updateTicket(id, changes) {
  const current = await getTicket(id);
  if (!current) return null;
  const next = { ...current, ...changes, updatedAt: new Date().toISOString() };
  if (changes.status) {
    next.doneAt = changes.status === "done" ? current.doneAt || next.updatedAt : null;
  }
  if (redis) await redis.set(key(current.id), next);
  else mem.tickets.set(current.id, next);
  return next;
}

export async function deleteTicket(id) {
  const n = Number(id);
  if (redis) {
    await redis.del(key(n));
    await redis.zrem(INDEX, String(n));
  } else {
    mem.tickets.delete(n);
  }
}
