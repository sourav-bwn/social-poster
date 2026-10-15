import {test} from 'node:test';
import assert from 'node:assert/strict';
import {safeId,validateCopy,catalog,imagePlan} from '../src/core.mjs';
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

test('real app screenshots are copied in reviewed order, without a generated card fallback',async()=>{
  const items=await catalog();
  const student=items.find(x=>x.slug==='student-manage-system');
  assert.deepEqual(imagePlan(student).image_files,['screenshot-1.png','screenshot-2.png','screenshot-3.png']);
  assert.deepEqual(imagePlan(items.find(x=>x.slug==='attendance-system')).image_files,[]);
  assert.match(imagePlan(items.find(x=>x.slug==='attendance-system')).image_status,/real app screenshot/);
  for (const path of student.screenshots) {
    const data=await readFile(join(import.meta.dirname,'..',path));
    assert.equal(data.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
  }
});


const project = {repo:'https://github.com/sourav-bwn/demo', demo:'https://demo.example/'};
const caption = url => `A concrete project detail with enough context for a reviewable draft. Code: ${url}`;
const pair = url => ({linkedin:caption(url), instagram:caption(url)});
test('project copy requires the verified repository in both captions',()=>{
  assert.throws(()=>validateCopy(pair('https://other.example/'), project), /verified code URL/);
  assert.throws(()=>validateCopy({...pair(project.repo),instagram:caption('no link')}, project), /instagram/);
});
test('lookalike and embedded repository URLs are not accepted',()=>{
  for (const url of [project.repo+'-fake',project.repo+'?tracking=1','https://other.example/?next='+project.repo]) {
    assert.throws(()=>validateCopy(pair(url), project));
  }
});
test('verified links work with sentence punctuation and markdown',()=>{
  for (const url of [project.repo+'.',`[code](${project.repo})`,project.repo+'!']) {
    assert.doesNotThrow(()=>validateCopy(pair(url), project));
  }
});
test('invented demo links fail even when code link is present',()=>{
  assert.throws(()=>validateCopy(pair(project.repo+' https://invented.example/'), project), /Unverified URL/);
});
test('only a supplied demo URL is allowed',()=>{
  assert.doesNotThrow(()=>validateCopy(pair(project.repo+' '+project.demo), project));
  assert.throws(()=>validateCopy(pair(project.repo+' '+project.demo), {repo:project.repo}), /Unverified URL/);
});
test('Gemini output is link-validated without contacting the API',async()=>{
  const {geminiCopy} = await import('../src/core.mjs');
  const previousFetch = globalThis.fetch;
  const previousKey = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = 'test-only-placeholder';
  globalThis.fetch = async () => ({ok:true,json:async()=>({candidates:[{content:{parts:[{text:JSON.stringify(pair('https://invented.example/'))}]}}]})});
  try {await assert.rejects(geminiCopy(project, []), /verified code URL/);}
  finally {globalThis.fetch=previousFetch;if(previousKey===undefined)delete process.env.GEMINI_API_KEY;else process.env.GEMINI_API_KEY=previousKey;}
});
