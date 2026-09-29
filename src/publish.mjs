import {readFile, writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {root,safeId} from './core.mjs';

async function jsonRequest(url,token,body,extra={}) {
  const res=await fetch(url,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json',...extra},body:JSON.stringify(body)});
  if (!res.ok) throw new Error(`${new URL(url).hostname} HTTP ${res.status}: ${(await res.text()).slice(0,600)}`);
  return res;
}
export async function linkedin(post) {
  const token=process.env.LINKEDIN_ACCESS_TOKEN, author=process.env.LINKEDIN_PERSON_URN;
  if (!token || !/^urn:li:person:[\w-]+$/.test(author||'')) throw new Error('LinkedIn token or person URN missing');
  const version=process.env.LINKEDIN_VERSION || '202609';
  const headers={'Linkedin-Version':version,'X-Restli-Protocol-Version':'2.0.0'};
  const init=await jsonRequest('https://api.linkedin.com/rest/images?action=initializeUpload',token,{initializeUploadRequest:{owner:author}},headers);
  const {value}=await init.json();
  if (!value?.uploadUrl?.startsWith('https://') || !value?.image?.startsWith('urn:li:image:')) throw new Error('LinkedIn upload initialization was incomplete');
  const image=await readFile(join(root,'pending',post.id,'card.png'));
  const uploaded=await fetch(value.uploadUrl,{method:'PUT',headers:{'Content-Type':'image/png'},body:image});
  if (!uploaded.ok) throw new Error(`LinkedIn image upload HTTP ${uploaded.status}`);
  const published=await jsonRequest('https://api.linkedin.com/rest/posts',token,{author,commentary:post.linkedin,visibility:'PUBLIC',distribution:{feedDistribution:'MAIN_FEED',targetEntities:[],thirdPartyDistributionChannels:[]},content:{media:{id:value.image,altText:post.alt_text}},lifecycleState:'PUBLISHED',isReshareDisabledByAuthor:false},headers);
  const id=published.headers.get('x-restli-id');
  if (!id) throw new Error('LinkedIn post submitted but no ID was returned. Check account manually; do not retry blindly.');
  return {id, published_at:new Date().toISOString()};
}
export async function instagram(post) {
  const token=process.env.INSTAGRAM_ACCESS_TOKEN, ig=process.env.INSTAGRAM_USER_ID;
  if (!token || !/^\d+$/.test(ig||'')) throw new Error('Instagram token or professional account ID missing');
  if (process.env.GITHUB_REPOSITORY !== 'sourav-bwn/social-poster') throw new Error('Instagram image URL requires the verified public social-poster repo');
  const version=process.env.META_API_VERSION || 'v23.0';
  const imageUrl=`https://raw.githubusercontent.com/sourav-bwn/social-poster/main/pending/${post.id}/card.png`;
  const base=`https://graph.facebook.com/${version}`;
  const container=await jsonRequest(`${base}/${ig}/media`,token,{image_url:imageUrl,caption:post.instagram,alt_text:post.alt_text});
  const {id}=await container.json();
  if (!id) throw new Error('Instagram container ID missing');
  // Meta fetches the public PNG asynchronously. An unready container is not a publish failure.
  let ready=false;
  for(let i=0;i<12;i++) {
    const status=await fetch(`${base}/${encodeURIComponent(id)}?fields=status_code`,{headers:{Authorization:`Bearer ${token}`}});
    if (!status.ok) throw new Error(`Instagram container check HTTP ${status.status}`);
    const state=(await status.json()).status_code;
    if (state==='FINISHED') {ready=true;break;}
    if (state==='ERROR' || state==='EXPIRED') throw new Error(`Instagram container ${state}`);
    await new Promise(r=>setTimeout(r,5000));
  }
  if(!ready) throw new Error('Instagram media container was not ready. Inspect it before retrying.');
  const publish=await jsonRequest(`${base}/${ig}/media_publish`,token,{creation_id:id});
  const result=await publish.json();
  if (!result?.id) throw new Error('Instagram publish submitted but no media ID returned. Check account manually; do not retry blindly.');
  return {id:result.id, published_at:new Date().toISOString()};
}
export async function publish(id,channels='both') {
  safeId(id);
  if (!['linkedin','instagram','both'].includes(channels)) throw new Error('Invalid channel');
  if (process.env.APPROVED !== 'yes') throw new Error('Publishing requires an approval-confirmed manual dispatch');
  const path=join(root,'pending',id,'post.json');
  const post=JSON.parse(await readFile(path,'utf8'));
  if (post.id!==id || post.status!=='pending') throw new Error('Draft is missing, invalid or not pending');
  const targets=channels==='both'?['linkedin','instagram']:[channels];
  for (const channel of targets) {
    if (post.published?.[channel]) continue;
    // Fail closed: ambiguous network results can already have posted. Do not retry automatically.
    const result=await ({linkedin,instagram}[channel])(post);
    post.published={...post.published,[channel]:result};
    await writeFile(path,JSON.stringify(post,null,2)+'\n');
    console.log(`${channel} published: ${result.id}`);
  }
  if (post.published?.linkedin && post.published?.instagram) post.status='published';
  await writeFile(path,JSON.stringify(post,null,2)+'\n');
  return post;
}
