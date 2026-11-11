import { PROFILE } from '../content/profile';
import { WORKS } from '../content/works';
import { SKILLS } from '../content/skills';

export type Flat = {
  open(): void;
  close(): void;
  isOpen(): boolean;
};

function h2(text: string): HTMLHeadingElement {
  const el = document.createElement('h2');
  el.textContent = text;
  return el;
}

function h3(text: string): HTMLHeadingElement {
  const el = document.createElement('h3');
  el.textContent = text;
  return el;
}

function p(text: string): HTMLParagraphElement {
  const el = document.createElement('p');
  el.textContent = text;
  return el;
}

function buildAbout(): HTMLElement {
  const section = document.createElement('section');
  section.appendChild(h2('ABOUT'));
  for (const line of PROFILE.about) section.appendChild(p(line));
  return section;
}

function buildWorks(): HTMLElement {
  const section = document.createElement('section');
  section.appendChild(h2('WORKS'));
  for (const work of WORKS) {
    section.appendChild(h3(work.title));
    section.appendChild(p(work.summary));
    if (work.tags?.length) {
      const ul = document.createElement('ul');
      ul.className = 'tags';
      for (const tag of work.tags) {
        const li = document.createElement('li');
        li.textContent = tag;
        ul.appendChild(li);
      }
      section.appendChild(ul);
    }
    if (work.url) {
      const a = document.createElement('a');
      a.href = work.url;
      a.textContent = work.url;
      a.target = '_blank';
      a.rel = 'noopener';
      section.appendChild(a);
    }
  }
  return section;
}

function buildSkills(): HTMLElement {
  const section = document.createElement('section');
  section.appendChild(h2('SKILLS'));
  for (const { group, items } of SKILLS) {
    section.appendChild(h3(group));
    const ul = document.createElement('ul');
    ul.className = 'tags';
    for (const item of items) {
      const li = document.createElement('li');
      li.textContent = item;
      ul.appendChild(li);
    }
    section.appendChild(ul);
  }
  return section;
}

function buildContact(): HTMLElement {
  const section = document.createElement('section');
  section.appendChild(h2('CONTACT'));
  const ul = document.createElement('ul');
  for (const { label, url } of PROFILE.contact) {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = url;
    a.textContent = label;
    a.target = '_blank';
    a.rel = 'noopener';
    li.appendChild(a);
    ul.appendChild(li);
  }
  section.appendChild(ul);
  return section;
}

export function createFlat(el: HTMLElement): Flat {
  el.append(buildAbout(), buildWorks(), buildSkills(), buildContact());

  let open_ = !el.hidden;

  return {
    open() {
      el.hidden = false;
      document.body.classList.add('flat-open');
      open_ = true;
    },
    close() {
      el.hidden = true;
      document.body.classList.remove('flat-open');
      open_ = false;
    },
    isOpen() {
      return open_;
    },
  };
}
