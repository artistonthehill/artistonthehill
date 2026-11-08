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
function hasPin(r){ return r.f[F.lat]!=null&&r.f[F.lng]!=null&&r.f[F.lat]!==''&&r.f[F.lng]!==''; }
function drawMap(){
  if(!MAP) return; LAYER.clearLayers(); const drawer=$('drawer'); drawer.innerHTML='';
  if(MODE==='painted'){
    const groups={}; live().forEach(r=>{ const g=regionOf(r)||(hasPin(r)?'':'Studio'); if(!g) return; (groups[g]=groups[g]||[]).push(r); });
    const unplaced=live().filter(r=>!regionOf(r)&&hasPin(r));
    Object.keys(groups).forEach(g=>{
      const rows=groups[g]; let lat,lng;
      if(g==='Studio'){ [lat,lng]=STUDIO; }
      else { const p=rows.filter(hasPin); if(!p.length) return; lat=p.reduce((s,r)=>s+ +r.f[F.lat],0)/p.length; lng=p.reduce((s,r)=>s+ +r.f[F.lng],0)/p.length; }
      pin(lat,lng,g,rows.length,g==='Studio'?'studio':'',()=>openSheet({kind:'region',key:g}));
    });
    if(unplaced.length) drawer.innerHTML=`<button class="drow" id="unplacedBtn"><span>${unplaced.length} pinned but not yet on a region</span><span class="n">›</span></button>`,
      $('unplacedBtn').onclick=()=>openSheet({kind:'unplaced'});
  } else {
    const byPlace={}; live().forEach(r=>{ const p=placeOf(r); if(p) (byPlace[p]=byPlace[p]||[]).push(r); });
    const rowsHtml=[];
    PLACESL.forEach(p=>{ if(p.f[P.active]===false) return; const kind=selName(p.f[P.kind]); if(kind==='Collector') return; const n=(byPlace[p.id]||[]).length;
      if(p.f[P.lat]!=null&&p.f[P.lng]!=null&&kind!=='Collector'&&kind!=='Tony') pin(+p.f[P.lat],+p.f[P.lng],p.f[P.name],n,'place',()=>openSheet({kind:'place',key:p.id}));
      else rowsHtml.push(`<button class="drow" data-p="${p.id}"><span>${esc(p.f[P.name])}</span><span class="n">${n}${(kind!=='Collector'&&kind!=='Tony')?' · <em>no pin yet</em>':''} ›</span></button>`); });
    const nowhere=live().filter(r=>!placeOf(r)).length;
    if(nowhere) rowsHtml.push(`<button class="drow" data-p="__none"><span>Nowhere recorded</span><span class="n">${nowhere} ›</span></button>`);
    drawer.innerHTML=rowsHtml.join('');
    drawer.querySelectorAll('.drow').forEach(b=>b.onclick=()=>{ const id=b.dataset.p; openSheet(id==='__none'?{kind:'nowhere'}:{kind:'place',key:id}); });
  }
  const sold=SPINE.filter(gone).length;
  if(sold){ drawer.insertAdjacentHTML('beforeend',`<button class="drow sold" id="soldBox"><span>Sold and gone</span><span class="n">${sold} ›</span></button>`); $('soldBox').onclick=()=>openSheet({kind:'sold'}); }
  $('modePainted').classList.toggle('on',MODE==='painted'); $('modeNow').classList.toggle('on',MODE==='now');
  $('newBtn').textContent=MODE==='now'?'+':'+'; $('newBtn').title=MODE==='now'?'New card or new place':'New card';
}
function setMode(m){ MODE=m; drawMap(); }
function fabTap(){
  if(MODE==='now'){ $('fabMenu').classList.toggle('open'); return; }
  PRESET={}; openCard(null);
}

// ---------- the sheet behind a pin ----------
function sheetRows(s){
  if(s.kind==='sold') return SPINE.filter(gone);
  if(s.kind==='all') return live();
  if(s.kind==='region') return live().filter(r=>(regionOf(r)||(hasPin(r)?'':'Studio'))===s.key);
  if(s.kind==='unplaced') return live().filter(r=>!regionOf(r)&&hasPin(r));
  if(s.kind==='place') return live().filter(r=>placeOf(r)===s.key);
  if(s.kind==='nowhere') return live().filter(r=>!placeOf(r));
  return [];
}
function sheetTitle(s){
  if(s.kind==='sold') return 'Sold and gone'; if(s.kind==='all') return 'All paintings'; if(s.kind==='region') return s.key; if(s.kind==='unplaced') return 'Pinned, no region yet';
  if(s.kind==='place') return placeName(s.key)||'Place'; if(s.kind==='nowhere') return 'Nowhere recorded'; return '';
}
function openSheet(s){ SHEET=s; $('sheet').classList.add('open'); refreshSheet(); try{window.scrollTo(0,0);}catch(e){} }
function refreshSheet(){
  if(!SHEET||!$('sheet').classList.contains('open')) return;
  const rows=sheetRows(SHEET); const t=sheetTitle(SHEET);
  $('sNew').style.display=SHEET.kind==='sold'?'none':'inline-block'; $('sList').style.display=SHEET.kind==='sold'?'block':'none'; $('sGrid').style.display=SHEET.kind==='sold'?'none':'grid';
  let noPic=0;
  if(SHEET.kind==='sold'){ $('sTray').innerHTML=''; $('sTrayWrap').style.display='none';
    $('sList').innerHTML=rows.map(r=>`<button class="lrow" data-id="${r.id}"><span class="lt">${esc(r.f[F.title]||'(untitled)')}</span><span class="ls">${esc(String(r.f[F.size]||'').split('·')[0].trim())}${placeOf(r)?' · '+esc(placeName(placeOf(r))):''}${selName(r.f[F.stage])?' · '+esc(selName(r.f[F.stage])):''}</span></button>`).join('')||'<div class="note">Nothing sold yet.</div>';
    $('sList').querySelectorAll('.lrow').forEach(bt=>bt.onclick=()=>{ const r=SPINE.find(x=>x.id===bt.dataset.id); if(r) openCard(r); }); }
  else ({noPic}=renderGrid(rows,$('sGrid'),$('sTray')));
  $('sTitle').textContent=t; $('sCount').textContent=rows.length+(rows.length===1?' painting':' paintings')+(noPic?' · '+noPic+' without a picture':'');
  const p=SHEET.kind==='place'?PLACESL.find(x=>x.id===SHEET.key):null;
  $('sPlaceTools').style.display=p?'flex':'none';
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
    if(!regionOf(r)){ const g=regionFor(r.f[F.lat],r.f[F.lng],r.f[F.collection]); regUpd.push({id:r.id,fields:{[F.region]:g.region}}); if(!g.sure) unsure.push((r.f[F.title]||r.f[F.slug]||'?')+' → '+g.region); }
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
  $('modePainted').onclick=()=>setMode('painted'); $('modeNow').onclick=()=>setMode('now');
  $('sBack').onclick=()=>{ $('sheet').classList.remove('open'); SHEET=null; };
  $('sNew').onclick=sheetNew; $('sPinHere').onclick=pinPlaceHere; $('sPinPaste').onclick=pinPlacePaste;
  $('fabCard').onclick=()=>{ $('fabMenu').classList.remove('open'); PRESET={}; openCard(null); };
  $('fabPlace').onclick=openPlaceSheet;
  $('pBack').onclick=closePlaceSheet; $('pSave').onclick=()=>savePlace(false); $('pHere').onclick=()=>savePlace(true);
  $('worldBtn').onclick=()=>{ const pts=[]; LAYER.eachLayer(m=>pts.push(m.getLatLng())); if(pts.length>1) MAP.fitBounds(L.latLngBounds(pts).pad(0.2)); };
  $('ukBtn').onclick=()=>MAP.fitBounds(UK_BOUNDS);
  showUnsure();
});
