import { openDB } from 'idb';

const DB_NAME = 'notes-akshay';
const DB_VERSION = 1;
const STORE_NAME = 'notes';

let dbPromise;

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('updatedAt', 'updatedAt', { unique: false });
        }
      },
    });
  }
  return dbPromise;
}

export async function getAllNotes() {
  const db = await getDb();
  const notes = await db.getAllFromIndex(STORE_NAME, 'updatedAt');
  notes.reverse();
  const pinned = notes.filter(n => n.isPinned);
  const unpinned = notes.filter(n => !n.isPinned);
  return [...pinned, ...unpinned];
}

export async function getNote(id) {
  const db = await getDb();
  return db.get(STORE_NAME, id);
}

export async function addNote(note) {
  const db = await getDb();
  await db.add(STORE_NAME, note);
  return note;
}

export async function updateNote(note) {
  const db = await getDb();
  note.updatedAt = Date.now();
  await db.put(STORE_NAME, note);
  return note;
}

export async function deleteNote(id) {
  const db = await getDb();
  await db.delete(STORE_NAME, id);
}

export async function deleteNotes(ids) {
  const db = await getDb();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  await Promise.all(ids.map(id => tx.objectStore(STORE_NAME).delete(id)));
  await tx.done;
}

export async function getAllNotesRaw() {
  const db = await getDb();
  return db.getAll(STORE_NAME);
}

export async function clearAndImportNotes(notes) {
  const db = await getDb();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  await tx.objectStore(STORE_NAME).clear();
  for (const note of notes) {
    await tx.objectStore(STORE_NAME).put(note);
  }
  await tx.done;
}

export async function getNotesGroupedByDate() {
  const db = await getDb();
  const all = await db.getAll(STORE_NAME);
  const map = {};
  all.forEach(n => {
    const d = new Date(n.createdAt);
    const key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    if (!map[key]) map[key] = [];
    map[key].push(n);
  });
  return map;
}

export async function searchNotes(query) {
  const db = await getDb();
  const all = await db.getAll(STORE_NAME);
  const lower = query.toLowerCase();
  const matches = all
    .filter(n => n.title.toLowerCase().includes(lower) || n.body.toLowerCase().includes(lower))
    .sort((a, b) => b.updatedAt - a.updatedAt);
  const pinned = matches.filter(n => n.isPinned);
  const unpinned = matches.filter(n => !n.isPinned);
  return [...pinned, ...unpinned];
}
