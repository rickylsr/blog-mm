const browser = document.querySelector<HTMLElement>('[data-topic-browser]')!;
const pageSize = Number(browser.dataset.pageSize);
const filters = [...browser.querySelectorAll<HTMLButtonElement>('[data-tag]')];
const posts = [...browser.querySelectorAll<HTMLElement>('.post-card')].map(
  (card) => ({
    card,
    tags: JSON.parse(card.dataset.tags!) as string[],
  }),
);
const status = browser.querySelector<HTMLElement>('[data-topic-status]')!;
const more = browser.querySelector<HTMLButtonElement>('[data-load-more]')!;
let activeTag = '';
let page = 1;
let matching = posts;

function render() {
  matching = posts.filter(({ tags }) => !activeTag || tags.includes(activeTag));
  page = Math.min(page, Math.max(1, Math.ceil(matching.length / pageSize)));
  const visible = new Set(matching.slice(0, page * pageSize));
  for (const post of posts) post.card.hidden = !visible.has(post);
  for (const filter of filters) {
    filter.setAttribute(
      'aria-pressed',
      String(filter.dataset.tag === activeTag),
    );
  }
  status.textContent = `${activeTag ? `“${activeTag}” · ` : ''}共 ${matching.length} 篇文章，已显示 ${visible.size} 篇。`;
  more.hidden = visible.size >= matching.length;
  more.textContent = `加载更多（还有 ${matching.length - visible.size} 篇）`;
}

function syncURL(replace = false) {
  const url = new URL(location.href);
  if (activeTag) url.searchParams.set('tag', activeTag);
  else url.searchParams.delete('tag');
  if (page > 1) url.searchParams.set('page', String(page));
  else url.searchParams.delete('page');
  url.hash = '';
  if (url.href !== location.href) {
    history[replace ? 'replaceState' : 'pushState'](history.state, '', url);
  }
}

function restore() {
  const url = new URL(location.href);
  let tag = url.searchParams.get('tag') || '';
  // Preserve old /tags/#... links from existing articles and bookmarks.
  if (!tag && url.hash) {
    try {
      const slug = decodeURIComponent(url.hash.slice(1));
      tag =
        filters.find((filter) => filter.dataset.slug === slug)?.dataset.tag ||
        '';
    } catch {
      /* Malformed fragments fall back to all articles. */
    }
  }
  activeTag = filters.some((filter) => filter.dataset.tag === tag) ? tag : '';
  const requested = url.searchParams.get('page') || '1';
  page = /^[1-9]\d{0,5}$/.test(requested) ? Number(requested) : 1;
  render();
  syncURL(true);
}

function selectTag(tag: string) {
  activeTag = tag;
  page = 1;
  render();
  syncURL();
}

for (const filter of filters) {
  filter.disabled = false;
  filter.addEventListener('click', () => selectTag(filter.dataset.tag!));
}
// Tags inside cards also filter in place; modified clicks still open their URL.
browser.addEventListener('click', (event) => {
  if (
    event.ctrlKey ||
    event.metaKey ||
    event.shiftKey ||
    event.altKey ||
    event.button !== 0
  )
    return;
  const link = (event.target as Element).closest<HTMLAnchorElement>(
    'a[data-post-tag]',
  );
  if (!link) return;
  event.preventDefault();
  selectTag(link.dataset.postTag!);
});
more.addEventListener('click', () => {
  const firstNew = page * pageSize;
  page++;
  render();
  syncURL();
  matching[firstNew]?.card.querySelector<HTMLAnchorElement>('h2 a')?.focus();
});
window.addEventListener('popstate', restore);
window.addEventListener('hashchange', restore);
restore();
