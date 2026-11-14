/* Window — Part C: the two maps (Painted / Now), the sheet behind every pin, Places, and the one-off
   backfill of Region and Now at from what the cards already say. Spec §1 §2 §5. */
'use strict';
let MAP=null, LAYER=null, MODE='painted';
let SHEET=null;                 // {kind:'region'|'place'|'all', key}
const UK_BOUNDS=[[49.8,-6.5],[55.9,1.9]];

function initMap(){
  if(!window.L||MAP) return;
  MAP=L.map('map',{zoomControl:false,attributionControl:false,worldCopyJump:true}).fitBounds(UK_BOUNDS);
  L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}',{maxZoom:16}).addTo(MAP);
  LAYER=L.layerGroup().addTo(MAP);
  MAP.on('moveend',()=>{ if(MODE==='now'&&placing) $('pickNote').textContent='Pin at '+MAP.getCenter().lat.toFixed(5)+', '+MAP.getCenter().lng.toFixed(5); });
}
function pin(lat,lng,label,count,cls,onTap){
  const html=`<div class="pinwrap ${cls||''}"><div class="pincount">${count}</div><div class="pinlabel">${esc(label)}</div></div>`;
  const m=L.marker([lat,lng],{icon:L.divIcon({className:'pin',html,iconSize:[1,1],iconAnchor:[0,0]})}); m.on('click',onTap); LAYER.addLayer(m); return m;
}
function wanted(r){ return !!r.f[F.want]&&!hasPin(r); }
function hasJob(r){ return !!String(r.f[F.job]||'').trim(); }
function hasPin(r){ return r.f[F.lat]!=null&&r.f[F.lng]!=null&&r.f[F.lat]!==''&&r.f[F.lng]!==''; }
function drawMap(){
  if(!MAP) return; LAYER.clearLayers(); const drawer=$('drawer'); drawer.innerHTML='';
  if(MODE==='painted'){
    const groups={}; live().forEach(r=>{ const g=regionOf(r)||(hasPin(r)||wanted(r)?'':'Studio'); if(!g) return; (groups[g]=groups[g]||[]).push(r); });
    const unplaced=live().filter(r=>!regionOf(r)&&hasPin(r));
    Object.keys(groups).forEach(g=>{
      const rows=groups[g]; let lat,lng;
      if(g==='Studio'){ [lat,lng]=STUDIO; }
      else { const p=rows.filter(hasPin); if(!p.length) return; lat=median(p.map(r=>+r.f[F.lat])); lng=median(p.map(r=>+r.f[F.lng])); }   // median: one stray pin can't drag the region out to sea
      pin(lat,lng,g,rows.length,g==='Studio'?'studio':'',()=>openSheet({kind:'region',key:g}));
    });
    if(unplaced.length) drawer.innerHTML=`<button class="drow" id="unplacedBtn"><span>${unplaced.length} pinned but not yet on a region</span><span class="n">›</span></button>`,
      $('unplacedBtn').onclick=()=>openSheet({kind:'unplaced'});
  } else if(MODE==='log'){
    const withJob=SPINE.filter(hasJob); const pinned=withJob.filter(hasPin); const unpinned=withJob.filter(r=>!hasPin(r));
    pinned.forEach(r=>pin(+r.f[F.lat],+r.f[F.lng],r.f[F.title]||'(untitled)','',' log',()=>openLog(r)));
    const rows=[];
    if(!withJob.length) rows.push('<div class="note">No job sheets yet. Lockup Sales writes one onto a card and it appears here, pinned where the easel stood.</div>');
    unpinned.forEach(r=>rows.push(`<button class="drow" data-log="${r.id}"><span>${esc(r.f[F.title]||'(untitled)')}</span><span class="n"><em>no pin</em> ›</span></button>`));
    drawer.innerHTML=rows.join('');
    drawer.querySelectorAll('[data-log]').forEach(b=>b.onclick=()=>{ const r=SPINE.find(x=>x.id===b.dataset.log); if(r) openLog(r); });
    $('status').textContent=withJob.length+(withJob.length===1?' painting with a log':' paintings with a log');
  } else {
    const byPlace={}; live().forEach(r=>{ const p=placeOf(r); if(p) (byPlace[p]=byPlace[p]||[]).push(r); });
    const rowsHtml=[];
    PLACESL.forEach(p=>{ if(p.f[P.active]===false) return; const kind=selName(p.f[P.kind]); if(kind==='Collector') return; const n=(byPlace[p.id]||[]).length;
      if(p.f[P.lat]!=null&&p.f[P.lng]!=null&&kind!=='Collector'&&kind!=='Tony') pin(+p.f[P.lat],+p.f[P.lng],p.f[P.name],n,'place',()=>openSheet({kind:'place',key:p.id}));
      else rowsHtml.push(`<button class="drow" data-p="${p.id}"><span>${esc(p.f[P.name])}</span><span class="n">${n}${(kind!=='Collector'&&kind!=='Tony')?' · <em>no pin yet</em>':''} ›</span></button>`); });
    const nowhere=live().filter(r=>!placeOf(r)).length;
    if(nowhere) rowsHtml.push(`<button class="drow" data-p="__none"><span>Where are these now?</span><span class="n">${nowhere} ›</span></button>`);
    drawer.innerHTML=rowsHtml.join('');
    drawer.querySelectorAll('.drow').forEach(b=>b.onclick=()=>{ const id=b.dataset.p; openSheet(id==='__none'?{kind:'nowhere'}:{kind:'place',key:id}); });
  }
  if(MODE==='log'){ $('modePainted').classList.remove('on'); $('modeNow').classList.remove('on'); $('modeLog').classList.add('on'); return; }
  const want=live().filter(wanted).length;
  if(want){ drawer.insertAdjacentHTML('beforeend',`<button class="drow want" id="wantBox"><span>Pins wanted \u2014 where did the easel stand?</span><span class="n">${want} \u203a</span></button>`); $('wantBox').onclick=()=>openSheet({kind:'wanted'}); }
  const sold=SPINE.filter(gone).length;
  if(sold){ drawer.insertAdjacentHTML('beforeend',`<button class="drow sold" id="soldBox"><span>Sold and gone</span><span class="n">${sold} ›</span></button>`); $('soldBox').onclick=()=>openSheet({kind:'sold'}); }
  $('modePainted').classList.toggle('on',MODE==='painted'); $('modeNow').classList.toggle('on',MODE==='now'); $('modeLog').classList.remove('on');
  $('newBtn').textContent=MODE==='now'?'+':'+'; $('newBtn').title=MODE==='now'?'New card or new place':'New card';
}
function setMode(m){ MODE=m; drawMap(); }
function fabTap(){
  if(MODE==='now'){ $('fabMenu').classList.toggle('open'); return; }
  PRESET={}; openCard(null);
}

// ---------- the sheet behind a pin ----------
// every sheet runs A→Z by title (untitled cards last) so a remembered title is quick to find
function byTitle(rows){
  const key=r=>String(r.f[F.title]||'').trim();
  return rows.slice().sort((x,y)=>{ const a=key(x), b=key(y); if(!a&&b) return 1; if(a&&!b) return -1; return a.localeCompare(b,'en',{sensitivity:'base',numeric:true}); });
}
function sheetRows(s){
  if(s.kind==='sold') return byTitle(SPINE.filter(gone));
  if(s.kind==='all') return byTitle(live());
  if(s.kind==='region') return byTitle(live().filter(r=>(regionOf(r)||(hasPin(r)||wanted(r)?'':'Studio'))===s.key));
  if(s.kind==='wanted') return byTitle(live().filter(wanted));
  if(s.kind==='unplaced') return byTitle(live().filter(r=>!regionOf(r)&&hasPin(r)));
  if(s.kind==='place') return byTitle(live().filter(r=>placeOf(r)===s.key));
  if(s.kind==='nowhere') return byTitle(live().filter(r=>!placeOf(r)));
  return [];
}
function sheetTitle(s){
  if(s.kind==='sold') return 'Sold and gone'; if(s.kind==='wanted') return 'Pins wanted'; if(s.kind==='all') return 'All paintings'; if(s.kind==='region') return s.key; if(s.kind==='unplaced') return 'Pinned, no region yet';
  if(s.kind==='place') return placeName(s.key)||'Place'; if(s.kind==='nowhere') return 'Where are these now?'; return '';
}
function openSheet(s){ SHEET=s; $('sheet').classList.add('open'); refreshSheet(); try{window.scrollTo(0,0);}catch(e){} }
function refreshSheet(){
  if(!SHEET||!$('sheet').classList.contains('open')) return;
  const rows=sheetRows(SHEET); const t=sheetTitle(SHEET);
  $('sNew').style.display=(SHEET.kind==='sold'||SHEET.kind==='wanted')?'none':'inline-block'; $('sList').style.display=SHEET.kind==='sold'?'block':'none'; $('sGrid').style.display=SHEET.kind==='sold'?'none':'grid';
  let noPic=0;
  if(SHEET.kind==='sold'){ $('sTray').innerHTML=''; $('sTrayWrap').style.display='none';
    $('sList').innerHTML=rows.map(r=>`<button class="lrow" data-id="${r.id}"><span class="lt">${esc(r.f[F.title]||'(untitled)')}</span><span class="ls">${esc(String(r.f[F.size]||'').split('·')[0].trim())}${placeOf(r)?' · '+esc(placeName(placeOf(r))):''}${selName(r.f[F.stage])?' · '+esc(selName(r.f[F.stage])):''}</span></button>`).join('')||'<div class="note">Nothing sold yet.</div>';
    $('sList').querySelectorAll('.lrow').forEach(bt=>bt.onclick=()=>{ const r=SPINE.find(x=>x.id===bt.dataset.id); if(r) openCard(r); }); }
  else ({noPic}=renderGrid(rows,$('sGrid'),$('sTray')));
  $('sTitle').textContent=t; $('sCount').textContent=rows.length+(rows.length===1?' painting':' paintings')+(noPic?' · '+noPic+' without a picture':'');
  const p=SHEET.kind==='place'?PLACESL.find(x=>x.id===SHEET.key):null;
  $('sPlaceTools').style.display=p?'flex':'none';
  // the 'where are these now?' sheet: say what it is and offer to place the lot in one go
  const bulk=$('sBulk'); bulk.style.display=SHEET.kind==='nowhere'&&rows.length?'block':'none';
  if(SHEET.kind==='nowhere'&&rows.length){ const pl=PLACESL.filter(x=>x.f[P.active]!==false&&selName(x.f[P.kind])!=='Collector');
    bulk.innerHTML='<div class="note">These cards say where the painting was <em>painted</em> but not where it <em>is</em> today. Open one and tap a place under Now at — or, if they are all in one place:</div><div class="chips" id="bulkChips" style="margin-top:8px"></div><div class="note" id="bulkNote"></div>';
    chips($('bulkChips'),pl.map(x=>x.id),'',async id=>{ const name=placeName(id); const n=rows.length; const b=$('bulkNote'); b.innerHTML='<span class="spin"></span> Putting '+n+' cards at '+esc(name)+'…';
      try{ for(let i=0;i<rows.length;i+=10){ const slice=rows.slice(i,i+10).map(r=>({id:r.id,fields:{[F.nowAt]:[id],[F.loc]:name}})); const j=await at('PATCH',TBL,{records:slice,typecast:true,returnFieldsByFieldId:true}); j.records.forEach(rec=>{ const r=SPINE.find(x=>x.id===rec.id); if(r) r.f=Object.assign({},r.f,rec.fields||{}); }); }
        cacheSpine(); toast(n+' cards now at '+name); renderHome(); openSheet({kind:'place',key:id}); }
      catch(e){ b.textContent=plain(e); } },id=>'All of these are at '+placeName(id)); }
  if(p){ const pinned=p.f[P.lat]!=null&&p.f[P.lng]!=null; $('sPinHere').textContent=pinned?'Move pin to here':'Pin it here'; $('sPinNote').textContent=pinned?('Pinned at '+(+p.f[P.lat]).toFixed(4)+', '+(+p.f[P.lng]).toFixed(4)):'No pin yet — tap when you are standing there, or paste a Maps link.'; }
}
function sheetNew(){ PRESET={}; if(SHEET&&SHEET.kind==='region'&&SHEET.key!=='Studio') PRESET.region=SHEET.key; if(SHEET&&SHEET.kind==='region'&&SHEET.key==='Studio') PRESET.region='Studio'; if(SHEET&&SHEET.kind==='place') PRESET.place=SHEET.key; openCard(null); }
async function pinPlaceHere(){
  const p=SHEET&&SHEET.kind==='place'?PLACESL.find(x=>x.id===SHEET.key):null; if(!p) return;
  if(!navigator.geolocation){ toast('No location on this device'); return; }
  $('sPinNote').innerHTML='<span class="spin"></span> Finding you…';
  navigator.geolocation.getCurrentPosition(async pos=>{ try{ await patchPlace(p.id,{[P.lat]:+pos.coords.latitude.toFixed(6),[P.lng]:+pos.coords.longitude.toFixed(6)}); toast(p.f[P.name]+' pinned'); refreshSheet(); drawMap(); }catch(e){ $('sPinNote').textContent=e.message; } },
    ()=>{ $('sPinNote').textContent='Location not allowed — paste a Maps link instead.'; },{enableHighAccuracy:true,timeout:12000});
}
async function pinPlacePaste(){
  const p=SHEET&&SHEET.kind==='place'?PLACESL.find(x=>x.id===SHEET.key):null; if(!p) return;
  try{ const t=await navigator.clipboard.readText(); const ll=parseLatLng(t); if(!ll) throw 0; await patchPlace(p.id,{[P.lat]:ll[0],[P.lng]:ll[1]}); toast(p.f[P.name]+' pinned'); refreshSheet(); drawMap(); }
  catch(e){ toast(e&&e.message?e.message:'Copy a Google Maps link first, then tap Paste'); }
}

// ---------- a new Place from the map ----------
let placing=false, newKind='Storage';
function openPlaceSheet(){ $('fabMenu').classList.remove('open'); placing=true; $('pName').value=''; newKind='Storage'; chips($('kindChips'),KINDS.filter(k=>k!=='Tony'),newKind,v=>{newKind=v;chips($('kindChips'),KINDS.filter(k=>k!=='Tony'),newKind,arguments.callee);});
  $('pickNote').textContent='Pin at '+MAP.getCenter().lat.toFixed(5)+', '+MAP.getCenter().lng.toFixed(5)+' — drag the map so the cross sits on the place, or use Here'; $('placeSheet').classList.add('open'); $('cross').style.display='block'; }
function closePlaceSheet(){ placing=false; $('placeSheet').classList.remove('open'); $('cross').style.display='none'; }
async function savePlace(useHere){
  const name=$('pName').value.trim(); if(!name){ toast('Give the place a name'); return; }
  const c=MAP.getCenter(); let lat=+c.lat.toFixed(6), lng=+c.lng.toFixed(6);
  const go=async()=>{ try{ const r=await createPlace({[P.name]:name,[P.kind]:newKind,[P.active]:true,[P.lat]:lat,[P.lng]:lng,[P.matches]:name.toLowerCase()}); toast(name+' added'); closePlaceSheet(); drawMap(); openSheet({kind:'place',key:r.id}); }catch(e){ toast(e.message); } };
  if(useHere&&navigator.geolocation){ navigator.geolocation.getCurrentPosition(p=>{ lat=+p.coords.latitude.toFixed(6); lng=+p.coords.longitude.toFixed(6); go(); },()=>go(),{enableHighAccuracy:true,timeout:12000}); } else go();
}

// ---------- one-off backfill: Region from the pin, Now at from the old Current location text ----------
let backfilled=false;
async function backfill(){
  if(backfilled||!K.at) return; backfilled=true;
  const regUpd=[], unsure=[], placeUpd=[];
  SPINE.forEach(r=>{
    if(!regionOf(r)&&!wanted(r)){ const g=regionFor(r.f[F.lat],r.f[F.lng],r.f[F.collection]); regUpd.push({id:r.id,fields:{[F.region]:g.region}}); if(!g.sure) unsure.push((r.f[F.title]||r.f[F.slug]||'?')+' → '+g.region); }
    if(!placeOf(r)&&r.f[F.loc]){ const p=placeForText(r.f[F.loc]); if(p) placeUpd.push({id:r.id,fields:{[F.nowAt]:[p.id]}}); }
  });
  if(!regUpd.length&&!placeUpd.length) return;
  $('status').innerHTML='<span class="spin"></span> Filling in regions and places on '+(regUpd.length+placeUpd.length)+' cards…';
  let done=0;
  for(const batch of [regUpd,placeUpd]) for(let i=0;i<batch.length;i+=10){
    const slice=batch.slice(i,i+10);
    try{ const j=await at('PATCH',TBL,{records:slice,typecast:true,returnFieldsByFieldId:true});
      j.records.forEach(rec=>{ const r=SPINE.find(x=>x.id===rec.id); if(r) r.f=Object.assign({},r.f,rec.fields||{}); }); done+=slice.length; }
    catch(e){ toast('Backfill stopped: '+e.message); break; }
  }
  cacheSpine(); try{ localStorage.setItem('win-unsure',JSON.stringify(unsure)); }catch(e){}
  renderHome(); toast(`Filled ${done} cards: ${regUpd.length} regions, ${placeUpd.length} places${unsure.length?' · '+unsure.length+' to check (⚙︎)':''}`,5000);
  showUnsure();
}
function showUnsure(){ let u=[]; try{ u=JSON.parse(localStorage.getItem('win-unsure')||'[]'); }catch(e){} const el=$('unsureList'); if(!el) return;
  el.innerHTML=u.length?('<div class="sect">Regions guessed from near a border — check these</div>'+u.map(x=>'<div class="note">'+esc(x)+'</div>').join('')+'<div class="note">Open the card and tap the right region; the list clears when they are all changed.</div>'):''; }

window.addEventListener('DOMContentLoaded',()=>{
  $('modePainted').onclick=()=>setMode('painted'); $('modeNow').onclick=()=>setMode('now'); $('modeLog').onclick=()=>setMode('log');
  $('lBack').onclick=()=>$('log').classList.remove('open'); $('lightbox').onclick=()=>$('lightbox').classList.remove('open');
  $('sBack').onclick=()=>{ $('sheet').classList.remove('open'); SHEET=null; };
  $('sNew').onclick=sheetNew; $('sPinHere').onclick=pinPlaceHere; $('sPinPaste').onclick=pinPlacePaste;
  $('fabCard').onclick=()=>{ $('fabMenu').classList.remove('open'); PRESET={}; openCard(null); };
  $('fabPlace').onclick=openPlaceSheet;
  $('pBack').onclick=closePlaceSheet; $('pSave').onclick=()=>savePlace(false); $('pHere').onclick=()=>savePlace(true);
  $('worldBtn').onclick=()=>{ const pts=[]; LAYER.eachLayer(m=>pts.push(m.getLatLng())); if(pts.length>1) MAP.fitBounds(L.latLngBounds(pts).pad(0.2)); };
  $('ukBtn').onclick=()=>MAP.fitBounds(UK_BOUNDS);
  showUnsure();
});


// ---------- the painting log: renders the card's Job sheet (five headings) — read-only, never written from here ----------
function mdInline(t){ return esc(t).replace(/\*\*(.+?)\*\*/g,'<b>$1</b>').replace(/(^|[^*])\*([^*]+)\*/g,'$1<i>$2</i>').replace(/`([^`]+)`/g,'<code>$1</code>'); }
function mdBlocks(lines){
  // bullets, numbered lists, pipe tables and paragraphs — enough for the sheet, no more
  const out=[]; let i=0;
  while(i<lines.length){ const l=lines[i];
    if(!l.trim()){ i++; continue; }
    if(/^\s*[-*]\s+/.test(l)){ const it=[]; while(i<lines.length&&/^\s*[-*]\s+/.test(lines[i])){ it.push(lines[i].replace(/^\s*[-*]\s+/,'')); i++; } out.push({t:'ul',items:it}); continue; }
    if(/^\s*\d+[.)]\s+/.test(l)){ const it=[]; while(i<lines.length&&/^\s*\d+[.)]\s+/.test(lines[i])){ it.push(lines[i].replace(/^\s*\d+[.)]\s+/,'')); i++; } out.push({t:'ol',items:it}); continue; }
    if(/^\s*\|/.test(l)){ const rows=[]; while(i<lines.length&&/^\s*\|/.test(lines[i])){ const cells=lines[i].trim().replace(/^\||\|$/g,'').split('|').map(c=>c.trim()); if(!cells.every(c=>/^:?-{2,}:?$/.test(c))) rows.push(cells); i++; } out.push({t:'table',rows}); continue; }
    const p=[]; while(i<lines.length&&lines[i].trim()&&!/^\s*([-*]|\d+[.)])\s+/.test(lines[i])&&!/^\s*\|/.test(lines[i])){ p.push(lines[i].trim()); i++; } out.push({t:'p',text:p.join(' ')});
  }
  return out;
}
function blocksHtml(blocks,opt){ opt=opt||{};
  return blocks.map(b=>{
    if(b.t==='p') return '<p>'+mdInline(b.text)+'</p>';
    if(b.t==='table') return '<table>'+b.rows.map((r,ri)=>'<tr>'+r.map(c=>(ri===0?'<th>':'<td>')+mdInline(c)+(ri===0?'</th>':'</td>')).join('')+'</tr>').join('')+'</table>';
    const items=b.items.map(x=>'<li'+(opt.markNext&&/\bNEXT\b/.test(x)?' class="lnext"':'')+'>'+mdInline(x)+'</li>').join('');
    return (b.t==='ol'?'<ol>':'<ul>')+items+(b.t==='ol'?'</ol>':'</ul>');
  }).join('');
}
function timelineHtml(blocks){
  // every bullet is one event, "date — what happened"; newest first, as Tony asked
  const items=[]; blocks.forEach(b=>{ if(b.t==='ul'||b.t==='ol') items.push(...b.items); else if(b.t==='p') items.push(b.text); });
  if(!items.length) return '<p class="note">Nothing logged yet.</p>';
  return '<div class="ltl">'+items.slice().reverse().map(x=>{ const m=x.match(/^(.{3,40}?)\s+[—–-]\s+([\s\S]+)$/); return m?'<div class="it"><span class="d">'+mdInline(m[1])+'</span><span>'+mdInline(m[2])+'</span></div>':'<div class="it"><span class="d"></span><span>'+mdInline(x)+'</span></div>'; }).join('')+'</div>';
}
function parseJob(text){
  const secs=[]; let cur={key:'pre',title:'',lines:[]};
  String(text||'').replace(/\r/g,'').split('\n').forEach(l=>{ const h=l.match(/^#{2,3}\s+(.+)$/); if(h){ secs.push(cur); const t=h[1].replace(/\s*\(.*\)\s*$/,'').trim(); const k=/best bet/i.test(t)?'best':/timeline/i.test(t)?'timeline':/contact/i.test(t)?'contacts':/jobs|outstanding/i.test(t)?'jobs':/idea/i.test(t)?'ideas':'other'; cur={key:k,title:t,lines:[]}; } else if(!/^#\s/.test(l)) cur.lines.push(l); });
  secs.push(cur); return secs;
}
function openLog(r){
  const f=r.f; const secs=parseJob(f[F.job]); const pre=secs.find(s=>s.key==='pre');
  const size=String(f[F.size]||''); const price=f[F.priceDisp]||(f[F.price]?money(String(Math.round(f[F.price]))):''); const now=placeOf(r)?placeName(placeOf(r)):(f[F.loc]||'');
  const src=cardSrc(r); const img=src?(/^(data:|https?:)/.test(src)?src:SITE+src):'';
  let h='';
  if(img) h+='<div class="lpic"><img src="'+esc(img)+'" alt=""></div>';
  h+='<div class="lmeta">'+[esc(regionOf(r)||''),esc(size),esc(price),now?('now at '+esc(now)):'',hasPin(r)?('easel at '+(+f[F.lat]).toFixed(5)+', '+(+f[F.lng]).toFixed(5)):'no easel pin'].filter(Boolean).join(' · ')+'</div>';
  if(pre&&pre.lines.some(l=>l.trim())) h+='<div class="lmeta">'+blocksHtml(mdBlocks(pre.lines))+'</div>';
  const by=k=>secs.filter(s=>s.key===k);
  const panel=(cls,title,inner)=>'<section class="lpanel '+cls+'"><h2>'+esc(title)+'</h2>'+inner+'</section>';
  const best=by('best')[0]; h+=panel('best','Best bet',best?blocksHtml(mdBlocks(best.lines)):'<p class="note">Not written yet.</p>');
  const tl=by('timeline')[0]; let shots=''; const att=Array.isArray(f[F.shots])?f[F.shots]:[];
  if(att.length) shots='<div class="shots">'+att.map(a=>{ const th=(a.thumbnails&&(a.thumbnails.large||a.thumbnails.small)||{}).url||a.url; return '<img src="'+esc(th)+'" data-full="'+esc(a.url)+'" alt="">'; }).join('')+'</div>';
  h+=panel('tl','Timeline',(tl?timelineHtml(mdBlocks(tl.lines)):'<p class="note">Nothing logged yet.</p>')+shots);
  const c=by('contacts')[0]; h+=panel('contacts','Contacts made',c?blocksHtml(mdBlocks(c.lines)):'<p class="note">None yet.</p>');
  const j=by('jobs')[0]; h+=panel('jobs','Jobs outstanding',(j?blocksHtml(mdBlocks(j.lines),{markNext:true}):'<p class="note">None.</p>')+'<div style="margin-top:12px"><button class="btn sec sm" id="lUpdate">Update this list with Lockup Sales</button></div><div class="note" id="lUpdateNote"></div>');
  const id=by('ideas')[0]; h+=panel('ideas','Ideas to pursue',id?blocksHtml(mdBlocks(id.lines)):'<p class="note">None yet.</p>');
  by('other').forEach(s=>{ h+=panel('other',s.title,blocksHtml(mdBlocks(s.lines))); });
  h+='<div class="note" style="margin:16px 0">This page is the record. The chasing happens in the Lockup Sales chat, which writes it. Tap the picture to open the card.</div>';
  $('lTitle').textContent=f[F.title]||'Log'; $('lSub').textContent=f[F.slug]||''; $('lMain').innerHTML=h;
  $('lMain').querySelectorAll('.shots img').forEach(im=>im.onclick=()=>{ $('lbImg').src=im.dataset.full; $('lightbox').classList.add('open'); });
  const pic=$('lMain').querySelector('.lpic img'); if(pic) pic.onclick=()=>openCard(r);
  // "Update this list": copies a ready-made message (the list + what to do with it) and opens AOTH HQ. Claude's project page ignores pre-typed text in a link, so it is copy → open → paste → send.
  const ub=$('lUpdate'); if(ub) ub.onclick=async()=>{
    const jobsText=j?j.lines.join('\n').trim():'(none listed)';
    const msg="You're Lockup Sales \u2014 read lockup-sales/brief.md, then the Job sheet field on card "+r.id+" ("+(f[F.title]||'')+").\n\nTake me through its Jobs outstanding one at a time \u2014 one job per message, ask me: done, still open, or changed (and how). Don't move on until I've answered. When we've been through them all, rewrite the Jobs outstanding section in the card's Job sheet field with one job marked NEXT, add a Timeline line for what got done, and write one Ledger line. Then tell me the one next step.\n\nThe list as it stands:\n"+jobsText;
    let copied=false; try{ await navigator.clipboard.writeText(msg); copied=true; }catch(e){}
    $('lUpdateNote').textContent=copied?'Copied. Opening AOTH HQ \u2014 tap the message box, paste, send.':'Could not copy on this device \u2014 open AOTH HQ and tell Lockup Sales which painting.';
    setTimeout(()=>{ window.open(HQ_URL,'_blank'); },copied?600:0); };
  $('log').classList.add('open'); try{window.scrollTo(0,0);}catch(e){}
}
