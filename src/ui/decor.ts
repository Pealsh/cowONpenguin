import type { BiomeId } from '../content/sections';
import { DECOR, decorRows, type Decor } from '../content/decor';

const CHAR_SIZE_CSS = 'font-size: 11px; line-height: 1.1; font-family: ui-monospace, "SF Mono", Menlo, monospace;';

function measureCharWidth(box: HTMLElement): number {
  const span = document.createElement('span');
  span.style.cssText = `${CHAR_SIZE_CSS} position: absolute; visibility: hidden; white-space: pre;`;
  span.textContent = '0';
  box.appendChild(span);
  const width = span.getBoundingClientRect().width || 1;
  span.remove();
  return width;
}

function buildPre(className: string, color: string): HTMLPreElement {
  const pre = document.createElement('pre');
  pre.className = className;
  pre.setAttribute('aria-hidden', 'true');
  pre.style.cssText = `${CHAR_SIZE_CSS} margin: 0; position: absolute; pointer-events: none; color: ${color};`;
  return pre;
}

function render(pre: HTMLPreElement, decor: Decor, cols: number): void {
  pre.textContent = decorRows(decor, cols).join('\n');
}

export function attachDecor(box: HTMLElement, biome: BiomeId): void {
  const decor = DECOR[biome];
  box.style.position = 'relative';
  box.style.setProperty('--decor-rows', String(decor.rows.length));

  const pre = buildPre(`decor decor-${decor.edge}`, decor.color);
  if (decor.edge === 'top') {
    pre.style.top = '0';
    pre.style.left = '0';
    box.style.paddingTop = 'calc(var(--decor-rows) * 1.1em + 12px)';
  } else {
    pre.style.bottom = '0';
    pre.style.left = '0';
    box.style.paddingBottom = 'calc(var(--decor-rows) * 1.1em + 12px)';
  }
  box.appendChild(pre);

  if (decor.corner) {
    const cornerPre = buildPre('decor decor-corner', decor.corner.color);
    cornerPre.style.top = '0';
    cornerPre.style.right = '0';
    box.appendChild(cornerPre);
    const cornerCols = decor.corner.rows[0]?.length ?? 0;
    cornerPre.textContent = decor.corner.rows.map((row) => row.slice(0, cornerCols)).join('\n');
  }

  const update = (): void => {
    const charWidth = measureCharWidth(box);
    const cols = Math.max(0, Math.floor(box.clientWidth / charWidth));
    render(pre, decor, cols);
  };

  update();

  if (typeof ResizeObserver !== 'undefined') {
    const ro = new ResizeObserver(() => update());
    ro.observe(box);
  } else {
    addEventListener('resize', update);
  }
}
