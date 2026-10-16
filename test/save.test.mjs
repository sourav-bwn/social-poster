import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,readdir,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import * as core from '../src/core.mjs';

const id='2026-10-16-demo-1234abcd';
async function fixture(fn) {
  const root=await mkdtemp(join(tmpdir(),'draft-save-'));
  try {await fn(root);} finally {await rm(root,{recursive:true,force:true});}
}
async function screenshot(root,name='one') {
  await mkdir(join(root,'assets/demo'),{recursive:true});
  await writeFile(join(root,`assets/demo/${name}.png`),'fixture image');
}
test('complete package appears in pending with ordered images',()=>fixture(async root=>{
  await screenshot(root);
  const project={screenshots:['assets/demo/one.png'],screenshot_source:'fixture'};
  await core.saveDraft(root,project,{id,status:'pending'});
  const dir=join(root,'pending',id);
  assert.equal(await readFile(join(dir,'screenshot-1.png'),'utf8'),'fixture image');
  assert.deepEqual(JSON.parse(await readFile(join(dir,'post.json'),'utf8')).image_files,['screenshot-1.png']);
  assert.deepEqual((await readdir(root)).sort(),['assets','pending']);
}));
test('missing second image leaves no partial pending or staging directory',()=>fixture(async root=>{
  await screenshot(root);
  await assert.rejects(core.saveDraft(root,{screenshots:['assets/demo/one.png','assets/demo/missing.png']},{id}));
  assert.deepEqual(await readdir(join(root,'pending')),[]);
  assert.ok(!(await readdir(root)).some(x=>x.startsWith('.draft-')));
}));
test('unsafe paths fail before creating output',()=>fixture(async root=>{
  await assert.rejects(core.saveDraft(root,{screenshots:['../private.png']},{id}),/Unsafe screenshot/);
  assert.deepEqual(await readdir(root),[]);
}));
test('invalid draft ID fails before creating output',()=>fixture(async root=>{
  await assert.rejects(core.saveDraft(root,{}, {id:'../other'}),/Invalid draft/);
  assert.deepEqual(await readdir(root),[]);
}));
test('existing complete draft is preserved on collision and staging is cleaned',()=>fixture(async root=>{
  await core.saveDraft(root,{}, {id,marker:'original'});
  await assert.rejects(core.saveDraft(root,{}, {id,marker:'replacement'}));
  const saved=JSON.parse(await readFile(join(root,'pending',id,'post.json'),'utf8'));
  assert.equal(saved.marker,'original');
  assert.deepEqual(await readdir(root),['pending']);
}));
test('no-image project still writes a complete draft with missing-image status',()=>fixture(async root=>{
  await core.saveDraft(root,{}, {id});
  const saved=JSON.parse(await readFile(join(root,'pending',id,'post.json'),'utf8'));
  assert.deepEqual(saved.image_files,[]);
  assert.match(saved.image_status,/real app screenshot/);
}));

test('CLI screenshot-copy failure leaves review queue empty',()=>fixture(async root=>{
  const {cp}=await import('node:fs/promises');
  const {spawnSync}=await import('node:child_process');
  await cp(new URL('../src/',import.meta.url),join(root,'src'),{recursive:true});
  await mkdir(join(root,'projects'));
  await mkdir(join(root,'pending'));
  await writeFile(join(root,'projects/catalog.json'),JSON.stringify([{slug:'demo',repo:'https://github.com/sourav-bwn/demo',screenshots:['assets/demo/missing.png']} ]));
  const result=spawnSync(process.execPath,[join(root,'src/cli.mjs'),'generate','--sample'],{encoding:'utf8'});
  assert.equal(result.status,1);
  assert.match(result.stderr,/ENOENT/);
  assert.deepEqual(await readdir(join(root,'pending')),[]);
  assert.ok(!(await readdir(root)).some(x=>x.startsWith('.draft-')));
}));
