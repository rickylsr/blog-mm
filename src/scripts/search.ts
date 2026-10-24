type Post = {
  title: string;
  path: string;
  text: string;
  tags: string[];
  date: string;
};
let indexPromise: Promise<Post[]> | undefined;
function loadIndex() {
  return (indexPromise ??= fetch('/search-index.json')
    .then((response) => {
      if (!response.ok) throw new Error('Search unavailable');
      return response.json() as Promise<Post[]>;
    })
    .catch((error) => {
      indexPromise = undefined;
      throw error;
    }));
}

const dialog = document.querySelector<HTMLDialogElement>('#search-dialog')!;
const trigger =
  document.querySelector<HTMLButtonElement>('[data-search-open]')!;
let returnFocus: HTMLElement | null = null;
function openSearch() {
  if (dialog.open) return;
  returnFocus = document.activeElement as HTMLElement;
  dialog.showModal();
  document.documentElement.classList.add('search-open');
  trigger.setAttribute('aria-expanded', 'true');
  // Explicitly opening search is a request to type, including on touch devices.
  dialog.querySelector<HTMLInputElement>('input')!.focus();
  dialog.querySelector<HTMLInputElement>('input')!.select();
}
trigger.setAttribute('aria-expanded', 'false');
trigger.addEventListener('click', openSearch);
dialog
  .querySelector('[data-search-close]')!
  .addEventListener('click', () => dialog.close());
let backdropPress = false;
dialog.addEventListener('pointerdown', (event) => {
  backdropPress = event.target === dialog;
});
dialog.addEventListener('click', (event) => {
  if (event.target === dialog && backdropPress) dialog.close();
});
dialog.addEventListener('keydown', (event) => {
  if (event.key !== 'Tab') return;
  const controls = [
    ...dialog.querySelectorAll<HTMLElement>(
      'a[href], button:not(:disabled):not([hidden]), input:not(:disabled)',
    ),
  ];
  const first = controls[0];
  const last = controls.at(-1)!;
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
});
dialog.addEventListener('close', () => {
  document.documentElement.classList.remove('search-open');
  trigger.setAttribute('aria-expanded', 'false');
  const url = new URL(location.href);
  url.searchParams.delete('search');
  history.replaceState(history.state, '', url);
  if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
});
document.addEventListener('keydown', (event) => {
  if (
    (event.ctrlKey || event.metaKey) &&
    !event.altKey &&
    !event.shiftKey &&
    event.key.toLowerCase() === 'k' &&
    !event.isComposing
  ) {
    event.preventDefault();
    if (!event.repeat) openSearch();
  }
});
const shortcut = document.querySelector('[data-search-shortcut]')!;
shortcut.textContent = /Mac|iPhone|iPad/.test(navigator.platform)
  ? '⌘ K'
  : 'Ctrl K';

for (const panel of document.querySelectorAll<HTMLElement>(
  '[data-search-panel]',
)) {
  const input = panel.querySelector<HTMLInputElement>('[data-search-input]')!;
  const status = panel.querySelector<HTMLElement>('[data-search-status]')!;
  const results = panel.querySelector<HTMLElement>('[data-search-results]')!;
  const retry = panel.querySelector<HTMLButtonElement>('[data-search-retry]')!;
  const inDialog = dialog.contains(panel);
  let timer: ReturnType<typeof setTimeout>;
  let generation = 0;
  let composing = false;
  async function search() {
    if (inDialog && !dialog.open) return;
    const current = ++generation;
    const query = input.value.trim().toLocaleLowerCase();
    const url = new URL(location.href);
    const parameter = inDialog ? 'search' : 'q';
    if (query) url.searchParams.set(parameter, input.value.trim());
    else url.searchParams.delete(parameter);
    history.replaceState(history.state, '', url);
    results.replaceChildren();
    retry.hidden = true;
    if (!query) {
      status.textContent = '搜标题、标签，或文章里的某句话。';
      return;
    }
    status.textContent = '正在查找…';
    try {
      const index = await loadIndex();
      if (current !== generation) return;
      const terms = query.split(/\s+/);
      const matches = index.filter((post) =>
        terms.every((term) =>
          `${post.title} ${post.tags.join(' ')} ${post.text}`
            .toLocaleLowerCase()
            .includes(term),
        ),
      );
      status.textContent = matches.length
        ? `找到 ${matches.length} 篇记录`
        : '还没找到匹配的文章，换一个词试试。';
      const fragment = document.createDocumentFragment();
      const dateFormat = new Intl.DateTimeFormat('zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'UTC',
      });
      for (const post of matches) {
        const item = document.createElement('li');
        const link = document.createElement('a');
        link.href = post.path;
        const title = document.createElement('span');
        title.textContent = post.title;
        const date = document.createElement('time');
        date.dateTime = post.date;
        date.textContent = dateFormat.format(
          new Date(`${post.date}T00:00:00Z`),
        );
        link.append(date, title);
        item.append(link);
        fragment.append(item);
      }
      results.append(fragment);
    } catch {
      if (current !== generation) return;
      status.textContent = '搜索暂时不可用，请重新加载，或从归档浏览文章。';
      retry.hidden = false;
    }
  }
  function schedule() {
    generation++;
    results.replaceChildren();
    clearTimeout(timer);
    if (!composing) timer = setTimeout(search, 180);
  }
  input.addEventListener('compositionstart', () => {
    composing = true;
    generation++;
    clearTimeout(timer);
    results.replaceChildren();
  });
  input.addEventListener('compositionend', () => {
    composing = false;
    schedule();
  });
  input.addEventListener('input', schedule);
  if (inDialog) {
    dialog.addEventListener('close', () => {
      clearTimeout(timer);
    });
  }
  panel.querySelector('form')!.addEventListener('submit', (event) => {
    event.preventDefault();
    if (composing) return;
    clearTimeout(timer);
    void search();
  });
  retry.addEventListener('click', () => {
    void search();
  });
  panel.addEventListener('keydown', (event) => {
    if (
      event.isComposing ||
      composing ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey
    )
      return;
    const links = [...results.querySelectorAll<HTMLAnchorElement>('a')];
    if (!links.length) return;
    const active = document.activeElement;
    const position = links.indexOf(active as HTMLAnchorElement);
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      if (active !== input && position < 0) return;
      event.preventDefault();
      const next =
        event.key === 'ArrowDown'
          ? position + 1
          : position < 0
            ? links.length - 1
            : position - 1;
      if (next < 0 || next >= links.length) input.focus();
      else links[next].focus();
    } else if (event.key === 'Enter' && active === input) {
      event.preventDefault();
      links[0].click();
    }
  });
  const initial = new URLSearchParams(location.search).get(
    inDialog ? 'search' : 'q',
  );
  if (initial) {
    input.value = initial;
    if (inDialog) openSearch();
    void search();
  }
}
