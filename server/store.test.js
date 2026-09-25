import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as store from './store.js';

// Uses a throwaway collection name so this never touches real app data, and
// deletes its own data file when done.
const COLLECTION = '__test_collection__';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataFile = path.join(__dirname, 'data', `${COLLECTION}.json`);

test.after(() => {
  if (fs.existsSync(dataFile)) fs.unlinkSync(dataFile);
});

test('create assigns an id and created_date', () => {
  const record = store.create(COLLECTION, { name: 'first' });
  assert.ok(record.id);
  assert.ok(record.created_date);
  assert.equal(record.name, 'first');
});

test('list returns everything created so far', () => {
  const all = store.list(COLLECTION);
  assert.ok(all.length >= 1);
  assert.ok(all.every(r => r.name === 'first'));
});

test('filter matches on exact field equality', () => {
  store.create(COLLECTION, { name: 'second', tag: 'x' });
  store.create(COLLECTION, { name: 'third', tag: 'y' });
  const matched = store.filter(COLLECTION, { tag: 'x' });
  assert.ok(matched.every(r => r.tag === 'x'));
  assert.ok(matched.some(r => r.name === 'second'));
});

test('update merges fields without dropping the id', () => {
  const record = store.create(COLLECTION, { name: 'updatable', status: 'pending' });
  const updated = store.update(COLLECTION, record.id, { status: 'done' });
  assert.equal(updated.id, record.id);
  assert.equal(updated.status, 'done');
  assert.equal(updated.name, 'updatable');
});

test('remove deletes exactly one record', () => {
  const record = store.create(COLLECTION, { name: 'to-delete' });
  const before = store.list(COLLECTION).length;
  const ok = store.remove(COLLECTION, record.id);
  assert.equal(ok, true);
  assert.equal(store.list(COLLECTION).length, before - 1);
  assert.equal(store.get(COLLECTION, record.id), null);
});

test('removeMany deletes every record matching the query and returns the count', () => {
  store.create(COLLECTION, { name: 'batch', group: 'g1' });
  store.create(COLLECTION, { name: 'batch2', group: 'g1' });
  const count = store.removeMany(COLLECTION, { group: 'g1' });
  assert.equal(count, 2);
  assert.equal(store.filter(COLLECTION, { group: 'g1' }).length, 0);
});

test('bulkCreate assigns a distinct id to every record', () => {
  const created = store.bulkCreate(COLLECTION, [{ name: 'bulk1' }, { name: 'bulk2' }]);
  assert.equal(created.length, 2);
  assert.notEqual(created[0].id, created[1].id);
});

test('sort applies descending order with a "-" prefix', () => {
  store.create(COLLECTION, { name: 'sort-test', rank: 1 });
  store.create(COLLECTION, { name: 'sort-test', rank: 3 });
  store.create(COLLECTION, { name: 'sort-test', rank: 2 });
  const ranked = store.filter(COLLECTION, { name: 'sort-test' }, '-rank').map(r => r.rank);
  assert.deepEqual(ranked, [3, 2, 1]);
});
