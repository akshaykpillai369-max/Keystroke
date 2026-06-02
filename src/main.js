import { getAllNotesRaw, clearAndImportNotes, getNotesGroupedByDate } from './db.js';
import { initSidebar, refreshNotes, setSelectedId, updateNoteInList, removeNoteFromList, setDateFilter } from './components/Sidebar.js';
import { initEditor, openNote, clearEditor, setMode, triggerSave } from './components/Editor.js';
import { generateId, formatDate } from './utils.js';
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
  else if (parts[0] === 'calendar') onRoute('calendar');
  else onRoute(null);
}
function initRouter(cb) { onRoute = cb; window.addEventListener('hashchange', handleRoute); handleRoute(); }

function navigateToNote(id) { window.location.hash = '#/note/' + id; }
function navigateToAbout() { window.location.hash = '#/about'; }
function navigateToSettings() { window.location.hash = '#/settings'; }
function navigateToCalendar() { window.location.hash = '#/calendar'; }

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

// Calendar
let calYear, calMonth;
function renderCalendarPage(container) {
  const now = new Date();
  if (!calYear) calYear = now.getFullYear();
  if (calMonth === undefined) calMonth = now.getMonth();

  getNotesGroupedByDate().then(notesByDate => {
    container.innerHTML = '';
    const wrapper = document.createElement('div');
    wrapper.className = 'calendar-wrapper';

    const header = document.createElement('div');
    header.className = 'cal-header';

    const backBtn = document.createElement('button');
    backBtn.className = 'back-btn cal-back';
    backBtn.textContent = '← Back';
    backBtn.addEventListener('click', goHome);
    header.appendChild(backBtn);

    const nav = document.createElement('div');
    nav.className = 'cal-nav';

    const prevBtn = document.createElement('button');
    prevBtn.className = 'cal-nav-btn';
    prevBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="15 18 9 12 15 6"/></svg>';
    prevBtn.addEventListener('click', () => { calMonth--; if (calMonth < 0) { calMonth = 11; calYear--; } renderCalendarPage(container); });

    const monthLabel = document.createElement('span');
    monthLabel.className = 'cal-month-label';
    const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    monthLabel.textContent = months[calMonth] + ' ' + calYear;

    const nextBtn = document.createElement('button');
    nextBtn.className = 'cal-nav-btn';
    nextBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg>';
    nextBtn.addEventListener('click', () => { calMonth++; if (calMonth > 11) { calMonth = 0; calYear++; } renderCalendarPage(container); });

    nav.appendChild(prevBtn);
    nav.appendChild(monthLabel);
    nav.appendChild(nextBtn);
    header.appendChild(nav);
    wrapper.appendChild(header);

    const daysHeader = document.createElement('div');
    daysHeader.className = 'cal-days-header';
    ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].forEach(d => {
      const el = document.createElement('span');
      el.className = 'cal-day-name';
      el.textContent = d;
      daysHeader.appendChild(el);
    });
    wrapper.appendChild(daysHeader);

    const grid = document.createElement('div');
    grid.className = 'cal-grid';

    const firstDay = new Date(calYear, calMonth, 1).getDay();
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
    const today = new Date();
    const todayStr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');

    for (let i = 0; i < firstDay; i++) {
      const empty = document.createElement('div');
      empty.className = 'cal-cell cal-empty';
      grid.appendChild(empty);
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = calYear + '-' + String(calMonth + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0');
      const cell = document.createElement('div');
      cell.className = 'cal-cell';
      if (dateStr === todayStr) cell.classList.add('cal-today');

      const notes = notesByDate[dateStr];
      if (notes && notes.length) {
        cell.classList.add('cal-has-notes');
      }

      const num = document.createElement('span');
      num.className = 'cal-day-num';
      num.textContent = d;
      cell.appendChild(num);

      if (notes && notes.length) {
        const dot = document.createElement('span');
        dot.className = 'cal-dot';
        dot.textContent = notes.length;
        cell.appendChild(dot);
      }

      cell.addEventListener('click', () => {
        setDateFilter(dateStr);
      });

      grid.appendChild(cell);
    }

    wrapper.appendChild(grid);
    container.appendChild(wrapper);
    animatePage(container);
  });
}

function showCalendar() {
  toggleSidebar(false);
  hideAllPages();
  const calPage = document.getElementById('calendar-page');
  calPage.classList.remove('hidden');
  calPage.classList.remove('page-enter');
  editorContent.classList.add('hidden');
  document.getElementById('empty-state').classList.add('hidden');
  renderCalendarPage(calPage);
  setSelectedId(null);
}

// App state
const aboutPage = document.getElementById('about-page');
const settingsPage = document.getElementById('settings-page');
const calendarPage = document.getElementById('calendar-page');
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

document.getElementById('btn-calendar').addEventListener('click', () => {
  if (window.location.hash === '#/calendar') window.location.hash = '#/';
  else navigateToCalendar();
});
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
  if (e.target.closest('#landing-notes')) toggleSidebar(true);
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
  calendarPage.classList.add('hidden');
  aboutPage.classList.remove('page-enter');
  settingsPage.classList.remove('page-enter');
  calendarPage.classList.remove('page-enter');
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
    else if (id === 'calendar') showCalendar();
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
