import Katex from 'katex';
import Prism from 'prismjs';

import * as utils from './utils';
import Note from './note';
import NoteFile from './note-file';
import Library from './library';
import NoteHead from './note-head';

import './styles.css';
import 'katex/dist/katex.min.css';
import 'prismjs/themes/prism.css';
import ToolsView from './views/tools-view';
import LibraryView from './views/library-view';

const PARAGRAPH = 'p';
const BOLD = 'b';
const ITALIC = 'i';
const UNDERLINE = 'u';
const STRIKETHROUGH = 's';
const HEADER1 = 'h1';
const HEADER2 = 'h2';
const HEADER3 = 'h3';
const HEADER4 = 'h4';
const HEADER5 = 'h5';
const HEADER6 = 'h6';
const HORIZONTAL_RULE = 'hr';
const BLOCKQUOTE = 'blockquote';
const IMAGE = 'image';
const CODE = 'code';
const MATH = 'math';

export const headers = [HEADER1, HEADER2, HEADER3, HEADER4, HEADER5, HEADER6];

/*
class App {
  constructor() {
    window.addEventListener('load', this.onLoad);
  }

  onLoad() {
    
  }
}

const app = new App();
*/

async function saveNoteFile(noteFile) {
  if (noteFile.path == null) {
    const path = await bridge.saveFileDialog();

    if (path == null) {
      throw new Error('Canceled');
    }

    noteFile.path = path;
  }

  await bridge.saveFile(noteFile.path, noteFile.note.toXML());
}

function openNoteFile(noteFile) {
  currentNoteFile = noteFile;
  currentNote = noteFile.note;
  libraryView.setSelectedPath(currentNoteFile.path);
  renderFiles();
  renderNote(noteFile.note);
}

function renderNote(note) {
  utils.removeChildNodes($noteContainer);
  $noteContainer.append(note.noteView.$note);
  note.noteView.render(note);
}

function renderFiles() {
  libraryView.renderFiles(library.files);
}

let $noteContainer;
let currentNote;
let currentNoteFile;
let caretPos = 0;
let library;
let isComposing = false;

let toolsView = new ToolsView();
let libraryView = new LibraryView();

export function insertMath() {
  const math = createMath();
  currentNote.append(caretPos + 1, math);
}

export function insertHeader(level) {
  const header = createHeader(level);
  currentNote.append(caretPos + 1, header);
}

export function insertHorizontalRule() {
  const horizontal = createHorizontalRule();
  currentNote.append(caretPos + 1, horizontal);
}

export function insertBlockquote() {
  const blockquote = createBlockquote();
  currentNote.append(caretPos + 1, blockquote);
}

export function insertCode() {
  const code = createCode();
  currentNote.append(caretPos + 1, code);
}

export async function saveCurrentNoteFile() {
  await saveNoteFile(currentNoteFile);
}

export async function selectAndOpenNoteBook() {
  const file = await bridge.openFile();
  const xml = await bridge.readFile(file);
  const note = Note.fromXML(xml);
  const noteFile = new NoteFile(file, note);
  openNoteFile(noteFile);
}

export async function selectLibraryItem(filename) {
  const noteFile = await library.open(filename);
  openNoteFile(noteFile);
}

export async function newNote() {
  let name = `untitled_${utils.dateToString(new Date())}`;

  if (await library.doesExist(name)) {
    let i = 2;

    while (await library.doesExist(`${name}_${i}`)) {
      i++;
    }

    name = `${name}_${i}`;
  }

  currentNote = new Note(NoteHead.create(name));
  currentNoteFile = new NoteFile(`${library.basePath}/${name}`, currentNote);
  await saveNoteFile(currentNoteFile);
  await library.refresh();
  libraryView.setSelectedPath(currentNoteFile.path);
  renderFiles();
}

window.addEventListener('load', async () => {
  $noteContainer = document.getElementById('note-container');

  toolsView.initialize();
  libraryView.initialize();

  const userDataPath = await bridge.getPath('userData');
  const libraryPath = `${userDataPath}/library`;
  library = new Library(libraryPath);
  await library.initialize();
  renderFiles();

  const emptyNote = new Note(NoteHead.create('Untitled'));
  const emptyNoteFile = new NoteFile(null, emptyNote);
  openNoteFile(emptyNoteFile);
});

function focus(index) {
  currentNote.content[index]?.element.focus();
}

window.addEventListener('compositionstart', e => {
  isComposing = true;
});

window.addEventListener('compositionend', e => {
  isComposing = false;
});

export function createParagraph(content = '', created, modified) {
  const $paragraph = document.createElement('p');
  $paragraph.style = 'overflow-wrap: anywhere; width: 100%;';
  $paragraph.contentEditable = true;
  $paragraph.textContent = content;

  if (created == null) {
    created = Date.now();
  }

  if (modified == null) {
    modified = created;
  }

  const paragraph = {
    type: PARAGRAPH,
    content,
    element: $paragraph,
    created,
    modified
  };

  $paragraph.addEventListener('keydown', e => {
    const index = currentNote.content.indexOf(paragraph);
    caretPos = index;

    const selection = window.getSelection();
    const selectionRange = utils.getCursorRange($paragraph);

    if (e.key == 'Enter' && !isComposing) {
      const nextParagraph = createParagraph();
      currentNote.append(index + 1, nextParagraph);
      focus(index + 1);
      e.preventDefault();
    }

    if (e.key == 'Backspace' && selection.isCollapsed && selectionRange.start == 0) {
      currentNote.remove(index);
      focus(index - 1);
      e.preventDefault();
    }

    if (e.key == 'ArrowUp' && selection.isCollapsed && selectionRange.start == 0) {
      focus(index - 1);
    }

    if (e.key == 'ArrowDown' && selection.isCollapsed && selectionRange.start == $paragraph.textContent.length) {
      focus(index + 1);
    }
  });

  $paragraph.addEventListener('input', e => {
    paragraph.content = $paragraph.textContent;
    paragraph.modified = Date.now();
  });

  $paragraph.addEventListener('focus', e => {
    const index = currentNote.content.indexOf(paragraph);
    caretPos = index;
  });

  $paragraph.addEventListener('paste', e => {
    const paste = (e.clipboardData || window.clipboardData).getData('text');
    const selection = window.getSelection();

    if (selection.rangeCount > 0) {
      selection.deleteFromDocument();
      selection.getRangeAt(0).insertNode(document.createTextNode(paste));
      selection.collapseToEnd();
      $paragraph.normalize();
      paragraph.content = $paragraph.textContent;
    }

    e.preventDefault();
  });

  return paragraph;
}

export function createMath(content = '', created, modified) {
  const $container = document.createElement('div');
  $container.className = 'math';
  const $editor = document.createElement('pre');
  $editor.style = 'overflow-wrap: anywhere; width: 100%;';
  $editor.contentEditable = true;

  $editor.textContent = content;
  Katex.render(content, $container, { displayMode: true });

  if (created == null) {
    created = Date.now();
  }

  if (modified == null) {
    modified = created;
  }

  const math = {
    type: MATH,
    content,
    element: $container,
    created,
    modified
  };

  window.addEventListener('click', e => {
    if ($container.contains(e.target) && ($container.firstChild == null || $container.firstChild != $editor)) {
      if ($container.firstChild != null) {
        $container.removeChild($container.firstChild);
      }

      $container.append($editor);
      $editor.focus();
    } else if (!$container.contains(e.target) && ($container.firstChild == null || !$container.firstChild.classList.contains('katex-display'))) {
      if ($container.firstChild != null) {
        $container.removeChild($container.firstChild);
      }

      Katex.render(math.content, $container, { displayMode: true });
    }
  });

  $editor.addEventListener('input', e => {
    math.content = $editor.textContent;
    math.modified = Date.now();
  });

  $editor.addEventListener('focus', e => {
    const index = currentNote.content.indexOf(math);
    caretPos = index;
  });

  return math;
}

export function createHeader(level, content = '', created, modified) {
  const type = headers[level - 1];
  const $header = document.createElement(type);
  $header.textContent = content;
  $header.style = 'overflow-wrap: anywhere; width: 100%;';
  $header.contentEditable = true;

  if (created == null) {
    created = Date.now();
  }

  if (modified == null) {
    modified = created;
  }

  const header = {
    type,
    content,
    element: $header,
    created,
    modified
  };

  $header.addEventListener('input', e => {
    header.content = $header.textContent;
    header.modified = Date.now();
  });

  $header.addEventListener('focus', e => {
    const index = currentNote.content.indexOf(header);
    caretPos = index;
  });

  return header;
}

export function createHorizontalRule(created, modified) {
  const $hr = document.createElement('hr');

  if (created == null) {
    created = Date.now();
  }

  if (modified == null) {
    modified = created;
  }

  const horizontal = {
    type: HORIZONTAL_RULE,
    element: $hr,
    created,
    modified
  };

  return horizontal;
}

export function createBlockquote(content = '', created, modified) {
  const $blockquote = document.createElement('blockquote');
  $blockquote.textContent = content;
  $blockquote.style = 'overflow-wrap: anywhere; width: 100%;';
  $blockquote.contentEditable = true;

  if (created == null) {
    created = Date.now();
  }

  if (modified == null) {
    modified = created;
  }

  const blockquote = {
    type: BLOCKQUOTE,
    content,
    element: $blockquote,
    created,
    modified
  };

  $blockquote.addEventListener('input', e => {
    blockquote.content = $blockquote.textContent;
    blockquote.modified = Date.now();
  });

  $blockquote.addEventListener('focus', e => {
    const index = currentNote.content.indexOf(blockquote);
    caretPos = index;
  });

  return blockquote;
}

export function createCode(content = '', language = 'javascript', created, modified) {
  const $pre = document.createElement('pre');
  const $code = document.createElement('code');
  $pre.append($code);
  $code.textContent = content;
  $code.contentEditable = true;

  if (language != null) {
    $code.classList.add(`language-${language}`);
    $pre.classList.add(`language-${language}`);
  }

  Prism.highlightElement($code, false);

  if (created == null) {
    created = Date.now();
  }

  if (modified == null) {
    modified = created;
  }

  const code = {
    type: CODE,
    content,
    element: $pre,
    created,
    modified,
    language
  };

  $code.addEventListener('input', e => {
    code.content = $code.textContent;
    code.modified = Date.now();

    if (!isComposing) {
      // Work around for the problem that the cursor goes to the beginning after highlighting
      const range = utils.getCursorRange($code);
      Prism.highlightElement($code, false);
      utils.setCursorRange($code, range);
    }
  });

  $code.addEventListener('focus', e => {
    const index = currentNote.content.indexOf(code);
    caretPos = index;
  });

  return code;
}