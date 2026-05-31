import { formatDate } from '../utils.js';

export function createNoteItem(note, isActive) {
  const li = document.createElement('li');
  li.className = `note-item${isActive ? ' active' : ''}`;
  li.dataset.id = note.id;
  li.innerHTML = `
    <label class="note-checkbox" data-checkbox>
      <input type="checkbox" ${note._selected ? 'checked' : ''} />
    </label>
    <div class="note-content" data-content>
      <div class="note-item-title">${note.isPinned ? '<span class="pin-indicator">&#x1F4CC;</span> ' : ''}${escapeHtml(note.title || 'Untitled')}</div>
      <div class="note-item-preview">${escapeHtml(note.body || 'Empty note')}</div>
      <div class="note-item-time">${formatDate(note.updatedAt)}</div>
    </div>
  `;
  return li;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

export function updateNoteItem(li, note) {
  const titleEl = li.querySelector('.note-item-title');
  titleEl.textContent = '';
  if (note.isPinned) {
    const pin = document.createElement('span');
    pin.className = 'pin-indicator';
    pin.innerHTML = '&#x1F4CC; ';
    titleEl.appendChild(pin);
  }
  titleEl.append(document.createTextNode(note.title || 'Untitled'));
  li.querySelector('.note-item-preview').textContent = note.body || 'Empty note';
  li.querySelector('.note-item-time').textContent = formatDate(note.updatedAt);
  const cb = li.querySelector('.note-checkbox input');
  if (cb) cb.checked = !!note._selected;
}
