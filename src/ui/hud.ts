export type HudHandlers = {
  onToggleAscii(): void;
  onToggleMode(): void;
  onToggleFlat(): void;
};

export type Hud = {
  setAscii(on: boolean): void;
  setMode(m: 0 | 1): void;
  setFlat(open: boolean): void;
  hideSceneControls(): void;
};

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  return tag === 'input' || tag === 'textarea' || target.isContentEditable;
}

export function createHud(root: HTMLElement, name: string, handlers: HudHandlers): Hud {
  const nameEl = document.createElement('h1');
  nameEl.className = 'name';
  nameEl.textContent = name;

  const asciiBtn = document.createElement('button');
  asciiBtn.dataset.act = 'ascii';
  asciiBtn.textContent = 'ASCII';

  const modeBtn = document.createElement('button');
  modeBtn.dataset.act = 'mode';
  modeBtn.textContent = '乗り換え';

  const flatBtn = document.createElement('button');
  flatBtn.dataset.act = 'flat';
  flatBtn.textContent = '普通に見る';

  asciiBtn.addEventListener('click', () => handlers.onToggleAscii());
  modeBtn.addEventListener('click', () => handlers.onToggleMode());
  flatBtn.addEventListener('click', () => handlers.onToggleFlat());

  const buttons = document.createElement('div');
  buttons.className = 'buttons';
  buttons.append(asciiBtn, modeBtn, flatBtn);

  root.append(nameEl, buttons);

  addEventListener('keydown', (e) => {
    if (e.repeat) return;
    if (isTypingTarget(e.target)) return;
    const key = e.key.toLowerCase();
    if (key === 't') handlers.onToggleAscii();
    else if (key === 'p') handlers.onToggleMode();
  });

  const hud: Hud = {
    setAscii(on) {
      asciiBtn.setAttribute('aria-pressed', String(on));
    },
    setMode(m) {
      modeBtn.setAttribute('aria-pressed', String(m === 1));
    },
    setFlat(open) {
      flatBtn.setAttribute('aria-pressed', String(open));
      flatBtn.textContent = open ? '戻る' : '普通に見る';
    },
    hideSceneControls() {
      asciiBtn.hidden = true;
      modeBtn.hidden = true;
    },
  };
  return hud;
}
