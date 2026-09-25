import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, 'data');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

function filePath(collection) {
  return path.join(DATA_DIR, `${collection}.json`);
}

function readCollection(collection) {
  const file = filePath(collection);
  if (!fs.existsSync(file)) return [];
  try {
    const raw = fs.readFileSync(file, 'utf-8');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeCollection(collection, records) {
  fs.writeFileSync(filePath(collection), JSON.stringify(records, null, 2));
}

function matches(record, query) {
  return Object.entries(query || {}).every(([key, value]) => record[key] === value);
}

function applySort(records, sort) {
  if (!sort) return records;
  const desc = sort.startsWith('-');
  const field = desc ? sort.slice(1) : sort;
  const sorted = [...records].sort((a, b) => {
    const av = a[field];
    const bv = b[field];
    if (av === bv) return 0;
    return av > bv ? 1 : -1;
  });
  return desc ? sorted.reverse() : sorted;
}

export function list(collection, sort) {
  return applySort(readCollection(collection), sort);
}

export function filter(collection, query, sort, limit) {
  let records = readCollection(collection).filter(r => matches(r, query));
  records = applySort(records, sort);
  if (limit) records = records.slice(0, limit);
  return records;
}

export function get(collection, id) {
  return readCollection(collection).find(r => r.id === id) || null;
}

export function create(collection, data) {
  const records = readCollection(collection);
  const record = {
    id: randomUUID(),
    created_date: new Date().toISOString(),
    ...data,
  };
  records.push(record);
  writeCollection(collection, records);
  return record;
}

export function bulkCreate(collection, dataArray) {
  const records = readCollection(collection);
  const created = dataArray.map(data => ({
    id: randomUUID(),
    created_date: new Date().toISOString(),
    ...data,
  }));
  writeCollection(collection, records.concat(created));
  return created;
}

export function update(collection, id, data) {
  const records = readCollection(collection);
  const idx = records.findIndex(r => r.id === id);
  if (idx === -1) return null;
  records[idx] = { ...records[idx], ...data, id, updated_date: new Date().toISOString() };
  writeCollection(collection, records);
  return records[idx];
}

export function remove(collection, id) {
  const records = readCollection(collection);
  const next = records.filter(r => r.id !== id);
  writeCollection(collection, next);
  return next.length !== records.length;
}

export function removeMany(collection, query) {
  const records = readCollection(collection);
  const next = records.filter(r => !matches(r, query));
  writeCollection(collection, next);
  return records.length - next.length;
}
