import {test} from 'node:test';
import assert from 'node:assert/strict';
import {safeId,validateCopy,catalog} from '../src/core.mjs';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';

test('draft ID cannot traverse into other files',()=>{
  assert.throws(()=>safeId('../secrets'));
  assert.equal(safeId('2026-09-29-attendance-system-9326d130'),'2026-09-29-attendance-system-9326d130');
});
test('copy must be present and bounded',()=>{
  assert.throws(()=>validateCopy({linkedin:'short',instagram:'short'}));
  assert.equal(validateCopy({linkedin:'a'.repeat(61),instagram:'b'.repeat(61)}).instagram.length,61);
});
test('catalog has only public repository sources',async()=>{
  const items=await catalog();
  assert.ok(items.length>=1);
  assert.ok(items.every(x=>x.repo.startsWith('https://github.com/sourav-bwn/') && x.source));
});
test('sample draft stays pending and contains no secrets',async()=>{
  const draft=JSON.parse(await readFile(join(import.meta.dirname,'../pending/2026-09-29-attendance-system-9326d130/post.json'),'utf8'));
  assert.equal(draft.status,'pending');
  assert.equal(draft.generation,'manual-example');
  assert.match(draft.linkedin,/github.com\/sourav-bwn\/attendance-system/);
  assert.doesNotMatch(JSON.stringify(draft),/GEMINI_API_KEY|ACCESS_TOKEN/);
});
