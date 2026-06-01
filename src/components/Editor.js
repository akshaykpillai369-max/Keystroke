import { marked } from 'marked';
import { getNote, addNote, updateNote, deleteNote, getAllNotes } from '../db.js';
import { formatDate, generateId } from '../utils.js';

const titleInput = document.getElementById('note-title');
const bodyEditor = document.getElementById('note-body');
const notePreview = document.getElementById('note-preview');
const editorContent = document.getElementById('editor-content');
const emptyState = document.getElementById('empty-state');
const noteMeta = document.getElementById('note-meta');
const lineCount = document.getElementById('line-count');
const wordCount = document.getElementById('word-count');
const cursorPos = document.getElementById('cursor-pos');
const saveStatus = document.getElementById('save-status');
const deleteBtn = document.getElementById('btn-delete');
const btnEdit = document.getElementById('btn-edit');
const btnPreview = document.getElementById('btn-preview');
const btnPin = document.getElementById('btn-pin');
const btnBold = document.getElementById('btn-bold');
const btnItalic = document.getElementById('btn-italic');
const btnUnderline = document.getElementById('btn-underline');
const btnSaveTxt = document.getElementById('btn-save-txt');
const btnSaveMd = document.getElementById('btn-save-md');
const btnImage = document.getElementById('btn-image');
const btnFontSize = document.getElementById('btn-font-size');
const btnFullscreen = document.getElementById('btn-fullscreen');
const btnHeading = document.getElementById('btn-heading');
const btnLink = document.getElementById('btn-link');
const btnList = document.getElementById('btn-list');
const btnCode = document.getElementById('btn-code');
const btnUndo = document.getElementById('btn-undo');
const btnRedo = document.getElementById('btn-redo');

let currentNote = null;
let saveTimeout = null;
let onDelete = null;
let onSave = null;
let updatingBullets = false;
let saveState = 'saved';
let isEditing = true;

const autoPairs = { '(': ')', '[': ']', '{': '}', '"': '"', "'": "'" };

function domToMarkdown(root) {
  let md = '';
  function walk(node, indent) {
    if (node.nodeType === Node.TEXT_NODE) {
      md += node.textContent;
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const tag = node.tagName.toLowerCase();
    if (tag === 'br') { md += '\n'; return; }
    if (tag === 'div' || tag === 'p') {
      const prevEnd = md.endsWith('\n');
      if (!prevEnd && md.length > 0) md += '\n';
      for (const child of node.childNodes) walk(child, indent);
      md += '\n';
      return;
    }
    if (tag.match(/^h[1-6]$/)) {
      const level = parseInt(tag[1]);
      md += '#'.repeat(level) + ' ';
      for (const child of node.childNodes) walk(child, indent);
      md += '\n';
      return;
    }
    if (tag === 'a') {
      const url = node.getAttribute('href') || '';
      md += '[';
      for (const child of node.childNodes) walk(child, indent);
      md += '](' + url + ')';
      return;
    }
    if (tag === 'strong' || tag === 'b') {
      md += '**';
      for (const child of node.childNodes) walk(child, indent);
      md += '**';
      return;
    }
    if (tag === 'em' || tag === 'i') {
      md += '*';
      for (const child of node.childNodes) walk(child, indent);
      md += '*';
      return;
    }
    if (tag === 'u') {
      md += '<u>';
      for (const child of node.childNodes) walk(child, indent);
      md += '</u>';
      return;
    }
    if (tag === 'ul') {
      for (const child of node.childNodes) {
        if (child.tagName === 'LI') {
          md += '\n' + indent + '- ';
          for (const c of child.childNodes) walk(c, indent + '  ');
        }
      }
      md += '\n';
      return;
    }
    if (tag === 'ol') {
      let i = 1;
      for (const child of node.childNodes) {
        if (child.tagName === 'LI') {
          md += '\n' + indent + i + '. ';
          for (const c of child.childNodes) walk(c, indent + '   ');
          i++;
        }
      }
      md += '\n';
      return;
    }
    if (tag === 'pre') {
      const codeContent = node.textContent;
      md += '\n```\n' + codeContent.replace(/\n$/, '') + '\n```\n';
      return;
    }
    if (tag === 'code') {
      const parent = node.parentElement;
      if (parent && parent.tagName === 'PRE') return;
      md += '`' + node.textContent + '`';
      return;
    }
    if (tag === 'blockquote') {
      const inner = node.textContent;
      md += '\n> ' + inner.replace(/\n/g, '\n> ') + '\n';
      return;
    }
    if (tag === 'img') {
      const src = node.getAttribute('src') || '';
      const alt = node.getAttribute('alt') || '';
      md += '![' + alt + '](' + src + ')';
      return;
    }
    if (tag === 'li') {
      for (const c of node.childNodes) walk(c, indent);
      return;
    }
    for (const child of node.childNodes) walk(child, indent);
  }
  for (const child of root.childNodes) walk(child, '');
  return md.replace(/\n{4,}/g, '\n\n').trim();
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function mdToEditorHtml(text) {
  if (!text) return '';
  const lines = text.split('\n');
  const out = [];
  let inCode = false;
  let codeBuf = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trimStart().startsWith('```')) {
      if (inCode) {
        out.push('<pre>' + escapeHtml(codeBuf.join('\n')) + '</pre>');
        codeBuf = [];
        inCode = false;
      } else {
        inCode = true;
      }
      continue;
    }
    if (inCode) { codeBuf.push(line); continue; }
    const trimmed = line.trimStart();
    if (trimmed.startsWith('### ')) {
      out.push('<h3>' + escapeHtml(trimmed.slice(3)) + '</h3>');
    } else if (trimmed.startsWith('## ')) {
      out.push('<h2>' + escapeHtml(trimmed.slice(2)) + '</h2>');
    } else if (trimmed.startsWith('# ')) {
      out.push('<h1>' + escapeHtml(trimmed.slice(1)) + '</h1>');
    } else {
      const escaped = escapeHtml(line);
      const processed = escaped
        .replace(/\[([^\]]*)\]\(([^)]*)\)/g, '<a href="$2">$1</a>')
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/\*([^*]+)\*/g, '<em>$1</em>');
      const cls = line.startsWith('\u2022') ? ' class="bullet-line"' : '';
      out.push('<div' + cls + '>' + (processed || '<br>') + '</div>');
    }
  }
  if (inCode && codeBuf.length) {
    out.push('<pre>' + escapeHtml(codeBuf.join('\n')) + '</pre>');
  }
  return out.join('\n');
}

function getEditorValue() {
  return domToMarkdown(bodyEditor);
}

function setEditorValue(val) {
  if (!val || !val.trim()) { bodyEditor.innerHTML = ''; return; }
  bodyEditor.innerHTML = mdToEditorHtml(val);
}

function updateBulletClass() {
  if (updatingBullets) return;
  updatingBullets = true;
  const targets = bodyEditor.querySelectorAll('p, div, li');
  for (const el of targets) {
    const text = el.innerText || '';
    const isBullet = text.startsWith('\u2022');
    el.classList.toggle('bullet-line', isBullet);
    if (isBullet) {
      const first = el.firstChild;
      if (first && first.nodeType === Node.ELEMENT_NODE && (first.tagName === 'STRONG' || first.tagName === 'B') && first.textContent.startsWith('\u2022')) {
        const span = document.createElement('span');
        span.textContent = '\u2022';
        span.style.fontWeight = 'normal';
        first.textContent = first.textContent.slice(1);
        el.insertBefore(span, first);
      }
    }
  }
  updatingBullets = false;
}

function getCursorOffset() {
  const sel = window.getSelection();
  if (!sel.rangeCount) return 0;
  const range = sel.getRangeAt(0);
  if (!bodyEditor.contains(range.startContainer)) return 0;
  const pre = document.createRange();
  pre.selectNodeContents(bodyEditor);
  pre.setEnd(range.startContainer, range.startOffset);
  return pre.toString().length;
}

function setSaveState(state) {
  saveState = state;
  if (!saveStatus) return;
  saveStatus.className = 'save-status ' + state;
  if (state === 'saving') saveStatus.textContent = 'Saving...';
  else if (state === 'saved') saveStatus.textContent = 'Saved';
  else if (state === 'unsaved') saveStatus.textContent = 'Unsaved';
}

function updateWordCount() {
  if (!wordCount) return;
  const text = getEditorValue();
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const chars = text.length;
  wordCount.textContent = `${words}w / ${chars}c`;
}

function insertAtCursor(html) {
  bodyEditor.focus();
  const sel = window.getSelection();
  if (!sel.rangeCount) return;
  const range = sel.getRangeAt(0);
  const temp = document.createElement('div');
  temp.innerHTML = html;
  const fragment = document.createDocumentFragment();
  while (temp.firstChild) fragment.appendChild(temp.firstChild);
  range.deleteContents();
  range.insertNode(fragment);
  range.collapse(false);
  sel.removeAllRanges();
  sel.addRange(range);
  scheduleSave();
}

// --- Editor init ---

export function initEditor(onNoteDeleted, onNoteSaved) {
  onDelete = onNoteDeleted;
  onSave = onNoteSaved;

  titleInput.addEventListener('input', () => { setSaveState('unsaved'); scheduleSave(); });
  titleInput.addEventListener('input', updateWordCount);

  bodyEditor.addEventListener('input', () => {
    setSaveState('unsaved');
    updateBulletClass();
    updateLineCount();
    updateCursorPos();
    updateWordCount();
    scheduleSave();
  });

  bodyEditor.addEventListener('click', updateCursorPos);
  bodyEditor.addEventListener('keyup', updateCursorPos);

  let imgDeleteAllowed = false;

  function allowImgDelete() { imgDeleteAllowed = true; }

  const imgObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const removed of mutation.removedNodes) {
        if (removed.nodeType !== Node.ELEMENT_NODE) continue;
        const lost = removed.tagName === 'IMG' ? [removed] : removed.querySelectorAll('img');
        for (const img of lost) {
          if (imgDeleteAllowed) continue;
          showToast('Use right-click \u2192 Delete to remove images');
          if (mutation.nextSibling) {
            mutation.target.insertBefore(img, mutation.nextSibling);
          } else {
            mutation.target.appendChild(img);
          }
        }
      }
    }
  });
  imgObserver.observe(bodyEditor, { childList: true, subtree: true });

  bodyEditor.addEventListener('beforeinput', (e) => {
    if (e.inputType !== 'insertText') return;
    const ch = e.data;
    if (!ch || ch.length !== 1) return;
    const close = autoPairs[ch];
    if (!close) return;
    const sel = window.getSelection();
    if (!sel.rangeCount) return;
    const range = sel.getRangeAt(0);
    if (!range.collapsed) return;
    const node = range.startContainer;
    if (node.nodeType !== Node.TEXT_NODE) return;
    const offset = range.startOffset;
    e.preventDefault();
    node.textContent = node.textContent.slice(0, offset) + ch + close + node.textContent.slice(offset);
    const r = document.createRange();
    r.setStart(node, offset + 1);
    r.collapse(true);
    sel.removeAllRanges();
    sel.addRange(r);
    updateBulletClass();
    updateCursorPos();
    scheduleSave();
  });

  bodyEditor.addEventListener('keydown', (e) => {
    const sel = window.getSelection();
    const ch = e.key;
    if (ch.length !== 1 && ch !== 'Backspace') return;

    if (ch === 'Backspace') {
      if (!sel.rangeCount) return;
      const range = sel.getRangeAt(0);
      if (!range.collapsed) return;
      const node = range.startContainer;
      if (node.nodeType !== Node.TEXT_NODE) return;
      const offset = range.startOffset;
      if (offset === 0 || offset > node.textContent.length) return;
      const text = node.textContent;
      const prev = text[offset - 1];
      const next = text[offset];
      if (prev && next && autoPairs[prev] === next) {
        e.preventDefault();
        node.textContent = text.slice(0, offset - 1) + text.slice(offset + 1);
        const r = document.createRange();
        r.setStart(node, offset - 1);
        r.collapse(true);
        sel.removeAllRanges();
        sel.addRange(r);
        scheduleSave();
      }
      return;
    }

    if (!sel.rangeCount) return;
    const range = sel.getRangeAt(0);
    if (!range.collapsed) return;
    const node = range.startContainer;
    if (node.nodeType !== Node.TEXT_NODE) return;
    const offset = range.startOffset;
    const text = node.textContent;

    if (offset >= 1) {
      const prev = text[offset - 1];
      if (prev === '.' && ch === ',') {
        e.preventDefault();
        node.textContent = text.slice(0, offset - 1) + '\u2022' + text.slice(offset);
        const r = document.createRange();
        r.setStart(node, offset);
        r.collapse(true);
        sel.removeAllRanges();
        sel.addRange(r);
        updateBulletClass();
        updateCursorPos();
        scheduleSave();
        return;
      }
      if ((prev === '=' || prev === '-') && ch === '>') {
        e.preventDefault();
        node.textContent = text.slice(0, offset - 1) + '\u2192' + text.slice(offset);
        const r = document.createRange();
        r.setStart(node, offset);
        r.collapse(true);
        sel.removeAllRanges();
        sel.addRange(r);
        updateBulletClass();
        updateCursorPos();
        scheduleSave();
        return;
      }
    }
  });

  let autoReplacing = false;
  bodyEditor.addEventListener('input', () => {
    if (autoReplacing) return;
    const sel = window.getSelection();
    if (!sel.rangeCount) return;
    const range = sel.getRangeAt(0);
    if (!range.collapsed) return;
    const node = range.startContainer;
    if (node.nodeType !== Node.TEXT_NODE) return;
    const offset = range.startOffset;
    if (offset < 2) return;
    const text = node.textContent;
    const prev2 = text.slice(offset - 2, offset);
    let replacement = null;
    if (prev2 === '.,') replacement = '•';
    else if (prev2 === '=>' || prev2 === '->') replacement = '→';
    if (!replacement) return;
    autoReplacing = true;
    node.textContent = text.slice(0, offset - 2) + replacement + text.slice(offset);
    const r = document.createRange();
    r.setStart(node, offset - 1);
    r.collapse(true);
    sel.removeAllRanges();
    sel.addRange(r);
    updateBulletClass();
    updateCursorPos();
    scheduleSave();
    autoReplacing = false;
  });

  btnEdit.addEventListener('click', () => setMode(true));
  btnPreview.addEventListener('click', () => setMode(false));

  btnPin.addEventListener('click', () => {
    if (!currentNote) return;
    currentNote.isPinned = !currentNote.isPinned;
    updateNote(currentNote);
    btnPin.classList.toggle('active', currentNote.isPinned);
    showToast(currentNote.isPinned ? 'Note pinned' : 'Note unpinned');
    onSave(currentNote);
  });

  deleteBtn.addEventListener('click', async () => {
    if (!currentNote) return;
    await deleteNote(currentNote.id);
    showToast('Note deleted');
    onDelete(currentNote.id);
    clearEditor();
  });

  const exec = (cmd) => {
    document.execCommand(cmd);
    bodyEditor.focus();
    scheduleSave();
  };
  btnBold.addEventListener('mousedown', (e) => { e.preventDefault(); exec('bold'); });
  btnItalic.addEventListener('mousedown', (e) => { e.preventDefault(); exec('italic'); });
  btnUnderline.addEventListener('mousedown', (e) => { e.preventDefault(); exec('underline'); });

  btnUndo.addEventListener('mousedown', (e) => { e.preventDefault(); exec('undo'); });
  btnRedo.addEventListener('mousedown', (e) => { e.preventDefault(); exec('redo'); });

  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'image/*';
  fileInput.style.display = 'none';
  document.body.appendChild(fileInput);
  btnImage.addEventListener('click', () => { fileInput.click(); });
  fileInput.addEventListener('change', () => {
    const file = fileInput.files[0];
    if (!file) return;
    fileInput.value = '';
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target.result;
      const w = prompt('Image width in pixels (leave empty for auto):', '400');
      bodyEditor.focus();
      const sel = window.getSelection();
      if (!sel.rangeCount) return;
      const range = sel.getRangeAt(0);
      const img = document.createElement('img');
      img.src = dataUrl;
      img.style.maxWidth = '100%';
      if (w && !isNaN(w) && Number(w) > 0) img.setAttribute('width', Number(w));
      range.deleteContents();
      range.insertNode(img);
      range.setStartAfter(img);
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);
      scheduleSave();
    };
    reader.readAsDataURL(file);
  });

  bodyEditor.addEventListener('dblclick', (e) => {
    if (e.target.tagName === 'IMG') {
      const img = e.target;
      const w = prompt('Resize image width in pixels (leave empty for auto):', img.getAttribute('width') || '');
      if (w && !isNaN(w) && Number(w) > 0) img.setAttribute('width', Number(w));
      else if (w === '') img.removeAttribute('width');
      scheduleSave();
    }
  });

  btnFontSize.addEventListener('click', () => {
    const sel = window.getSelection();
    if (!sel.rangeCount || sel.getRangeAt(0).collapsed) {
      showToast('Select text first to change font size');
      return;
    }
    const px = prompt('Enter font size (px):', '18');
    if (!px || isNaN(px) || Number(px) <= 0) return;
    bodyEditor.focus();
    const range = sel.getRangeAt(0);
    const fragment = range.extractContents();
    const span = document.createElement('span');
    span.style.fontSize = Number(px) + 'px';
    span.appendChild(fragment);
    range.insertNode(span);
    range.setStartAfter(span);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
    scheduleSave();
  });

  bodyEditor.addEventListener('contextmenu', (e) => {
    if (e.target.tagName !== 'IMG') return;
    e.preventDefault();
    const img = e.target;
    const existing = document.querySelector('.img-context-menu');
    if (existing) existing.remove();
    const menu = document.createElement('div');
    menu.className = 'context-menu img-context-menu';
    menu.style.left = e.clientX + 'px';
    menu.style.top = e.clientY + 'px';
    const delBtn = document.createElement('button');
    delBtn.textContent = 'Delete image';
    delBtn.addEventListener('click', () => {
      menu.remove();
      allowImgDelete();
      img.remove();
      scheduleSave();
    });
    menu.appendChild(delBtn);
    document.body.appendChild(menu);
  });

  document.addEventListener('click', (e) => {
    const menu = document.querySelector('.img-context-menu');
    if (menu && !menu.contains(e.target)) menu.remove();
  });

  btnSaveTxt.addEventListener('click', () => {
    if (!currentNote) return;
    const title = currentNote.title || 'untitled';
    const body = currentNote.body || '';
    const html = marked.parse(body);
    const plain = html.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"');
    const content = title + '\n\n' + plain;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = title.replace(/[<>:"/\\|?*]/g, '_') + '.txt';
    a.click();
    URL.revokeObjectURL(url);
    showToast('Saved as TXT');
  });

  btnSaveMd.addEventListener('click', () => {
    if (!currentNote) return;
    const title = currentNote.title || 'untitled';
    const body = currentNote.body || '';
    const content = '# ' + title + '\n\n' + body;
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = title.replace(/[<>:"/\\|?*]/g, '_') + '.md';
    a.click();
    URL.revokeObjectURL(url);
    showToast('Saved as MD');
  });

  btnFullscreen.addEventListener('click', () => {
    document.getElementById('app').classList.toggle('fullscreen');
    const isFull = document.getElementById('app').classList.contains('fullscreen');
    showToast(isFull ? 'Fullscreen mode' : 'Sidebar visible');
  });

  btnHeading.addEventListener('mousedown', (e) => {
    e.preventDefault();
    bodyEditor.focus();
    document.execCommand('formatBlock', false, 'h3');
    scheduleSave();
  });
  btnLink.addEventListener('mousedown', (e) => {
    e.preventDefault();
    const sel = window.getSelection();
    if (!sel.rangeCount) return;
    const text = sel.toString().trim() || 'link text';
    const url = prompt('Enter URL:', 'https://');
    if (!url) return;
    bodyEditor.focus();
    document.execCommand('createLink', false, url);
    scheduleSave();
  });
  btnList.addEventListener('mousedown', (e) => {
    e.preventDefault();
    bodyEditor.focus();
    document.execCommand('insertUnorderedList');
    scheduleSave();
  });
  btnCode.addEventListener('mousedown', (e) => {
    e.preventDefault();
    bodyEditor.focus();
    const sel = window.getSelection();
    if (!sel.rangeCount) return;
    const range = sel.getRangeAt(0);
    const pre = document.createElement('pre');
    pre.textContent = '\n';
    range.deleteContents();
    range.insertNode(pre);
    range.setStart(pre.firstChild, 0);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
    scheduleSave();
  });
}

export function setMode(edit) {
  isEditing = edit;
  btnEdit.classList.toggle('active', edit);
  btnPreview.classList.toggle('active', !edit);
  bodyEditor.classList.toggle('hidden', !edit);
  notePreview.classList.toggle('hidden', edit);
  if (!edit) {
    const body = currentNote ? getEditorValue() : '';
    notePreview.innerHTML = marked.parse(body.replace(/^\u2022\s*/gm, '- '));
  }
}

export async function openNote(idOrNote) {
  const note = typeof idOrNote === 'string' ? await getNote(idOrNote) : idOrNote;
  if (!note) return;
  currentNote = note;
  titleInput.value = note.title || '';
  setEditorValue(note.body || '');
  noteMeta.textContent = 'Last modified ' + formatDate(note.updatedAt);
  updateLineCount();
  updateCursorPos();
  updateWordCount();
  btnPin.classList.toggle('active', !!note.isPinned);
  emptyState.classList.add('hidden');
  editorContent.classList.remove('hidden');
  setSaveState('saved');
  setMode(true);
}

export async function clearEditor() {
  clearTimeout(saveTimeout);
  saveTimeout = null;
  currentNote = null;
  titleInput.value = '';
  bodyEditor.innerHTML = '';
  notePreview.innerHTML = '';
  lineCount.textContent = '';
  cursorPos.textContent = '';
  if (wordCount) wordCount.textContent = '';
  setSaveState('saved');
  emptyState.classList.remove('hidden');
  emptyState.querySelector('.landing').classList.remove('hidden');
  const allNotes = await getAllNotes();
  const hasNotes = allNotes.length > 0;
  const cta = emptyState.querySelector('#landing-cta');
  cta.textContent = hasNotes ? 'Create note' : 'Create your first note';
  const viewBtn = emptyState.querySelector('#landing-notes');
  viewBtn.classList.toggle('hidden', !hasNotes);
  editorContent.classList.add('hidden');
}

export function triggerSave() {
  clearTimeout(saveTimeout);
  performSave();
}

function scheduleSave() {
  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(performSave, 400);
}

async function performSave() {
  if (!titleInput.value.trim() && !getEditorValue().trim()) return;
  setSaveState('saving');
  const isNew = !currentNote;
  const now = Date.now();
  const note = {
    id: isNew ? generateId() : currentNote.id,
    title: titleInput.value.trim(),
    body: getEditorValue(),
    isPinned: currentNote ? !!currentNote.isPinned : false,
    createdAt: isNew ? now : currentNote.createdAt,
    updatedAt: now,
  };
  if (isNew) {
    await addNote(note);
  } else {
    await updateNote(note);
  }
  currentNote = note;
  noteMeta.textContent = 'Last modified ' + formatDate(note.updatedAt);
  if (!isEditing) {
    notePreview.innerHTML = marked.parse(getEditorValue().replace(/^\u2022\s*/gm, '- '));
  }
  setSaveState('saved');
  onSave(note);
}

function updateLineCount() {
  if (!lineCount) return;
  const lines = getEditorValue().split('\n').length;
  lineCount.textContent = lines + ' line' + (lines === 1 ? '' : 's');
}

function updateCursorPos() {
  if (!cursorPos) return;
  const val = getEditorValue();
  const pos = getCursorOffset();
  const before = val.slice(0, pos);
  const line = before.split('\n').length;
  const col = pos - before.lastIndexOf('\n');
  cursorPos.textContent = 'Ln ' + line + ', Col ' + col;
}

function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.remove('hidden', 'error');
  setTimeout(() => toast.classList.add('hidden'), 2000);
}
