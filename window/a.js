/* Window — Tony's map into the spine. Part A: data, pictures, spine, repo.
   Spec: build/spec-window-app.md (Stuart, 7 Nov 2026). Section 3 first.
   Nothing private lives in this file: keys come from the phone's storage. */
'use strict';
const VER='v0.3 · 8 Nov';
const BASE='appE8PGfkXDMuZCXe', TBL='tblLVyDTlgB3E8sQp';
const GH_OWNER='artistonthehill', GH_REPO='artistonthehill', GH_BRANCH='main';
const SITE='https://www.artistonthehill.co.uk/';
// Paintings fields — ids, never names (names can be renamed; ids can't)
const F={title:'fldUwsWcBNFRiOm80',slug:'fldaFiuL9FO21uLI0',stage:'fldZ6DTFVAJtkzpiz',priceDisp:'fldAMf6fRUa1jSCsH',
  price:'fldaFsyOE94n3osr7',size:'fldWPm0R5SD7mztnp',collection:'fldIN7uBzbDvDHhVJ',lat:'fldaDJkmLc2ygxYyJ',lng:'fldM6DKhwMMNKb6lK',
  sold:'fldK2MfHmSOcuL5Cd',publish:'flduUIlOtmw04hwwL',img:'fldsi0m3fLzHXERwF',thumb:'fldKefu5fKkJUQc5h',loc:'fldJ8tcc8rBUUWTbC',
  notes:'fldqu3X4LgdpnAGqn',painted:'fld21YJXOgYdckJSU',region:'fldB1sSpW8PIsmQIc',nowAt:'fldU8VFnEpEgO9FGp'};
const PLACES='tblUniTDKcIQYGKM3';
const P={name:'fldPhtZfCQkchGdRZ',lat:'fldZlimdU6n5UkGhX',lng:'fldZ8ZWgFk2HzOCjX',kind:'flduZ4tJ7xAeTToNJ',active:'fld9SVfkwgTUobXmd',notes:'fldJxOiPXzFXikM0G',matches:'fldBbdt04qrAIC86p'};
const KINDS=['Storage','Gallery','Venue','Collector','Home','Tony'];
const READ_FIELDS=[F.title,F.slug,F.stage,F.priceDisp,F.price,F.size,F.collection,F.lat,F.lng,F.sold,F.publish,F.img,F.thumb,F.loc,F.notes,F.painted,F.region,F.nowAt];
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
let PLACESL=[];                     // [{id,f:{...}}]
const STUDIO=[50.70,-0.05];
function selName(v){ return v&&typeof v==='object'?(v.name||''):(v||''); }   // single selects come back as objects
function regionOf(r){ return selName(r.f[F.region]); }
function placeOf(r){ const l=r.f[F.nowAt]; return Array.isArray(l)&&l.length?(typeof l[0]==='string'?l[0]:l[0].id):''; }
function placeName(id){ const p=PLACESL.find(x=>x.id===id); return p?(p.f[P.name]||''):''; }
async function pullPlaces(){
  const q=Object.values(P).map(f=>'fields%5B%5D='+f).join('&')+'&returnFieldsByFieldId=true&pageSize=100';
  const j=await at('GET',PLACES+'?'+q); PLACESL=j.records.map(r=>({id:r.id,f:r.fields||{}}));
  PLACESL.sort((x,y)=>(selName(x.f[P.kind])==='Tony'?-1:0)-(selName(y.f[P.kind])==='Tony'?-1:0)||String(x.f[P.name]).localeCompare(String(y.f[P.name])));
  try{ localStorage.setItem('win-places',JSON.stringify(PLACESL)); }catch(e){} return PLACESL;
}
function loadPlacesCache(){ try{ PLACESL=JSON.parse(localStorage.getItem('win-places')||'[]'); }catch(e){} }
async function createPlace(fields){ const j=await at('POST',PLACES,{records:[{fields}],typecast:true,returnFieldsByFieldId:true}); const r={id:j.records[0].id,f:j.records[0].fields||fields}; PLACESL.push(r); return r; }
async function patchPlace(id,fields){ const j=await at('PATCH',PLACES,{records:[{id,fields}],typecast:true,returnFieldsByFieldId:true}); const p=PLACESL.find(x=>x.id===id); if(p) p.f=Object.assign({},p.f,j.records[0].fields||fields); return p; }

// ---------- which pin a painting belongs to, from where the easel stood ----------
// boxes are [latMin,latMax,lngMin,lngMax]; first match wins, so the small ones come before the big ones
const BOXES=[
  ['Venice',45.3,45.6,12.2,12.5],['Amalfi',40.5,40.95,14.1,14.8],['Ionian',37.8,40.0,19.3,21.6],['Alps',44.3,47.6,5.4,10.5],
  ['Mallorca',39.2,40.0,2.2,3.6],['Madeira',32.5,33.2,-17.5,-16.2],['Bahamas',22.5,27.6,-80,-74],['Australia',-44,-10,112,154],
  ['Ireland',51.3,55.6,-10.8,-5.9],['Channel Islands',49.1,49.8,-2.75,-1.9],['Scotland',54.6,60.9,-8.0,-0.6],['Wales',51.35,53.45,-5.4,-2.65],
  ['Isle of Wight',50.57,50.78,-1.6,-1.05],['London',51.28,51.70,-0.52,0.33],['Cornwall',49.9,50.95,-6.5,-4.17],['Devon',50.2,51.25,-4.17,-2.9],
  ['Dorset',50.5,50.86,-2.9,-1.70],['Hampshire',50.7,51.4,-1.96,-0.95],['Kent',51.08,51.5,0.3,1.45],['Sussex',50.7,51.15,-0.95,0.95],
  ['Surrey',51.1,51.45,-0.85,0.05],['Thames',51.4,51.75,-1.4,-0.52]];
const COLL_REGION={ionian:'Ionian',bahamas:'Bahamas',alps:'Alps',amalfi:'Amalfi',venice:'Venice'};
// returns {region, sure}; sure=false when the pin sits near a border or nowhere we know
function regionFor(lat,lng,collection){
  if(lat==null||lng==null||lat===''||lng===''||isNaN(+lat)||isNaN(+lng)) return {region:'Studio',sure:true};
  lat=+lat; lng=+lng;
  if(Math.abs(lat-STUDIO[0])<1e-4&&Math.abs(lng-STUDIO[1])<1e-4) return {region:'Studio',sure:true};
  for(const b of BOXES){ if(lat>=b[1]&&lat<=b[2]&&lng>=b[3]&&lng<=b[4]){
    const edge=Math.min(lat-b[1],b[2]-lat,lng-b[3],b[4]-lng); return {region:b[0],sure:edge>0.03}; } }
  const c=COLL_REGION[String(selName(collection)).toLowerCase()]; if(c) return {region:c,sure:false};
  if(lat>49.8&&lat<59&&lng>-8.5&&lng<2) return {region:'England',sure:false};
  return {region:'Elsewhere',sure:false};
}
// which Place an old free-text Current location means
function placeForText(t){ t=String(t||'').toLowerCase(); if(!t) return null;
  for(const p of PLACESL){ const ms=String(p.f[P.matches]||'').split(',').map(s=>s.trim()).filter(Boolean); if(ms.some(m=>t.indexOf(m)>=0)) return p; }
  return null; }
function regionsInUse(){ const s=new Set(['Studio']); SPINE.forEach(r=>{ const v=regionOf(r); if(v) s.add(v); }); return [...s].sort((x,y)=>x==='Studio'?1:y==='Studio'?-1:x.localeCompare(y)); }
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
// pictures just made on this phone, kept so the wall and the card show them at once — the site takes a minute to serve a new file
const FRESH={};                                   // slug -> {thumb:dataURL, web:dataURL, at}
function loadFresh(){ try{ const j=JSON.parse(localStorage.getItem('win-fresh')||'{}'); const cut=Date.now()-86400000; Object.keys(j).forEach(k=>{ if(j[k].at>cut) FRESH[k]=j[k]; }); }catch(e){} }
function remember(slug,pics){ FRESH[slug]={thumb:pics.thumb.dataURL,web:pics.web.dataURL,at:Date.now()};
  try{ const keep={}; Object.keys(FRESH).sort((x,y)=>FRESH[y].at-FRESH[x].at).slice(0,30).forEach(k=>keep[k]={thumb:FRESH[k].thumb,at:FRESH[k].at}); localStorage.setItem('win-fresh',JSON.stringify(keep)); }catch(e){} }
// relative paths: the app is served from the same site as the pictures, so this works on any address the site answers to
function tileSrc(r){ const fr=FRESH[r.f[F.slug]]; if(fr&&fr.thumb) return fr.thumb; return r.f[F.thumb]||r.f[F.img]||''; }   // small for the wall
function cardSrc(r){ const fr=FRESH[r.f[F.slug]]; if(fr&&fr.web) return fr.web; return r.f[F.img]||r.f[F.thumb]||''; }       // big for the card
function picFor(r){ return cardSrc(r); }
function isFresh(r){ const fr=FRESH[r.f[F.slug]]; return !!(fr&&Date.now()-fr.at<6*60000); }
