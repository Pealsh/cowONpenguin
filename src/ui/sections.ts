import type { SectionDef } from '../content/sections';
import { PROFILE } from '../content/profile';
import { SKILLS } from '../content/skills';
import { attachDecor } from './decor';

function copyBlock(...children: HTMLElement[]): HTMLDivElement {
  const div = document.createElement('div');
  div.className = 'copy';
  div.append(...children);
  return div;
}

function h1(text: string): HTMLHeadingElement {
  const el = document.createElement('h1');
  el.textContent = text;
  return el;
}

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

function p(text: string, className?: string): HTMLParagraphElement {
  const el = document.createElement('p');
  el.textContent = text;
  if (className) el.className = className;
  return el;
}

function buildIntro(): HTMLElement {
  return copyBlock(h1(PROFILE.name), p(PROFILE.tagline), p('↓ スクロール', 'hint'));
}

function buildAbout(): HTMLElement {
  const paras = PROFILE.about.map((line) => p(line));
  return copyBlock(h2('ABOUT'), ...paras);
}

function buildWorks(): { el: HTMLElement; worksContainer: HTMLElement } {
  const worksContainer = document.createElement('div');
  worksContainer.className = 'works';
  const el = copyBlock(h2('WORKS'), worksContainer);
  return { el, worksContainer };
}

function buildSkills(): HTMLElement {
  const children: HTMLElement[] = [h2('SKILLS')];
  for (const { group, items } of SKILLS) {
    children.push(h3(group));
    const ul = document.createElement('ul');
    ul.className = 'tags';
    for (const item of items) {
      const li = document.createElement('li');
      li.textContent = item;
      ul.appendChild(li);
    }
    children.push(ul);
  }
  return copyBlock(...children);
}

function buildContact(): HTMLElement {
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
  return copyBlock(h2('CONTACT'), ul);
}

export function renderSections(
  main: HTMLElement,
  sections: readonly SectionDef[],
): { worksContainer: HTMLElement } {
  let worksContainer: HTMLElement | undefined;
  for (const def of sections) {
    const section = document.createElement('section');
    section.id = def.id;
    section.dataset.biome = def.biome;
    section.style.setProperty('--h', `${def.heightVh}vh`);

    switch (def.id) {
      case 'intro':
        section.appendChild(buildIntro());
        break;
      case 'about':
        section.appendChild(buildAbout());
        break;
      case 'works': {
        const built = buildWorks();
        section.appendChild(built.el);
        worksContainer = built.worksContainer;
        break;
      }
      case 'skills':
        section.appendChild(buildSkills());
        break;
      case 'contact':
        section.appendChild(buildContact());
        break;
    }
    main.appendChild(section);
    // decor は clientWidth を測るので、section がドキュメントに繋がった後に付ける
    const copyEl = section.querySelector('.copy');
    if (copyEl instanceof HTMLElement) attachDecor(copyEl, def.biome);
  }
  if (!worksContainer) throw new Error('sections: works section missing');
  return { worksContainer };
}
