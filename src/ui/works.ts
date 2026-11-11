import type { Work } from '../content/works';

const NOISE_CHARS = ' .:-=+*';

function hashSeed(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (h << 5) - h + id.charCodeAt(i);
    h |= 0;
  }
  return h || 1;
}

function xorshift32(seed: number): () => number {
  let s = seed || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    s |= 0;
    return ((s >>> 0) % 1000) / 1000;
  };
}

function buildPlaceholder(id: string, title: string): HTMLDivElement {
  const ph = document.createElement('div');
  ph.className = 'ph';
  ph.setAttribute('aria-hidden', 'true');

  const rand = xorshift32(hashSeed(id));
  const noise = document.createElement('span');
  noise.className = 'ph-noise';
  let noiseText = '';
  for (let i = 0; i < 48; i++) {
    const idx = Math.floor(rand() * NOISE_CHARS.length);
    noiseText += NOISE_CHARS[idx];
  }
  noise.textContent = noiseText;

  const initial = document.createElement('span');
  initial.className = 'ph-initial';
  initial.textContent = Array.from(title).slice(0, 2).join('');

  ph.append(noise, initial);
  return ph;
}

function buildFigure(work: Work): HTMLElement {
  const figure = document.createElement('figure');
  if (work.image) {
    const img = document.createElement('img');
    img.src = work.image;
    img.loading = 'lazy';
    img.alt = work.title;
    img.onerror = () => {
      const ph = buildPlaceholder(work.id, work.title);
      img.replaceWith(ph);
    };
    figure.appendChild(img);
  } else {
    figure.appendChild(buildPlaceholder(work.id, work.title));
  }
  return figure;
}

function buildCard(work: Work): HTMLElement {
  const article = document.createElement('article');
  article.className = 'card';
  article.id = `work-${work.id}`;

  article.appendChild(buildFigure(work));

  const title = document.createElement('h3');
  title.textContent = work.title;
  article.appendChild(title);

  const summary = document.createElement('p');
  summary.textContent = work.summary;
  article.appendChild(summary);

  const tags = document.createElement('ul');
  tags.className = 'tags';
  for (const tag of work.tags ?? []) {
    const li = document.createElement('li');
    li.textContent = tag;
    tags.appendChild(li);
  }
  article.appendChild(tags);

  if (work.url) {
    const a = document.createElement('a');
    a.href = work.url;
    a.textContent = work.url;
    a.target = '_blank';
    a.rel = 'noopener';
    article.appendChild(a);
  }

  return article;
}

export function renderWorks(container: HTMLElement, works: readonly Work[]): void {
  const cards: HTMLElement[] = [];
  for (const work of works) {
    const card = buildCard(work);
    container.appendChild(card);
    cards.push(card);
  }

  if (typeof IntersectionObserver === 'undefined') {
    for (const card of cards) card.classList.add('visible');
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      }
    },
    { threshold: 0.3 },
  );
  for (const card of cards) observer.observe(card);
}
