import {readFile, readdir, writeFile, mkdir} from 'node:fs/promises';
import {join, resolve} from 'node:path';
import {randomUUID} from 'node:crypto';

export const root = resolve(import.meta.dirname, '..');
export const catalog = () => readFile(join(root, 'projects/catalog.json'), 'utf8').then(JSON.parse);
export function safeId(id) {
  if (!/^\d{4}-\d{2}-\d{2}-[a-z0-9-]+-[a-f0-9]{8}$/.test(id || '')) throw new Error('Invalid draft ID');
  return id;
}
export async function nextProject() {
  const items = await catalog();
  const dirs = await readdir(join(root, 'pending'), {withFileTypes:true});
  const drafts = await Promise.all(dirs.filter(d => d.isDirectory()).map(async d => {
    try {return JSON.parse(await readFile(join(root,'pending',d.name,'post.json'),'utf8'));} catch {return null;}
  }));
  const seen = new Map(items.map(p => [p.slug, 0]));
  for (const d of drafts) if (d && seen.has(d.project)) seen.set(d.project, seen.get(d.project)+1);
  return items.sort((a,b) => seen.get(a.slug)-seen.get(b.slug))[0];
}
export function validateCopy(copy) {
  for (const key of ['linkedin','instagram']) if (typeof copy?.[key] !== 'string' || copy[key].trim().length < 60 || copy[key].length > 2100) throw new Error(`Missing or out-of-range ${key} text`);
  return {linkedin:copy.linkedin.trim(), instagram:copy.instagram.trim()};
}
export async function geminiCopy(project, previous) {
  if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY missing: no scheduled draft generated');
  const prompt = `Write two distinct first-person social posts for the developer Sourav Garai about his own project. Return ONLY JSON with string keys linkedin and instagram. No made-up metrics, users, hires, dates, technology, performance claims, or roles. Avoid generic AI filler. LinkedIn: professional, specific engineering choices and value to recruiters, stronger and more precise than earlier posts. Instagram: short, casual, visual, suited to the graphic. Do not imply the app is production-grade if source says demo. Do not repeat earlier hooks. Human approval is required before publication. Ground all claims only in this verified project brief:\n${JSON.stringify(project)}\nPrevious posts (style/hook avoidance only): ${JSON.stringify(previous.slice(-5))}`;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(process.env.GEMINI_MODEL || 'gemini-3.8-flash')}:generateContent`;
  const response = await fetch(url, {method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':process.env.GEMINI_API_KEY},body:JSON.stringify({contents:[{parts:[{text:prompt}]}],generationConfig:{responseMimeType:'application/json',temperature:0.7}})});
  if (!response.ok) throw new Error(`Gemini failed HTTP ${response.status}: ${await response.text()}`);
  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.map(p=>p.text||'').join('');
  if (!text) throw new Error('Gemini returned no usable text');
  return validateCopy(JSON.parse(text));
}
export async function generate({sample=false}={}) {
  const project = sample ? (await catalog())[0] : await nextProject();
  const dirs = await readdir(join(root,'pending'),{withFileTypes:true});
  const previous = await Promise.all(dirs.filter(x=>x.isDirectory()).map(async x => {
    try {return JSON.parse(await readFile(join(root,'pending',x.name,'post.json'),'utf8'));} catch {return null;}
  }));
  const copy = sample ? validateCopy({
    linkedin: `I built AttendEase to make a routine classroom task easier: keeping attendance accurate without slowing down the day.\n\nIt runs in a browser and keeps records by date, with search, status filters and live counts. I added Excel export, CSV backup and print so the data is useful beyond the screen.\n\nThis project pushed me to think about the full workflow, not just the form: entering records, finding them again and taking them out when needed. The code is public here: ${project.repo}\n\n#WebDevelopment #JavaScript #StudentTools`,
    instagram: `Built a simpler way to keep track of attendance 📋\n\nAttendEase lets you mark students, see live counts, find a record and export to Excel or CSV. It runs right in the browser.\n\nOne small tool, lots of everyday friction removed. Code: ${project.repo}\n\n#BuildInPublic #WebDev #StudentTools`
  }) : await geminiCopy(project, previous.filter(Boolean).map(x=>({linkedin:x.linkedin, instagram:x.instagram})));
  const id = `${new Date().toISOString().slice(0,10)}-${project.slug}-${randomUUID().slice(0,8)}`;
  const dir = join(root,'pending',id);
  await mkdir(dir,{recursive:true});
  const draft = {id, project:project.slug, project_url:project.repo, headline:project.headline, features:project.features, linkedin:copy.linkedin, instagram:copy.instagram, alt_text:`Card for ${project.name}: ${project.headline} Features: ${project.features.join(', ')}.`, generation:sample?'manual-example':'gemini', status:'pending', created_at:new Date().toISOString()};
  await writeFile(join(dir,'post.json'), JSON.stringify(draft,null,2)+'\n');
  await renderCard(project,join(dir,'card.png'));
  console.log(JSON.stringify({id, dir, generation:draft.generation}));
  return draft;
}
export async function renderCard(project,path) {
  const {spawn} = await import('node:child_process');
  const html = join(root,'src','card.html');
  const data = encodeURIComponent(JSON.stringify(project));
  const url = `file://${html}?data=${data}`;
  await new Promise((ok,no) => {
    const child=spawn(process.env.CHROME_BIN||'google-chrome', ['--headless=new','--no-sandbox','--disable-gpu','--hide-scrollbars','--disable-dev-shm-usage','--force-device-scale-factor=1','--window-size=1080,1080',`--screenshot=${path}`,url],{stdio:'ignore'});
    child.on('error',no); child.on('close',code=>code===0?ok():no(new Error(`Chrome exited ${code}`)));
  });
}
