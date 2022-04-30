import { createBlockquote, createCode, createHeader, createHorizontalRule, createListItem, createMath, createOrderedList, createParagraph, createUnorderedList } from "./main";
import Note from "./note";
import NoteBody from "./note-body";
import NoteHead from "./note-head";
import * as symbols from './symbols';

export function toSKML(note) {
  const serializer = new XMLSerializer();
  const skml = document.implementation.createDocument(null, 'skml');
  const $root = skml.firstChild;
  const $head = skml.createElement('head');
  $root.append($head);

  for (const [key, value] of Object.entries(note.head.properties)) {
    const meta = skml.createElement(key);
    meta.append(value);
    $head.append(meta);
  }

  const $body = skml.createElement('body');
  $root.append($body);

  for (const e of note.body.children) {
    $body.appendChild(toDOM(skml, e));
  }

  return serializer.serializeToString(skml);
}

function toDOM(xml, e) {
  const tagName = e.type;
  const element = xml.createElement(tagName);
  element.setAttribute('created', e.created);
  element.setAttribute('modified', e.modified);

  if (e.language != null) {
    element.setAttribute('language', e.language);
  }

  if (tagName == 'ul' || tagName == 'ol') {
    for (const i of e.content) {
      const item = xml.createElement('li');
      item.textContent = i.content;
      item.setAttribute('created', i.created);
      item.setAttribute('modified', i.modified);
      element.append(item);
    }
  } else {
    element.append(e.content);
  }

  return element;
}

export function fromSKML(text) {
  const parser = new DOMParser();
  const xml = parser.parseFromString(text, 'text/xml');
  const $root = xml.firstChild;
  const $head = $root.querySelector('head');
  const properties = {};

  for (const n of $head.childNodes) {
    const tagName = n.tagName;
    let content = n.textContent;

    if (tagName == 'created' || tagName == 'modified') {
      content = parseInt(content);
    }

    properties[tagName] = content;
  }

  const head = new NoteHead(properties);
  const $body = $root.querySelector('body');
  const body = [];

  for (const n of $body.childNodes) {
    const tagName = n.tagName;
    const content = n.textContent;
    const created = parseInt(n.getAttribute('created'));
    const modified = parseInt(n.getAttribute('modified'));

    if (tagName == 'p') {
      body.push(createParagraph(content, created, modified));
    } else if (tagName == 'math') {
      body.push(createMath(content, created, modified));
    } else if (symbols.headers.includes(tagName)) {
      body.push(createHeader(parseInt(tagName[1]), content, created, modified));
    } else if (tagName == 'hr') {
      body.push(createHorizontalRule(created, modified));
    } else if (tagName == 'blockquote') {
      body.push(createBlockquote(content, created, modified));
    } else if (tagName == 'code') {
      const language = n.getAttribute('language');
      body.push(createCode(content, language, created, modified));
    } else if (tagName == 'ol') {
      const items = [];

      for (const childN of n.childNodes) {
        const created = parseInt(childN.getAttribute('created'));
        const modified = parseInt(childN.getAttribute('modified'));
        items.push(createListItem(childN.textContent, created, modified));
      }

      body.push(createOrderedList(items, created, modified));
    } else if (tagName == 'ul') {
      const items = [];

      for (const childN of n.childNodes) {
        const created = parseInt(childN.getAttribute('created'));
        const modified = parseInt(childN.getAttribute('modified'));
        items.push(createListItem(childN.textContent, created, modified));
      }

      body.push(createUnorderedList(items, created, modified));
    }
  }

  return new Note(head, new NoteBody(body));
}