for (const root of document.querySelectorAll<HTMLElement>(
  '[data-card-select]',
)) {
  const value = root.querySelector<HTMLInputElement>('[data-select-value]')!;
  const trigger = root.querySelector<HTMLButtonElement>(
    '[data-select-trigger]',
  )!;
  const label = root.querySelector<HTMLElement>('[data-select-label]')!;
  const panel = root.querySelector<HTMLElement>('[data-select-options]')!;
  const options = [
    ...panel.querySelectorAll<HTMLButtonElement>('[role="option"]'),
  ];
  function sync() {
    const selected =
      options.find((option) => option.dataset.value === value.value) ||
      options[0];
    label.textContent = selected.querySelector('span')!.textContent;
    for (const option of options) {
      option.setAttribute('aria-selected', String(option === selected));
      option.tabIndex = option === selected ? 0 : -1;
    }
  }
  function close(restoreFocus = false) {
    panel.hidden = true;
    trigger.setAttribute('aria-expanded', 'false');
    if (restoreFocus) trigger.focus({ preventScroll: true });
  }
  function open() {
    panel.hidden = false;
    trigger.setAttribute('aria-expanded', 'true');
    (
      options.find((option) => option.dataset.value === value.value) ||
      options[0]
    ).focus();
  }
  trigger.disabled = false;
  trigger.addEventListener('click', () => (panel.hidden ? open() : close()));
  trigger.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      open();
    }
  });
  for (const option of options) {
    option.addEventListener('click', () => {
      value.value = option.dataset.value!;
      sync();
      value.dispatchEvent(new Event('change', { bubbles: true }));
      close(true);
    });
  }
  panel.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      close(true);
      return;
    }
    if (event.key === 'Tab') {
      close(true);
      return;
    }
    const index = options.indexOf(document.activeElement as HTMLButtonElement);
    const steps: Record<string, number> = {
      ArrowDown: 1,
      ArrowUp: -1,
      ArrowRight: 1,
      ArrowLeft: -1,
    };
    if (!(event.key in steps) && event.key !== 'Home' && event.key !== 'End')
      return;
    event.preventDefault();
    const next =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? options.length - 1
          : (index + steps[event.key] + options.length) % options.length;
    for (const [position, option] of options.entries())
      option.tabIndex = position === next ? 0 : -1;
    options[next].focus();
  });
  root.addEventListener('focusout', (event) => {
    if (!root.contains(event.relatedTarget as Node | null)) close();
  });
  document.addEventListener('pointerdown', (event) => {
    if (!root.contains(event.target as Node)) close();
  });
  value.addEventListener('selection-sync', sync);
  sync();
}
