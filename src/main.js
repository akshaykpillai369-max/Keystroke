import { getAllNotesRaw, clearAndImportNotes } from './db.js';
import { initSidebar, refreshNotes, setSelectedId, updateNoteInList, removeNoteFromList } from './components/Sidebar.js';
import { initEditor, openNote, clearEditor, setMode, triggerSave } from './components/Editor.js';
import { generateId } from './utils.js';
import pkg from '../package.json';

// Theme
const THEME_KEY = 'notes-akshay-theme';
function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = theme === 'dark' ? '#1c1c1e' : '#f5f5f7';
}
function initTheme() {
  applyTheme(localStorage.getItem(THEME_KEY) || 'dark');
  document.getElementById('btn-theme').addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    localStorage.setItem(THEME_KEY, next);
  });
}
initTheme();

// Router
let onRoute = null;
function handleRoute() {
  const hash = window.location.hash.slice(1) || '/';
  const parts = hash.split('/').filter(Boolean);
  if (parts[0] === 'note' && parts[1]) onRoute(parts[1]);
  else if (parts[0] === 'new') onRoute(null, true);
  else if (parts[0] === 'about') onRoute('about');
  else if (parts[0] === 'settings') onRoute('settings');
  else onRoute(null);
}
function initRouter(cb) { onRoute = cb; window.addEventListener('hashchange', handleRoute); handleRoute(); }

function navigateToNote(id) { window.location.hash = '#/note/' + id; }
function navigateToAbout() { window.location.hash = '#/about'; }
function navigateToSettings() { window.location.hash = '#/settings'; }

// Data export/import
async function exportNotes() {
  const notes = await getAllNotesRaw();
  const blob = new Blob([JSON.stringify({ version: 1, exportedAt: Date.now(), notes }, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'notes-backup.json'; a.click();
  URL.revokeObjectURL(url);
  return notes.length;
}
async function importNotes(file) {
  const text = await file.text();
  let data;
  try { data = JSON.parse(text); } catch { throw new Error('Invalid JSON file.'); }
  if (!data.notes || !Array.isArray(data.notes)) throw new Error('Invalid format: missing "notes" array.');
  for (const note of data.notes) {
    if (!note.id || !note.title === undefined || !note.body === undefined) throw new Error(`Note "${note.id || 'unknown'}" is missing required fields.`);
  }
  await clearAndImportNotes(data.notes);
  return data.notes.length;
}

// Service worker
function registerSW() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => navigator.serviceWorker.register('/Keystroke/sw-offline.js', { scope: '/Keystroke/' }));
  }
}

// About/Settings renderers
function renderAbout(container) {
  container.innerHTML = `
    <div class="about-page">
      <button class="back-btn" id="btn-back-about">← Back</button>
      <section class="about-section">
        <h2>About the App</h2>
        <p class="app-version">Version ${pkg.version}</p>
        <p>Keystroke is a fast, private, offline-first notes application. Your notes never leave your device &mdash; all data is stored locally in your browser using IndexedDB. No accounts, no cloud sync, no tracking.</p>
        <p>Write in plain text or use Markdown for rich formatting. Search, pin, and organise your thoughts in a distraction-free environment.</p>
      </section>
      <section class="about-section">
        <h2>About the Creator</h2>
        <p><strong>Akshay</strong> &mdash; a cyber security student who <span class="vibe-coded">vibe coded</span> this entire app. Built purely for the love of building, with zero dependencies on cloud services or third-party tracking.</p>
      </section>
    </div>`;
  document.getElementById('btn-back-about').addEventListener('click', goHome);
}
function goHome() { window.location.hash = '#/'; }

function renderSettings(container, handlers) {
  container.innerHTML = `
    <div class="about-page">
      <button class="back-btn" id="btn-back-settings">← Back</button>
      <section class="about-section">
        <h2>Data Management</h2>
        <p>Export your notes as a JSON backup, or import a previously exported backup.</p>
        <div class="data-actions">
          <button id="btn-export" class="btn-secondary">Export Data</button>
          <button id="btn-import" class="btn-secondary">Import Data</button>
        </div>
        <input id="file-import" type="file" accept=".json" class="hidden" />
      </section>
    </div>`;
  document.getElementById('btn-back-settings').addEventListener('click', goHome);
  document.getElementById('btn-export').addEventListener('click', handlers.export);
  document.getElementById('btn-import').addEventListener('click', () => document.getElementById('file-import').click());
  document.getElementById('file-import').addEventListener('change', (e) => {
    if (e.target.files.length) handlers.onFile(e.target.files[0]);
    e.target.value = '';
  });
}

// App state
const aboutPage = document.getElementById('about-page');
const settingsPage = document.getElementById('settings-page');
const editorContent = document.getElementById('editor-content');

function toggleSidebar(open) {
  const sidebar = document.getElementById('sidebar');
  const backdrop = document.getElementById('sidebar-backdrop');
  sidebar.classList.toggle('open', open);
  backdrop.classList.toggle('visible', open);
}
document.getElementById('btn-menu').addEventListener('click', () => toggleSidebar(true));
document.getElementById('sidebar-backdrop').addEventListener('click', () => toggleSidebar(false));
// close sidebar when a note is tapped on mobile
document.getElementById('sidebar').addEventListener('click', (e) => {
  const noteItem = e.target.closest('.note-item');
  if (noteItem && window.innerWidth <= 480) toggleSidebar(false);
});

window.addEventListener('notes-save', triggerSave);

initSidebar(
  (id) => navigateToNote(id),
  () => { window.location.hash = '#/'; }
);

initEditor(
  (deletedId) => { removeNoteFromList(deletedId); setSelectedId(null); refreshNotes(); },
  (note) => { updateNoteInList(note); refreshNotes(); }
);

document.getElementById('btn-about').addEventListener('click', () => {
  if (window.location.hash === '#/about') window.location.hash = '#/';
  else navigateToAbout();
});
document.getElementById('btn-settings').addEventListener('click', () => {
  if (window.location.hash === '#/settings') window.location.hash = '#/';
  else navigateToSettings();
});
async function createNewNote() {
  toggleSidebar(false);
  hideAllPages();
  await clearEditor();
  const id = generateId();
  await openNote({ id, title: '', body: '', createdAt: Date.now(), updatedAt: Date.now() });
  setMode(true);
  setSelectedId(null);
  editorContent.classList.remove('hidden');
  animatePage(editorContent);
}
document.getElementById('btn-new').addEventListener('click', createNewNote);
document.getElementById('empty-state').addEventListener('click', (e) => {
  if (e.target.closest('#landing-cta')) createNewNote();
});

function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.remove('hidden', 'error');
  setTimeout(() => toast.classList.add('hidden'), 2000);
}

function animatePage(el) {
  el.classList.remove('page-enter');
  void el.offsetWidth;
  el.classList.add('page-enter');
}

function hideAllPages() {
  aboutPage.classList.add('hidden');
  settingsPage.classList.add('hidden');
  aboutPage.classList.remove('page-enter');
  settingsPage.classList.remove('page-enter');
}

function showAbout() {
  toggleSidebar(false);
  hideAllPages();
  aboutPage.classList.remove('hidden');
  editorContent.classList.add('hidden');
  document.getElementById('empty-state').classList.add('hidden');
  renderAbout(aboutPage);
  setSelectedId(null);
  animatePage(aboutPage);
}

function showSettings() {
  toggleSidebar(false);
  hideAllPages();
  settingsPage.classList.remove('hidden');
  editorContent.classList.add('hidden');
  document.getElementById('empty-state').classList.add('hidden');
  renderSettings(settingsPage, {
    async export() { showToast('Exported ' + (await exportNotes()) + ' notes'); },
    async onFile(file) {
      try {
        const count = await importNotes(file);
        showToast('Imported ' + count + ' notes');
        refreshNotes();
        hideAllPages();
        window.location.hash = '#/';
      } catch (err) { showToast(err.message); }
    },
  });
  setSelectedId(null);
  animatePage(settingsPage);
}

initRouter(async (id, isNew) => {
  try {
    if (id === 'about') showAbout();
    else if (id === 'settings') showSettings();
    else {
      hideAllPages();
      if (id) {
        if (editorContent.classList.contains('page-enter')) {
          editorContent.classList.remove('page-enter', 'page-enter-fast');
          editorContent.classList.add('page-exit');
          await new Promise(r => setTimeout(r, 120));
          editorContent.classList.remove('page-exit');
        }
        await openNote(id);
        setSelectedId(id);
        editorContent.classList.remove('hidden');
        animatePage(editorContent);
      } else if (isNew) {
        await clearEditor();
        const id = generateId();
        await openNote({ id, title: '', body: '', createdAt: Date.now(), updatedAt: Date.now() });
        setMode(true);
        setSelectedId(null);
        editorContent.classList.remove('hidden');
        animatePage(editorContent);
      } else {
        await refreshNotes();
        const hadContent = !editorContent.classList.contains('hidden');
        if (hadContent) {
          editorContent.classList.add('page-exit');
          await new Promise(r => setTimeout(r, 120));
          editorContent.classList.remove('page-exit');
        }
        await clearEditor();
        setSelectedId(null);
      }
    }
  } catch (err) { console.error('Route error:', err); }
});

refreshNotes();
registerSW();

// Sidebar resize
(function() {
  const handle = document.getElementById('sidebar-resize-handle');
  const sidebar = document.getElementById('sidebar');
  if (!handle || !sidebar) return;
  const KEY = 'notes-sidebar-width';
  const saved = localStorage.getItem(KEY);
  if (saved) sidebar.style.width = saved + 'px';
  let dragging = false;
  handle.addEventListener('mousedown', () => { dragging = true; handle.classList.add('dragging'); document.body.style.cursor = 'col-resize'; document.body.style.userSelect = 'none'; });
  document.addEventListener('mousemove', (e) => { if (!dragging) return; sidebar.style.width = Math.min(500, Math.max(200, e.clientX)) + 'px'; });
  document.addEventListener('mouseup', () => {
    if (!dragging) return;
    dragging = false;
    handle.classList.remove('dragging');
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    const w = parseInt(sidebar.style.width);
    if (w) localStorage.setItem(KEY, w);
  });
})();
