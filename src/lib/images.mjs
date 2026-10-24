import { readFile } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import { imageMetadata } from 'astro/assets/utils';

const assetRoot = resolve('assets');
const dimensions = new Map();

// Read dimensions at build time so local article photos reserve space before loading.
export async function imageDimensions(src = '') {
  if (typeof src !== 'string' || !src.startsWith('/assets/')) return {};
  const path = resolve(`.${decodeURIComponent(src)}`);
  if (!path.startsWith(`${assetRoot}${sep}`)) return {};
  if (!dimensions.has(path)) {
    dimensions.set(
      path,
      readFile(path)
        .then((data) => imageMetadata(data, src))
        .then(
          ({ width, height }) => ({ width, height }),
          () => ({}),
        ),
    );
  }
  return dimensions.get(path);
}

export async function reserveImageSpace(html) {
  const images = [...html.matchAll(/<img\b[^>]*>/gi)];
  const replacements = await Promise.all(
    images.map(async ([tag]) => {
      const src = tag.match(/\bsrc="([^"]+)"/)?.[1];
      const size = await imageDimensions(src);
      if (!size.width || /\b(?:width|height)=/.test(tag)) return tag;
      return tag.replace(
        /\s*\/?>$/,
        ` width="${size.width}" height="${size.height}">`,
      );
    }),
  );
  let index = 0;
  return html.replace(/<img\b[^>]*>/gi, () => replacements[index++]);
}
