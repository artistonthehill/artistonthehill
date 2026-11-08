/* Window — Tony's map into the spine. Part A: data, pictures, spine, repo.
   Spec: build/spec-window-app.md (Stuart, 7 Nov 2026). Section 3 first.
   Nothing private lives in this file: keys come from the phone's storage. */
'use strict';
const VER='v0.1.1 · 8 Nov';
const BASE='appE8PGfkXDMuZCXe', TBL='tblLVyDTlgB3E8sQp';
const GH_OWNER='artistonthehill', GH_REPO='artistonthehill', GH_BRANCH='main';
const SITE='https://www.artistonthehill.co.uk/';
// Paintings fields — ids, never names (names can be renamed; ids can't)
const F={title:'fldUwsWcBNFRiOm80',slug:'fldaFiuL9FO21uLI0',stage:'fldZ6DTFVAJtkzpiz',priceDisp:'fldAMf6fRUa1jSCsH',
  price:'fldaFsyOE94n3osr7',size:'fldWPm0R5SD7mztnp',collection:'fldIN7uBzbDvDHhVJ',lat:'fldaDJkmLc2ygxYyJ',lng:'fldM6DKhwMMNKb6lK',
  sold:'fldK2MfHmSOcuL5Cd',publish:'flduUIlOtmw04hwwL',img:'fldsi0m3fLzHXERwF',thumb:'fldKefu5fKkJUQc5h',loc:'fldJ8tcc8rBUUWTbC',
  notes:'fldqu3X4LgdpnAGqn',painted:'fld21YJXOgYdckJSU'};
const READ_FIELDS=[F.title,F.slug,F.stage,F.priceDisp,F.price,F.size,F.collection,F.lat,F.lng,F.sold,F.publish,F.img,F.thumb,F.loc,F.notes,F.painted];
const SIZES=['A4','A3','80×30','60×42','80×60','42×30','A2','Custom'];
const A={A4:'A4 (21×30cm)',A3:'A3 (30×42cm)',A2:'A2 (42×60cm)'};
const PRICES=['850','1320','2760','3600','5040','Custom'];
const PRICE_FOR={A3:'1320','80×30':'2760'};            // the Decisions price table; others wait for Tony
const MEDIA=['Oil on board','Oil on canvas','Oil on paper'];
const WEB_PX=1600, WEB_Q=0.8, THUMB_PX=240, THUMB_Q=0.7;

// ---------- keys: this phone only. Reads the Field Studio keys too, so nothing has to be typed twice ----------
const K={
  get at(){return localStorage.getItem('win-at')||localStorage.getItem('fs2-at')||'';},
  get gh(){return localStorage.getItem('win-gh')||localStorage.getItem('fs2-gh')||localStorage.getItem('gh_token_aoth')||'';},
  set(at,gh){ if(at) localStorage.setItem('win-at',at.trim()); if(gh) localStorage.setItem('win-gh',gh.trim()); }
};

// ---------- small helpers ----------
const $=id=>document.getElementById(id);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function slugify(t){return String(t||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');}
function tri(){return Math.random().toString(36).slice(2,5);}
function newSlug(title,taken){ let s; do{ s=(slugify(title)||'painting')+'-'+tri(); }while(taken&&taken.has(s)); return s; }
function money(n){ return '£'+Number(n).toLocaleString('en-GB'); }
function sizeText(chip,w,h,medium){
  if(A[chip]) return A[chip]+' · '+medium;
  if(chip==='Custom') return (w&&h)?(w+'×'+h+'cm · '+medium):'';
  return chip+'cm · '+medium;
}
// read a Size string back into chip / w / h / medium so the buttons show what's saved
function parseSize(s){
  s=String(s||''); const out={chip:'',w:'',h:'',medium:MEDIA[0]};
  const m=s.match(/\b(A[2-4])\b/i); const d=s.match(/(\d+(?:\.\d+)?)\s*[×xX]\s*(\d+(?:\.\d+)?)/);
  const med=MEDIA.find(x=>s.toLowerCase().indexOf(x.toLowerCase())>=0); if(med) out.medium=med;
  else if(/canvas/i.test(s)) out.medium=MEDIA[1]; else if(/paper/i.test(s)) out.medium=MEDIA[2];
  if(m){ out.chip=m[1].toUpperCase(); return out; }
  if(d){ const k=d[1]+'×'+d[2]; out.w=d[1]; out.h=d[2]; out.chip=SIZES.indexOf(k)>=0?k:'Custom'; }
  return out;
}
// a Google Maps share link, an Apple Maps link, or a plain "51.001667, 0.543929"
function parseLatLng(t){
  t=String(t||'').trim(); let m;
  if((m=t.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/)))return [+m[1],+m[2]];
  if((m=t.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/)))return [+m[1],+m[2]];
  if((m=t.match(/[?&](?:q|ll|query|sll|center)=(-?\d+\.\d+)(?:,|%2C)(-?\d+\.\d+)/i)))return [+m[1],+m[2]];
  if((m=t.match(/(-?\d{1,2}\.\d{3,})\s*,\s*(-?\d{1,3}\.\d{3,})/)))return [+m[1],+m[2]];
  return null;
}
function toast(msg,ms){ const t=$('toast'); t.textContent=msg; t.classList.add('show'); clearTimeout(toast._t); toast._t=setTimeout(()=>t.classList.remove('show'),ms||2600); }

// ---------- pictures: the two files and nothing larger ----------
async function loadImage(file){
  if(window.createImageBitmap){ try{ return await createImageBitmap(file,{imageOrientation:'from-image'}); }catch(e){} }
  return new Promise((res,rej)=>{ const u=URL.createObjectURL(file); const im=new Image(); im.onload=()=>{URL.revokeObjectURL(u);res(im);}; im.onerror=rej; im.src=u; });
}
function fit(w,h,max){ const s=Math.min(1,max/Math.max(w,h)); return [Math.max(1,Math.round(w*s)),Math.max(1,Math.round(h*s))]; }
function toJpeg(src,maxPx,q){
  const w=src.width||src.naturalWidth, h=src.height||src.naturalHeight; const [tw,th]=fit(w,h,maxPx);
  const c=document.createElement('canvas'); c.width=tw; c.height=th;
  const x=c.getContext('2d'); x.imageSmoothingEnabled=true; x.imageSmoothingQuality='high';
  // two-step shrink for big photos keeps the thumbnail crisp
  if(w>tw*2){ const mid=document.createElement('canvas'); mid.width=Math.round(w/2); mid.height=Math.round(h/2);
    mid.getContext('2d').drawImage(src,0,0,mid.width,mid.height); x.drawImage(mid,0,0,tw,th); } else x.drawImage(src,0,0,tw,th);
  const url=c.toDataURL('image/jpeg',q); return {dataURL:url,b64:url.split(',')[1],w:tw,h:th,bytes:Math.round(url.length*0.75)};
}
// returns {web,thumb} from a File/Blob — the original is never kept
async function makePictures(file){ const im=await loadImage(file); const web=toJpeg(im,WEB_PX,WEB_Q); const thumb=toJpeg(im,THUMB_PX,THUMB_Q); if(im.close) im.close(); return {web,thumb}; }

// ---------- repo (GitHub contents API, the uploader token) ----------
async function ghGetSha(path){
  const r=await fetch(`https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/${path}?ref=${GH_BRANCH}&t=${Date.now()}`,
    {headers:{Authorization:'token '+K.gh,Accept:'application/vnd.github.v3+json'}});
  if(r.status===404) return null; if(!r.ok) throw new Error('GitHub '+r.status); return (await r.json()).sha||null;
}
async function ghPut(path,b64,message){
  const sha=await ghGetSha(path); const body={message,content:b64,branch:GH_BRANCH}; if(sha) body.sha=sha;
  const r=await fetch(`https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/${path}`,
    {method:'PUT',headers:{Authorization:'token '+K.gh,Accept:'application/vnd.github.v3+json','Content-Type':'application/json'},body:JSON.stringify(body)});
  if(!r.ok){ const t=await r.text(); throw new Error('GitHub '+r.status+(r.status===401?' — token refused':r.status===409?' — try again':'')+' '+t.slice(0,120)); }
  return r.json();
}

// ---------- spine (Airtable) ----------
async function at(method,path,body){
  const r=await fetch('https://api.airtable.com/v0/'+BASE+'/'+path,{method,headers:{Authorization:'Bearer '+K.at,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});
  if(!r.ok){ const t=await r.text(); throw new Error('Spine '+r.status+(r.status===401||r.status===403?' — key refused':'')+' '+t.slice(0,140)); }
  return r.json();
}
let SPINE=[];                       // [{id,created,f:{...by field id}}]
function cacheSpine(){ try{ localStorage.setItem('win-spine',JSON.stringify({at:Date.now(),rows:SPINE})); }catch(e){} }
function loadCache(){ try{ const c=JSON.parse(localStorage.getItem('win-spine')||'null'); if(c&&c.rows){ SPINE=c.rows; return c.at; } }catch(e){} return 0; }
async function pullSpine(){
  if(!K.at) throw new Error('No Airtable key yet — tap ⚙︎');
  const rows=[]; let off='';
  do{ const q=READ_FIELDS.map(f=>'fields%5B%5D='+f).join('&')+'&returnFieldsByFieldId=true&pageSize=100'+(off?'&offset='+off:'');
    const j=await at('GET',TBL+'?'+q); j.records.forEach(r=>rows.push({id:r.id,created:r.createdTime,f:r.fields||{}})); off=j.offset||''; }while(off);
  rows.sort((a,b)=>a.created<b.created?1:-1); SPINE=rows; cacheSpine(); return rows;
}
async function createCard(fields){ const j=await at('POST',TBL,{records:[{fields}],typecast:true,returnFieldsByFieldId:true}); return j.records[0]; }
async function patchCard(id,fields){ const j=await at('PATCH',TBL,{records:[{id,fields}],typecast:true,returnFieldsByFieldId:true}); return j.records[0]; }
const takenSlugs=()=>new Set(SPINE.map(r=>r.f[F.slug]).filter(Boolean));
// the thumb sits next to its web picture under the same file name (images/foo.jpg -> images/thumbs/foo.jpg)
const thumbPath=(slugOrRow)=>{ if(typeof slugOrRow==='string') return 'images/thumbs/'+slugOrRow+'.jpg';
  const f=slugOrRow.f||{}; if(f[F.thumb]) return f[F.thumb]; const i=f[F.img]; if(i) return 'images/thumbs/'+i.split('/').pop().replace(/\.[^.]+$/,'.jpg'); return 'images/thumbs/'+(f[F.slug]||'picture')+'.jpg'; };
const imgPath=slug=>'images/'+slug+'.jpg';
// picture to show for a card: thumb if the card has one, else the web picture, else nothing (never a black tile)
// relative paths: the app is served from the same site as the pictures, so this works on any address the site answers to
function picFor(r){ return r.f[F.thumb]||r.f[F.img]||''; }
