import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Validator } from '@cfworker/json-schema';
import { parse } from 'yaml';

const config = parse(await readFile('admin/config.yml', 'utf8'));
const schema = JSON.parse(
  await readFile('node_modules/@sveltia/cms/schema/sveltia-cms.json', 'utf8'),
);
const result = new Validator(schema).validate(config);
assert.ok(result.valid, JSON.stringify(result.errors, null, 2));
for (const backend of [
  { ...config.backend, auth_methods: ['token'] },
  {
    ...config.backend,
    base_url: 'https://auth.example.com',
    auth_methods: ['oauth', 'token'],
  },
]) {
  const runtime = new Validator(schema).validate({
    ...config,
    load_config_file: false,
    backend,
  });
  assert.ok(runtime.valid, JSON.stringify(runtime.errors, null, 2));
}
assert.equal(config.backend.repo, 'rickylsr/blog-mm');
assert.equal(config.backend.branch, 'master');
assert.equal(config.publish_mode.type, 'editorial_workflow');
assert.ok(
  config.collections[0].fields.some((field) => field.name === 'permalink'),
);
console.log(
  'CMS configuration is valid; draft workflow and existing permalinks are preserved.',
);
