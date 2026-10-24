const browser = document.querySelector<HTMLElement>('[data-archive-browser]')!;
const pageSize = Number(browser.dataset.pageSize);
const yearFilter =
  browser.querySelector<HTMLSelectElement>('[data-year-filter]')!;
const orderFilter = browser.querySelector<HTMLSelectElement>(
  '[data-order-filter]',
)!;
const groups = [
  ...browser.querySelectorAll<HTMLElement>('[data-archive-year]'),
];
const entries = [
  ...browser.querySelectorAll<HTMLElement>('[data-archive-entry]'),
];
const results = browser.querySelector<HTMLElement>('[data-archive-results]')!;
const status = browser.querySelector<HTMLElement>('[data-archive-status]')!;
const pagination = browser.querySelector<HTMLElement>(
  '[data-archive-pagination]',
)!;
const previous = browser.querySelector<HTMLAnchorElement>(
  '[data-previous-page]',
)!;
const next = browser.querySelector<HTMLAnchorElement>('[data-next-page]')!;
const pageStatus = browser.querySelector<HTMLElement>('[data-page-status]')!;
let year = '';
let order = 'desc';
let page = 1;
let pageCount = 1;
let shown: HTMLElement[] = [];

function stateURL(targetPage = page) {
  const url = new URL(location.href);
  if (year) url.searchParams.set('year', year);
  else url.searchParams.delete('year');
  if (order === 'asc') url.searchParams.set('order', order);
  else url.searchParams.delete('order');
  if (targetPage > 1) url.searchParams.set('page', String(targetPage));
  else url.searchParams.delete('page');
  return url;
}

function updateLink(link: HTMLAnchorElement, enabled: boolean, target: number) {
  link.setAttribute('aria-disabled', String(!enabled));
  if (enabled) {
    link.href = stateURL(target).href;
    link.removeAttribute('tabindex');
  } else {
    link.removeAttribute('href');
    link.tabIndex = -1;
  }
}

function render() {
  const matching = entries.filter(
    (entry) => !year || entry.dataset.date!.startsWith(year),
  );
  if (order === 'asc') matching.reverse();
  pageCount = Math.max(1, Math.ceil(matching.length / pageSize));
  page = Math.min(page, pageCount);
  shown = matching.slice((page - 1) * pageSize, page * pageSize);
  const visible = new Set(shown);
  for (const entry of entries) entry.hidden = !visible.has(entry);
  const orderedGroups = order === 'asc' ? [...groups].reverse() : groups;
  for (const group of orderedGroups) {
    const groupEntries = shown.filter((entry) =>
      entry.dataset.date!.startsWith(group.dataset.archiveYear!),
    );
    group.hidden = groupEntries.length === 0;
    const list = group.querySelector('ul')!;
    for (const entry of groupEntries) list.append(entry);
    group.querySelector('[data-year-count]')!.textContent =
      `本页 ${groupEntries.length} 篇`;
    results.append(group);
  }
  yearFilter.value = year;
  orderFilter.value = order;
  status.textContent = `${year ? `${year} 年 · ` : ''}共 ${matching.length} 篇文章，${order === 'asc' ? '从旧到新' : '从新到旧'}，每页 ${pageSize} 篇。`;
  pageStatus.textContent = `第 ${page} / ${pageCount} 页`;
  pagination.hidden = pageCount <= 1;
  updateLink(previous, page > 1, page - 1);
  updateLink(next, page < pageCount, page + 1);
}

function save(replace = false) {
  const url = stateURL();
  if (url.href !== location.href)
    history[replace ? 'replaceState' : 'pushState'](history.state, '', url);
}

function restore() {
  const params = new URLSearchParams(location.search);
  const requestedYear = params.get('year') || '';
  year = groups.some((group) => group.dataset.archiveYear === requestedYear)
    ? requestedYear
    : '';
  order = params.get('order') === 'asc' ? 'asc' : 'desc';
  const requestedPage = params.get('page') || '1';
  page = /^[1-9]\d{0,5}$/.test(requestedPage) ? Number(requestedPage) : 1;
  render();
  save(true);
}

for (const filter of [yearFilter, orderFilter]) {
  filter.disabled = false;
  filter.addEventListener('change', () => {
    year = yearFilter.value;
    order = orderFilter.value;
    page = 1;
    render();
    save();
  });
}
for (const [link, step] of [
  [previous, -1],
  [next, 1],
] as const) {
  link.addEventListener('click', (event) => {
    if (!link.hasAttribute('href')) {
      event.preventDefault();
      return;
    }
    if (
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey ||
      event.altKey ||
      event.button !== 0
    )
      return;
    event.preventDefault();
    page += step;
    render();
    save();
    shown[0]?.querySelector<HTMLAnchorElement>('a')?.focus();
  });
}
window.addEventListener('popstate', restore);
restore();
