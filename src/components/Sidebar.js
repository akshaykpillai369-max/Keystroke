import { getAllNotes, deleteNotes, deleteNote, updateNote } from '../db.js';
import { createNoteItem, updateNoteItem } from './NoteItem.js';

const notesList = document.getElementById('notes-list');
const sidebar = document.getElementById('sidebar');
const sidebarEmpty = document.getElementById('sidebar-empty');
const searchInput = document.getElementById('search-input');
const selectionBar = document.getElementById('selection-bar');
const selectAllCheckbox = document.getElementById('select-all');
const selectionCount = document.getElementById('selection-count');
const btnDeleteSelected = document.getElementById('btn-delete-selected');
const btnSelect = document.getElementById('btn-select');
const btnSort = document.getElementById('btn-sort');

let allNotes = [];
let selectedId = null;
let selectedIds = new Set();
let selectMode = false;
let onSelect = null;
let onDelete = null;
let sortKey = 'updated';
let sortMenu = null;

const SORT_OPTIONS = [
  { key: 'updated', label: 'Recently modified' },
  { key: 'created', label: 'Recently created' },
  { key: 'title', label: 'Title A-Z' },
  { key: 'title-desc', label: 'Title Z-A' },
];

export function initSidebar(onNoteSelect, onNoteDelete) {
  onSelect = onNoteSelect;
  onDelete = onNoteDelete;
  searchInput.addEventListener('input', () => render());

  btnSelect.addEventListener('click', () => {
    selectMode = !selectMode;
    btnSelect.classList.toggle('active', selectMode);
    sidebar.classList.toggle('select-mode', selectMode);
    selectionBar.classList.toggle('hidden', !selectMode);
    if (!selectMode) {
      selectedIds.clear();
      syncNotesSelection(allNotes);
    }
    render();
  });

  selectAllCheckbox.addEventListener('change', () => {
    const visible = getVisibleNotes();
    if (selectAllCheckbox.checked) {
      visible.forEach(n => selectedIds.add(n.id));
    } else {
      visible.forEach(n => selectedIds.delete(n.id));
    }
    syncNotesSelection(visible);
    updateSelectionUI();
    render();
  });

  btnDeleteSelected.addEventListener('click', async () => {
    const ids = [...selectedIds];
    const count = ids.length;
    if (count === 0) return;
    if (!confirm(`Delete ${count} selected note${count === 1 ? '' : 's'}?`)) return;
    const deletedNotes = ids.map(id => allNotes.find(n => n.id === id)).filter(Boolean);
    await deleteNotes(ids);
    const wasOpen = selectedIds.has(selectedId);
    ids.forEach(id => { if (onDelete) onDelete(id); });
    selectedIds.clear();
    if (wasOpen) selectedId = null;
    allNotes = await getAllNotes();
    updateSelectionUI();
    render();
    showToast(`Deleted ${count} note${count === 1 ? '' : 's'}`, async () => {
      for (const note of deletedNotes) {
        await updateNote(note);
      }
      allNotes = await getAllNotes();
      syncNotesSelection(allNotes);
      updateSelectionUI();
      render();
    });
  });

  btnSort.addEventListener('click', () => {
    if (sortMenu) { hideSortMenu(); return; }
    showSortMenu();
  });

  document.addEventListener('click', (e) => {
    if (contextMenu && !contextMenu.contains(e.target)) {
      hideContextMenu();
    }
    if (sortMenu && !sortMenu.contains(e.target) && !btnSort.contains(e.target)) {
      hideSortMenu();
    }
  });
}

function getVisibleNotes() {
  const items = notesList.querySelectorAll('.note-item');
  const idSet = new Set();
  items.forEach(li => idSet.add(li.dataset.id));
  return allNotes.filter(n => idSet.has(n.id));
}

function syncNotesSelection(notes) {
  notes.forEach(n => { n._selected = selectedIds.has(n.id); });
}

export function updateSelectionUI() {
  const visible = getVisibleNotes();
  const allSelected = visible.length > 0 && visible.every(n => selectedIds.has(n.id));
  selectAllCheckbox.checked = allSelected;
  const count = selectedIds.size;
  selectionCount.textContent = count > 0 ? `${count} selected` : '';
  selectionBar.classList.toggle('has-selection', count > 0);
}

export async function refreshNotes() {
  allNotes = await getAllNotes();
  syncNotesSelection(allNotes);
  updateSelectionUI();
  render();
}

export function setSelectedId(id) {
  selectedId = id;
  render();
}

function sortNotes(notes) {
  const sorted = [...notes];
  sorted.sort((a, b) => {
    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
    switch (sortKey) {
      case 'updated': return (b.updatedAt || 0) - (a.updatedAt || 0);
      case 'created': return (b.createdAt || 0) - (a.createdAt || 0);
      case 'title': return a.title.localeCompare(b.title);
      case 'title-desc': return b.title.localeCompare(a.title);
      default: return 0;
    }
  });
  return sorted;
}

function showSortMenu() {
  hideSortMenu();
  sortMenu = document.createElement('div');
  sortMenu.className = 'sort-menu';
  const rect = btnSort.getBoundingClientRect();
  sortMenu.style.left = rect.left + 'px';
  sortMenu.style.top = rect.bottom + 4 + 'px';
  SORT_OPTIONS.forEach(opt => {
    const btn = document.createElement('button');
    btn.textContent = opt.label;
    btn.classList.toggle('active', sortKey === opt.key);
    btn.addEventListener('click', () => {
      sortKey = opt.key;
      hideSortMenu();
      render();
    });
    sortMenu.appendChild(btn);
  });
  document.body.appendChild(sortMenu);
}

function hideSortMenu() {
  if (sortMenu) { sortMenu.remove(); sortMenu = null; }
}

async function render() {
  const query = searchInput.value.trim();
  let notes;
  if (query) {
    const lower = query.toLowerCase();
    notes = allNotes.filter(n =>
      n.title.toLowerCase().includes(lower) || n.body.toLowerCase().includes(lower)
    );
  } else {
    notes = allNotes;
  }
  notes = sortNotes(notes);
  notesList.innerHTML = '';
  const hasNotes = notes.length > 0;
  notesList.classList.toggle('hidden', !hasNotes);
  sidebarEmpty.classList.toggle('hidden', hasNotes);
  if (!hasNotes) return;

  notes.forEach((note, i) => {
    const li = createNoteItem(note, note.id === selectedId);
    li.style.setProperty('--i', i);
    const content = li.querySelector('[data-content]');
    content.addEventListener('click', (e) => {
      e.stopPropagation();
      if (selectMode) {
        const cb = li.querySelector('.note-checkbox input');
        cb.checked = !cb.checked;
        cb.dispatchEvent(new Event('change', { bubbles: true }));
      } else {
        onSelect(note.id);
      }
    });
    const checkbox = li.querySelector('[data-checkbox]');
    checkbox.addEventListener('click', (e) => e.stopPropagation());
    checkbox.addEventListener('change', () => {
      if (selectedIds.has(note.id)) {
        selectedIds.delete(note.id);
      } else {
        selectedIds.add(note.id);
      }
      syncNotesSelection(getVisibleNotes());
      updateSelectionUI();
    });
    li.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      showContextMenu(e.clientX, e.clientY, note.id, li);
    });
    notesList.appendChild(li);
  });
}

// Context menu
let contextMenu = null;

function showContextMenu(x, y, noteId) {
  hideContextMenu();
  const note = allNotes.find(n => n.id === noteId);
  if (!note) return;
  contextMenu = document.createElement('div');
  contextMenu.className = 'context-menu';
  contextMenu.style.left = x + 'px';
  contextMenu.style.top = y + 'px';

  const pinBtn = document.createElement('button');
  pinBtn.textContent = note.isPinned ? 'Unpin note' : 'Pin note';
  pinBtn.addEventListener('click', async () => {
    hideContextMenu();
    note.isPinned = !note.isPinned;
    await updateNote(note);
    allNotes = await getAllNotes();
    syncNotesSelection(allNotes);
    render();
    updateSelectionUI();
    showToast(note.isPinned ? 'Note pinned' : 'Note unpinned');
  });
  contextMenu.appendChild(pinBtn);

  const delBtn = document.createElement('button');
  delBtn.textContent = 'Delete note';
  delBtn.addEventListener('click', async () => {
    hideContextMenu();
    if (!confirm('Delete this note?')) return;
    const deletedNote = allNotes.find(n => n.id === noteId);
    await deleteNote(noteId);
    if (onDelete) onDelete(noteId);
    if (selectedId === noteId) selectedId = null;
    selectedIds.delete(noteId);
    allNotes = await getAllNotes();
    updateSelectionUI();
    render();
    if (deletedNote) {
      showToast('Note deleted', async () => {
        await updateNote(deletedNote);
        allNotes = await getAllNotes();
        syncNotesSelection(allNotes);
        updateSelectionUI();
        render();
      });
    }
  });
  contextMenu.appendChild(delBtn);

  document.body.appendChild(contextMenu);
}

function hideContextMenu() {
  if (contextMenu) {
    contextMenu.remove();
    contextMenu = null;
  }
}

let toastTimer = null;

function showToast(msg, onUndo) {
  const toast = document.getElementById('toast');
  clearTimeout(toastTimer);
  if (onUndo) {
    toast.innerHTML = `<span>${msg}</span><button class="toast-undo">Undo</button>`;
    toast.querySelector('.toast-undo').addEventListener('click', () => {
      clearTimeout(toastTimer);
      toast.classList.add('hidden');
      onUndo();
    });
    toastTimer = setTimeout(() => toast.classList.add('hidden'), 5000);
  } else {
    toast.textContent = msg;
    toastTimer = setTimeout(() => toast.classList.add('hidden'), 2000);
  }
  toast.classList.remove('hidden', 'error');
}

export function updateNoteInList(note) {
  const li = notesList.querySelector(`[data-id="${note.id}"]`);
  if (li) updateNoteItem(li, note);
}

export function removeNoteFromList(id) {
  selectedIds.delete(id);
  updateSelectionUI();
  const li = notesList.querySelector(`[data-id="${id}"]`);
  if (li) li.remove();
}
