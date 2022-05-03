import * as path from 'path-browserify';
import { filetypemime } from 'magic-bytes.js';
import { v4 as uuidv4 } from 'uuid';

import * as utils from './utils';
import Note from './note';
import NoteFile from './note-file';
import Library from './library';
import NoteHead from './note-head';
import ToolsView from './views/tools-view';
import LibraryView from './views/library-view';
import NoteView from './views/note-view';
import * as fileSystem from './file-system';
import * as LibraryItemType from "./library-item-type";
import TabView from './views/tab-view';
import * as archive from './archive';
import * as elements from './elements';
import EmbeddedFile from './embedded-file';
import * as symbols from './symbols';

import './styles.css';
import 'katex/dist/katex.min.css';
import 'prismjs/themes/prism.css';
import { uuidToBase32 } from './id';

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

  // await bridge.writeFile(noteFile.path, skml.toSKML(noteFile.note));
  await bridge.writeBinaryFile(noteFile.path, await archive.toArchive(noteFile.note));
}

function openNoteFile(noteFile) {
  currentNoteFile = noteFile;
  currentNote = noteFile.note;
  libraryView.setSelectedPath(currentNoteFile.path);
  renderFiles();
  renderNote(noteFile.note);

  if (!openedFiles.includes(noteFile)) {
    openedFiles.push(noteFile);
    addTab(currentNoteFile);
  }
}

function renderNote(note) {
  const $noteContainer = document.getElementById('note-container');
  utils.removeChildNodes($noteContainer);
  $noteContainer.append(noteView.$note);
  noteView.render(note);
}

function renderFiles() {
  libraryView.renderFiles(library.items);
}

let openedFiles = [];
let currentNote;
let currentNoteFile;
let library;
let focusIndex;

let toolsView = new ToolsView();
let libraryView = new LibraryView();
let noteView = new NoteView();
let tabView = new TabView();

export function insertBlock(index, element) {
  if (element.type == symbols.IMAGE) {
    noteView.insertImage(element, index, currentNote);
  } else {
    noteView.insertElement(element, index);
  }

  currentNote.insert(index, element);
}

export function insertListItem(indexOfList, index, element) {
  noteView.insertListItem(element, indexOfList, index);
  currentNote.insertListItem(indexOfList, index, element);
}

export function removeBlock(index) {
  noteView.remove(index);
  currentNote.remove(index);
}

export function removeListItem(indexOfList, index) {
  noteView.removeListItem(indexOfList, index);
  currentNote.removeListItem(indexOfList, index);
}

export function setFocusIndex(index) {
  focusIndex = index;
}

export function insertMath() {
  const math = elements.createMath();
  insertBlock(focusIndex + 1, math);
  focus(focusIndex + 1);
}

export function insertHeader(level) {
  const header = elements.createHeader(level);
  insertBlock(focusIndex + 1, header);
  focus(focusIndex + 1);
}

export function insertHorizontalRule() {
  const horizontal = elements.createHorizontalRule();
  insertBlock(focusIndex + 1, horizontal);
  focus(focusIndex + 1);
}

export function insertBlockquote() {
  const blockquote = elements.createBlockquote();
  insertBlock(focusIndex + 1, blockquote);
  focus(focusIndex + 1);
}

export function insertCode() {
  const code = elements.createCode();
  insertBlock(focusIndex + 1, code);
  focus(focusIndex + 1);
}

export function insertOrderedList() {
  const orderedList = elements.createOrderedList();
  insertBlock(focusIndex + 1, orderedList);
  focus(focusIndex + 1);
}

export function insertUnorderedList() {
  const unorderedList = elements.createUnorderedList();
  insertBlock(focusIndex + 1, unorderedList);
  focus(focusIndex + 1);
}

export async function insertImage() {
  const imagePath = await bridge.openFile();
  const data = await bridge.readBinaryFile(imagePath);
  const filename = path.basename(imagePath);
  const mediaType = filetypemime(data)[0];
  const image = elements.createImage(filename);
  const imageFile = new EmbeddedFile(filename, data, mediaType);
  currentNote.addFile(imageFile);
  insertBlock(focusIndex + 1, image);
  focus(focusIndex + 1);
}

export async function saveCurrentNoteFile() {
  await saveNoteFile(currentNoteFile);
}

export async function openNoteBookViaDialog() {
  const path = await bridge.openFile();
  let noteFile = getOpenedNoteBookFromPath(path);

  if (noteFile == null) {
    noteFile = await fileSystem.openNoteFile(path);
  }

  openNoteFile(noteFile);
}

export async function selectLibraryItem(path, type) {
  if (type == LibraryItemType.FILE) {
    let noteFile = getOpenedNoteBookFromPath(path);

    if (noteFile == null) {
      noteFile = await fileSystem.openNoteFile(path);
    }

    openNoteFile(noteFile);
  } else {
    libraryView.setSelectedPath(path);
    renderFiles();
  }
}

function joinExtension(name, ext) {
  return ext == null ? name : `${name}.${ext}`;
}

async function getAvailableFileName(dir, name, ext) {
  if (await fileSystem.doesExist(dir, joinExtension(name, ext))) {
    let i = 2;

    while (await fileSystem.doesExist(dir, joinExtension(`${name}_${i}`, ext))) {
      i++;
    }

    name = `${name}_${i}`;
  }

  return name;
}

export async function newNote() {
  const name = uuidToBase32(uuidv4());

  const filename = name + '.sk';

  const note = new Note(NoteHead.create(name));
  const noteFile = new NoteFile(`${library.basePath}/${filename}`, note);
  await saveNoteFile(noteFile);
  await library.refresh();
  libraryView.setSelectedPath(noteFile.path);
  renderFiles();
  openNoteFile(noteFile);
}

export async function newNoteFromURL(url) {
  const meta = await bridge.fetch(url);

  const name = uuidToBase32(uuidv4());
  const filename = name + '.sk';

  const noteHead = NoteHead.create(meta.title);
  noteHead.setProperty('description', meta.description);
  noteHead.setProperty('imageURL', meta.imageURL);

  const note = new Note(noteHead);
  const noteFile = new NoteFile(`${library.basePath}/${filename}`, note);
  await saveNoteFile(noteFile);
  await library.refresh();
  libraryView.setSelectedPath(noteFile.path);
  renderFiles();
  openNoteFile(noteFile);
}

export async function newCollection() {
  let name = `untitled_collection`;
  name = await getAvailableFileName(library.basePath, name);

  await library.createCollection(name);
  await library.refresh();
  renderFiles();
}

export function addTab(noteFile) {
  tabView.addTab(noteFile.id, noteFile.note.head.properties.title);
}

export function switchTab(noteFileID) {
  const noteFile = getOpenedNoteBookFromID(noteFileID);
  openNoteFile(noteFile);
}

export function getOpenedNoteBookFromID(noteFileID) {
  return openedFiles.find(noteBook => noteBook.id == noteFileID);
}

export function getOpenedNoteBookFromPath(path) {
  return openedFiles.find(noteBook => noteBook.path == path);
}

export function removeOpened(noteFileID) {
  const index = openedFiles.findIndex(noteBook => noteBook.id == noteFileID);

  if (index != -1) {
    openedFiles.splice(index, 1);
  }
}

export function clearNote() {
  noteView.clear();
}

export function closeTab(noteFileID) {
  removeOpened(noteFileID);
  const previous = tabView.getIDOfPrevious(noteFileID);
  tabView.removeTab(noteFileID);

  if (previous == null) {
    clearNote();
  } else {
    const noteFile = getOpenedNoteBookFromID(previous);
    openNoteFile(noteFile);
  }
}

window.addEventListener('load', async () => {
  toolsView.initialize();
  libraryView.initialize();

  const userDataPath = await bridge.getPath('userData');
  const libraryPath = `${userDataPath}/library`;
  library = new Library(libraryPath);
  await library.initialize();
  renderFiles();

  const emptyNote = new Note(NoteHead.create('untitled'));
  const emptyNoteFile = new NoteFile(null, emptyNote);
  openNoteFile(emptyNoteFile);
});

export function focus(index) {
  setFocusIndex(index);
  noteView.focus(index);
}

export function focusListItem(indexOfList, index) {
  setFocusIndex(indexOfList);
  noteView.focusListItem(indexOfList, index);
}

export function changeTitle(newTitle) {
  currentNote.head.properties.title = newTitle;
}