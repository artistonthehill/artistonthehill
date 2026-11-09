/* Window — Part B: the screens. Home grid, the card, the steps, Replace picture, the thumbnail sweep, keys. */
'use strict';
let cur=null;            // the card on screen
let PRESET={};           // region/place a sheet hands to a new card
let lastPull=0;

// ---------- a grid of picture tiles (used by the sheets) ----------
function renderGrid(rows,g,tray){
  g.innerHTML=''; tray.innerHTML=''; let withPic=0, noPic=0;
  rows.forEach(r=>{
    const src=tileSrc(r), title=r.f[F.title]||'(untitled)';
    if(src){ withPic++;
      const b=document.createElement('button'); b.className='tile'+(r.f[F.publish]?' live':'')+(r.f[F.sold]?' sold':'');
      b.innerHTML=`<img loading="lazy" src="${esc(src)}" alt=""><div class="t">${esc(title)}</div>`;
      // a file the site hasn't served yet: say so and keep trying for six minutes before calling it missing
      const im=b.querySelector('img'); let tries=0;
      im.onerror=function(){ if(src.startsWith('data:')) return;
        if(tries<18){ tries++; if(tries===1){ this.style.display='none'; b.querySelector('.t').insertAdjacentHTML('afterbegin','<span class="warn fx">on its way to the site… </span>'); }
          setTimeout(()=>{ this.src=src+'?r='+Date.now(); },20000); }
        else { const x=b.querySelector('.fx'); if(x) x.textContent='picture missing · '; } };
      im.onload=function(){ this.style.display='block'; const x=b.querySelector('.fx'); if(x) x.remove(); };
      b.onclick=()=>openCard(r); g.appendChild(b);
    } else { noPic++;
      const d=document.createElement('div'); d.className='row';
      d.innerHTML=`<span>${esc(title)}</span><button class="btn sec sm">Add picture</button>`;
      d.querySelector('button').onclick=()=>openCard(r); tray.appendChild(d);
    }
  });
  tray.parentElement.style.display=noPic?'block':'none';
  return {withPic,noPic};
}
function renderHome(){
  const noPic=live().filter(r=>!tileSrc(r)).length;
  const when=lastPull?new Date(lastPull).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}):'';
  const sold=SPINE.filter(gone).length;
  $('status').innerHTML=SPINE.length?`${SPINE.length-sold} on the walls · ${sold} sold${when?' · spine '+when:' · <span class="warn">offline copy</span>'}${noPic?' · '+noPic+' without a picture':''}`:'No cards loaded yet.';
  if(typeof drawMap==='function') drawMap();
  if(typeof refreshSheet==='function') refreshSheet();
}
async function refresh(quiet){
  if(!K.at){ openKeys(); return; }
  try{ $('status').innerHTML='<span class="spin"></span> Reading the spine…'; await Promise.all([pullSpine(),pullPlaces()]); lastPull=Date.now(); renderHome(); if(!quiet) toast('Spine read: '+SPINE.length+' cards');
    if(typeof backfill==='function') backfill(); }
  catch(e){ renderHome(); $('status').innerHTML='<span class="bad">'+esc(e.message)+'</span>'+(SPINE.length?' · showing the last copy':''); }
}

// ---------- the card ----------
function blank(){ return {id:null,slug:'',pics:null,picSrc:'',title:'',lat:'',lng:'',chip:'',w:'',h:'',medium:MEDIA[0],pchip:'',price:'',live:false,sold:false,loc:'',notes:'',region:'',place:'',row:null}; }
function openCard(r){
  cur=blank();
  if(r){ const f=r.f; cur.id=r.id; cur.row=r; cur.slug=f[F.slug]||''; cur.picSrc=cardSrc(r); cur.title=f[F.title]||'';
    cur.lat=f[F.lat]==null?'':f[F.lat]; cur.lng=f[F.lng]==null?'':f[F.lng];
    const s=parseSize(f[F.size]); cur.chip=s.chip; cur.w=s.w; cur.h=s.h; cur.medium=s.medium;
    const p=f[F.price]; if(p!=null&&p!==''){ cur.price=String(Math.round(p)); cur.pchip=PRICES.indexOf(cur.price)>=0?cur.price:'Custom'; }
    cur.live=!!f[F.publish]; cur.sold=!!f[F.sold]; cur.loc=f[F.loc]||''; cur.notes=f[F.notes]||''; cur.region=regionOf(r); cur.place=placeOf(r); }
  else { if(PRESET.region) cur.region=PRESET.region; if(PRESET.place) cur.place=PRESET.place; const wt=PLACESL.find(p=>selName(p.f[P.kind])==='Tony'); if(!cur.place&&wt) cur.place=wt.id; }
  $('cardTitle').textContent=r?(cur.title||'Card'):'New card'; $('cardSub').textContent=r?(cur.slug||''):'';
  $('steps').style.display='none'; $('steps').innerHTML='';
  drawPic(); drawForm(); $('card').classList.add('open'); try{window.scrollTo(0,0);}catch(e){}
}
function drawPic(){
  const has=cur.pics||cur.picSrc; $('camPrompt').style.display=has?'none':'block';
  const im=$('picImg'); im.style.display=has?'block':'none'; im.src=cur.pics?cur.pics.web.dataURL:(cur.picSrc||'');
  $('repBtn').style.display=has?'block':'none'; $('picFile').style.pointerEvents=has?'none':'auto';
  im.onerror=()=>{ if(!cur||!cur.picSrc||cur.picSrc.startsWith('data:')) return;
    const th=cur.row&&cur.row.f[F.thumb]; if(th&&cur.picSrc!==th){ cur.picSrc=th; drawPic(); return; }   // big one not served yet: show the small one
    if(cur.row&&isFresh(cur.row)) return;                                                                    // just uploaded: leave it, it will come
    cur.picSrc=''; drawPic(); $('camPrompt').insertAdjacentHTML('beforeend','<div class="warn">The picture on the card is missing from the site — add one.</div>'); };
  $('form').style.display=has?'block':'none';
}
function drawForm(){
  $('fTitle').value=cur.title; $('fLat').value=cur.lat; $('fLng').value=cur.lng; $('fPin').value=(cur.lat!==''&&cur.lng!=='')?(cur.lat+', '+cur.lng):''; pinNote();
  chips($('sizeChips'),SIZES,cur.chip,v=>{cur.chip=v; if(PRICE_FOR[v]&&!cur.price){cur.pchip=PRICE_FOR[v];cur.price=PRICE_FOR[v];} drawForm();},v=>v==='Custom'?'Custom…':v);
  $('customSize').style.display=cur.chip==='Custom'?'grid':'none'; $('fW').value=cur.w; $('fH').value=cur.h;
  chips($('mediumChips'),MEDIA,cur.medium,v=>{cur.medium=v;drawForm();},v=>v.replace('Oil on ',''));
  chips($('priceChips'),PRICES,cur.pchip,v=>{cur.pchip=v; cur.price=v==='Custom'?(PRICES.indexOf(cur.price)>=0?'':cur.price):v; drawForm();},v=>v==='Custom'?'Custom…':money(v));
  $('fPrice').style.display=cur.pchip==='Custom'?'block':'none'; $('fPrice').value=cur.pchip==='Custom'?cur.price:'';
  // region: the ones in use, plus a suggestion from the pin, plus Other…
  const sug=(!cur.id&&!cur.region&&cur.lat!==''&&cur.lng!=='')?regionFor(cur.lat,cur.lng,null).region:'';
  if(sug&&!cur.region&&sug!=='England'&&sug!=='Elsewhere') cur.region=sug;
  const regs=regionsInUse(); if(cur.region&&regs.indexOf(cur.region)<0) regs.unshift(cur.region); regs.push('Other');
  chips($('regionChips'),regs,cur.region,v=>{ if(v==='Other'){ $('fRegion').style.display='block'; $('fRegion').focus(); return; } cur.region=v; $('fRegion').style.display='none'; drawForm(); },v=>v==='Other'?'Other…':v);
  const pl=PLACESL.filter(p=>p.f[P.active]!==false); chips($('placeChips'),pl.map(p=>p.id),cur.place,v=>{cur.place=v;drawForm();},id=>placeName(id));
  $('liveTog').classList.toggle('on',cur.live); $('liveK').textContent=cur.live?'Live on the website':'Not public';
  $('liveS').textContent=cur.live?'On the public website — it follows within two minutes of saving':'Only you can see this card';
  $('soldTog').classList.toggle('on',cur.sold); $('fNotes').value=cur.notes;
  const st=cur.row?selName(cur.row.f[F.stage]):''; const past=['Sold','Delivered','Registered'].indexOf(st)>=0;
  $('soldS').textContent=cur.sold?(past?('Stage '+st+' — stays as the office set it'):'Stage moves to Sold when you save; Books takes it from there'):'Marks it sold on the spine — the office does the rest';
  $('stageNote').textContent=cur.row?('Stage: '+((cur.row.f[F.stage]||{}).name||cur.row.f[F.stage]||'—')+' (the office moves this)'):'Stage will be Carded';
  drawDelete();
  saveState();
}
function chips(el,list,on,set,label){
  el.innerHTML=''; list.forEach(v=>{ const b=document.createElement('button'); b.type='button'; b.className='chip'+(on===v?' on':''); b.textContent=label?label(v):v; b.onclick=()=>set(v); el.appendChild(b); });
}
// one box for the pin: a "lat, lng" pair or a Maps link; the two numbers live in hidden fields
let resolving=0;
function setPin(text){
  if(isShortMapLink(text)){ const my=++resolving; $('pinNote').innerHTML='<span class="spin"></span> Following the Maps link…';
    resolveShortLink(text).then(ll=>{ if(my!==resolving) return; $('fPin').value=ll[0]+', '+ll[1]; setPin($('fPin').value); saveState(); toast('Pin read from the link'); })
      .catch(e=>{ if(my!==resolving) return; cur.lat=''; cur.lng=''; $('fLat').value=''; $('fLng').value=''; $('pinNote').innerHTML='<span class="warn">Could not read that link ('+esc(e.message)+'). In Google Maps, long-press the spot and copy the numbers shown instead.</span>'; saveState(); });
    return; }
  const ll=parseLatLng(text); if(ll){ cur.lat=String(ll[0]); cur.lng=String(ll[1]); $('fLat').value=cur.lat; $('fLng').value=cur.lng; if(/^https?:/i.test(text.trim())) $('fPin').value=cur.lat+', '+cur.lng; }
  else { cur.lat=''; cur.lng=''; $('fLat').value=''; $('fLng').value=''; }   // empty or unreadable: no pin until it reads
  pinNote(); }
function pinNote(){
  const la=parseFloat($('fLat').value), ln=parseFloat($('fLng').value); const n=$('pinNote');
  if(isNaN(la)||isNaN(ln)) n.textContent=$('fPin').value.trim()?'Can\'t read that yet — it wants two numbers like 50.088361, -5.101278':'No pin yet — fine for a studio piece, needed for the map.';
  else if(Math.abs(la-STUDIO[0])<1e-6&&Math.abs(ln-STUDIO[1])<1e-6) n.textContent='Studio — the sea pin off Brighton.';
  else n.innerHTML='Pinned at '+la.toFixed(5)+', '+ln.toFixed(5)+((la>49&&la<61&&ln>1.8&&ln<9)?' <span class="warn">— that is east of Britain; lost a minus sign? Tap to flip</span>':'');
  if(n.querySelector('.warn')){ n.querySelector('.warn').onclick=()=>{ $('fPin').value=la+', '+(-ln).toFixed(6); setPin($('fPin').value); saveState(); }; }
}
function missing(){
  const m=[]; if(!(cur.pics||cur.picSrc)) m.push('a picture'); if(!String(cur.title||'').trim()) m.push('a title');
  if(!cur.chip||(cur.chip==='Custom'&&!( +cur.w>0 && +cur.h>0))) m.push('a size');
  if(!(+cur.price>0)) m.push('a price');
  return m;
}
function saveState(){
  const m=missing(); const b=$('saveBtn'); b.disabled=m.length>0;
  b.textContent=m.length?('Needs '+m.join(', ')):(cur.id?'Save changes':'Save to the spine');
}
function gather(){
  cur.title=String(cur.title||'').trim(); cur.lat=String(cur.lat||'').trim(); cur.lng=String(cur.lng||'').trim(); cur.loc=String(cur.loc||'').trim();
  const f={}; f[F.title]=cur.title; f[F.size]=sizeText(cur.chip,cur.w,cur.h,cur.medium);
  f[F.price]=+cur.price; f[F.priceDisp]=cur.sold?'Sold':money(cur.price); f[F.publish]=cur.live; f[F.sold]=cur.sold;
  // the relay: Tony moves cards to Sold; never backwards from here
  if(cur.sold&&cur.id){ const st=selName(cur.row.f[F.stage]); if(['Sold','Delivered','Registered'].indexOf(st)<0) f[F.stage]='Sold'; }
  if(cur.lat!==''&&cur.lng!==''&&!isNaN(+cur.lat)&&!isNaN(+cur.lng)){ f[F.lat]=+cur.lat; f[F.lng]=+cur.lng; }
  if(!cur.region) cur.region=(cur.lat!==''&&cur.lng!=='')?regionFor(cur.lat,cur.lng,null).region:'Studio';
  f[F.region]=cur.region;
  if(cur.place){ f[F.nowAt]=[cur.place]; f[F.loc]=placeName(cur.place); } else if(!cur.id) f[F.loc]='With Tony';
  if(cur.notes||cur.id) f[F.notes]=cur.notes;
  return f;
}

// ---------- the steps (picture → repo → card) ----------
function showSteps(names){ const s=$('steps'); s.style.display='block'; s.innerHTML=names.map((n,i)=>`<div class="step" id="st${i}"><span class="i">○</span><span>${esc(n)}</span></div>`).join(''); }
function mark(i,state,extra){ const el=$('st'+i); if(!el) return; el.className='step '+state; el.querySelector('.i').innerHTML=state==='doing'?'<span class="spin"></span>':state==='done'?'✓':state==='fail'?'✕':'○'; if(extra){ let x=el.querySelector('.x'); if(!x){x=document.createElement('span');x.className='x note';el.appendChild(x);} x.textContent=extra; } }
async function runSteps(steps,fromIdx){
  // steps: [{name, fn}] — stops at the first failure and offers Retry from there; the card is never half-written
  for(let i=fromIdx||0;i<steps.length;i++){
    mark(i,'doing');
    try{ const r=await steps[i].fn(); mark(i,'done',r||''); }
    catch(e){ mark(i,'fail',plain(e)); const el=$('st'+i); const b=document.createElement('button'); b.className='btn sec sm'; b.textContent='Retry'; b.style.marginLeft='auto';
      b.onclick=()=>{ b.remove(); runSteps(steps,i); }; el.appendChild(b); $('saveBtn').disabled=false; return false; }
  }
  return true;
}
async function save(){
  const f=gather(); const m=missing(); if(m.length){ saveState(); return; }
  $('saveBtn').disabled=true; $('saveNote').textContent='';
  const isNew=!cur.id; const slug=cur.slug||newSlug(cur.title,takenSlugs()); cur.slug=slug; if(!isNew&&cur.row&&cur.row.f[F.slug]!==slug) f[F.slug]=slug;
  const names=[]; const steps=[];
  if(cur.pics){
    const ip=(cur.row&&cur.row.f[F.img])||imgPath(slug), tp=cur.row?thumbPath(cur.row):thumbPath(slug);
    names.push('Uploading web picture ('+Math.round(cur.pics.web.bytes/1024)+' KB)'); steps.push({fn:async()=>{ await ghPut(ip,cur.pics.web.b64,'Window: '+ip); f[F.img]=ip; return cur.pics.web.w+'×'+cur.pics.web.h; }});
    names.push('Uploading thumbnail ('+Math.round(cur.pics.thumb.bytes/1024)+' KB)'); steps.push({fn:async()=>{ await ghPut(tp,cur.pics.thumb.b64,'Window: '+tp); f[F.thumb]=tp; return cur.pics.thumb.w+'×'+cur.pics.thumb.h; }});
  }
  names.push(isNew?'Writing the card':'Updating the card'); steps.push({fn:async()=>{
    if(isNew){ f[F.slug]=slug; f[F.stage]=cur.sold?'Sold':'Carded'; if(!f[F.lat]){ /* no pin: nothing written */ } const rec=await createCard(f); cur.id=rec.id; cur.row={id:rec.id,created:rec.createdTime||new Date().toISOString(),f:rec.fields||f}; SPINE.unshift(cur.row); }
    else { const rec=await patchCard(cur.id,f); cur.row.f=Object.assign({},cur.row.f,rec.fields||f); }
    cacheSpine(); return ''; }});
  names.push('In the spine'); steps.push({fn:async()=>{ const t=new Date().toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}); return '✓ '+t; }});
  // the website: republish when Live changes, or when a Live card changes anything the site shows
  const before=cur.row?Object.assign({},cur.row.f):{}; const wasLive=!!before[F.publish];
  const siteChange=()=>{ if(cur.live!==wasLive) return true; if(!cur.live) return false; return SITE_FIELDS.some(k=>JSON.stringify(before[k]===undefined?null:before[k])!==JSON.stringify(f[k]===undefined?(before[k]===undefined?null:before[k]):f[k])); };
  const hasPin=f[F.lat]!=null||(before[F.lat]!=null&&f[F.lat]===undefined);
  if(cur.live&&!hasPin){ names.push('Website'); steps.push({fn:async()=>'held back — no pin yet; paste one and save again'}); }
  else if(siteChange()){
    names.push(cur.live?'Asking the website to republish':'Asking the website to take it down'); steps.push({fn:async()=>{ await ghPublish(); return 'started'; }});
    if(cur.live){ names.push('On the public map'); steps.push({fn:async()=>{ for(let i=0;i<14;i++){ await new Promise(r=>setTimeout(r,15000)); const s=await onSite(slug); if(s) return '✓ live'; } return 'taking longer than usual — check the map in a few minutes'; }}); }
  }
  showSteps(names);
  const ok=await runSteps(steps,0);
  if(ok){ if(cur.pics) remember(slug,cur.pics); cur.pics=null; cur.picSrc=cardSrc(cur.row); $('cardTitle').textContent=cur.title; $('cardSub').textContent=slug; drawPic(); renderHome(); toast(isNew?'Card made — in the spine':'Card updated'); $('saveBtn').disabled=false; saveState(); }
}
// a new picture for an existing card: same two paths, overwritten; nothing else on the card changes
async function replacePicture(file){
  $('saveNote').textContent=''; let pics;
  showSteps(['Making the two pictures','Uploading web picture','Uploading thumbnail','Pointing the card at them']);
  const upd={};
  if(!cur.slug){ cur.slug=newSlug(cur.title||cur.row.f[F.title],takenSlugs()); cur.row.f[F.slug]=cur.slug; upd[F.slug]=cur.slug; }   // older cards had no web name — mint one, never save under an empty name
  const ip=(cur.row&&cur.row.f[F.img])||imgPath(cur.slug), tp=thumbPath(cur.row);
  const ok=await runSteps([
    {fn:async()=>{ pics=await makePictures(file); cur.pics=pics; drawPic(); return pics.web.w+'×'+pics.web.h+' and '+pics.thumb.w+'×'+pics.thumb.h; }},
    {fn:async()=>{ await ghPut(ip,pics.web.b64,'Window: replace '+ip); return Math.round(pics.web.bytes/1024)+' KB'; }},
    {fn:async()=>{ await ghPut(tp,pics.thumb.b64,'Window: replace '+tp); return Math.round(pics.thumb.bytes/1024)+' KB'; }},
    {fn:async()=>{ if(cur.row.f[F.img]!==ip) upd[F.img]=ip; if(cur.row.f[F.thumb]!==tp) upd[F.thumb]=tp;
      if(Object.keys(upd).length){ const rec=await patchCard(cur.id,upd); cur.row.f=Object.assign({},cur.row.f,rec.fields||upd); cacheSpine(); return 'card updated'; } return 'paths unchanged — the site picks the new files up on its next publish'; }}
  ],0);
  if(ok){ remember(cur.slug,pics); cur.pics=null; cur.picSrc=cardSrc(cur.row); drawPic(); renderHome(); toast('Picture replaced'); }
}
// delete: two taps, no pop-up; refused when anyone real is attached
let delArmed=0;
function attached(r){ const n=k=>Array.isArray(r.f[k])?r.f[k].length:0; const parts=[]; if(n(F.interest)) parts.push(n(F.interest)+' on the Interest list'); if(n(F.invoices)) parts.push(n(F.invoices)+' invoice'+(n(F.invoices)>1?'s':'')); if(n(F.plans)) parts.push('a payment plan'); if(n(F.dispatch)) parts.push('a dispatch job'); return parts; }
function drawDelete(){ const b=$('delBtn'); if(!cur||!cur.id){ b.style.display='none'; return; } b.style.display='block';
  const att=attached(cur.row); const live=!!cur.row.f[F.publish];
  if(att.length){ b.disabled=true; b.textContent='Can\'t delete — '+att.join(', ')+' attached. Ask Desk.'; return; }
  b.disabled=false; b.textContent=delArmed&&Date.now()-delArmed<6000?('Tap again to delete'+(live?' and take it off the website':'')+' — this cannot be undone'):'Delete this card'; }
async function delTap(){
  if(!cur||!cur.id||attached(cur.row).length) return;
  if(!(delArmed&&Date.now()-delArmed<6000)){ delArmed=Date.now(); drawDelete(); setTimeout(()=>{ if(delArmed) { delArmed=0; drawDelete(); } },6000); return; }
  delArmed=0; drawDelete(); $('delBtn').disabled=true;
  const r=cur.row, live=!!r.f[F.publish], img=r.f[F.img], th=r.f[F.thumb]||(img?thumbPath(r):''), room=r.f[F.slug]?r.f[F.slug]+'.json':'';
  const names=['Removing the card from the spine'], steps=[{fn:async()=>{ await deleteCard(cur.id); SPINE=SPINE.filter(x=>x.id!==cur.id); cacheSpine(); return 'gone'; }}];
  if(img){ names.push('Removing its pictures from the site'); steps.push({fn:async()=>{ let n=0; for(const p of [img,th]) if(p&&await ghDelete(p,'Window: delete '+p)) n++; if(room&&await ghDelete(room,'Window: delete room '+room)) n++; return n+' file'+(n===1?'':'s'); }}); }
  if(live){ names.push('Asking the website to take it down'); steps.push({fn:async()=>{ await ghPublish(); return 'started'; }}); }
  showSteps(names); const ok=await runSteps(steps,0);
  if(ok){ toast('Deleted'); renderHome(); setTimeout(()=>{ $('card').classList.remove('open'); cur=null; },900); }
}
async function onFile(file){
  if(!file) return;
  if(cur.id){ await replacePicture(file); return; }
  showSteps(['Making the two pictures']);
  const ok=await runSteps([{fn:async()=>{ cur.pics=await makePictures(file); return cur.pics.web.w+'×'+cur.pics.web.h+' web · '+cur.pics.thumb.w+'×'+cur.pics.thumb.h+' thumb'; }}],0);
  if(ok){ drawPic(); drawForm(); setTimeout(()=>$('fTitle').focus(),50); }
}

// ---------- the one-off: thumbnails for the catalogue, from the web pictures already on the site ----------
let sweeping=false;
async function sweep(){
  if(sweeping){ sweeping=false; $('sweepBtn').textContent='Stopping…'; return; }
  if(!K.gh||!K.at){ toast('Both keys are needed first'); return; }
  const todo=SPINE.filter(r=>r.f[F.img]&&!r.f[F.thumb]&&r.f[F.slug]);
  if(!todo.length){ $('sweepProg').textContent='Every card with a picture already has a thumbnail.'; return; }
  sweeping=true; $('sweepBtn').textContent='Stop'; let done=0, failed=[];
  for(const r of todo){ if(!sweeping) break;
    const slug=r.f[F.slug]; $('sweepProg').innerHTML=`<span class="spin"></span> ${done+1} of ${todo.length} — ${esc(r.f[F.title]||slug)}`;
    try{ const res=await fetch(r.f[F.img]+'?t='+Date.now()); if(!res.ok) throw new Error('web picture missing on the site ('+res.status+')');
      const blob=await res.blob(); const im=await loadImage(blob); const th=toJpeg(im,THUMB_PX,THUMB_Q); if(im.close) im.close();
      const tp=thumbPath(r); await ghPut(tp,th.b64,'Window: thumbnail '+tp); const rec=await patchCard(r.id,{[F.thumb]:tp}); r.f=Object.assign({},r.f,rec.fields||{[F.thumb]:tp}); done++; cacheSpine(); }
    catch(e){ failed.push((r.f[F.title]||slug)+': '+e.message); }
  }
  sweeping=false; $('sweepBtn').textContent='Make missing thumbnails';
  $('sweepProg').innerHTML=`${done} made${failed.length?` · <span class="bad">${failed.length} failed</span><br>${failed.map(esc).join('<br>')}`:''}${todo.length-done-failed.length>0?' · stopped with '+(todo.length-done-failed.length)+' to go':''}`;
  renderHome();
}

// ---------- keys ----------
function openKeys(){ $('kAt').value=K.at; $('kGh').value=K.gh; $('spineNote').textContent=SPINE.length?SPINE.length+' cards in the phone\'s copy':'Nothing loaded yet'; $('keys').classList.add('open'); }

// ---------- wiring ----------
window.addEventListener('DOMContentLoaded',()=>{
  $('ver').textContent=VER;
  $('newBtn').onclick=()=>{ if(typeof fabTap==='function') fabTap(); else { PRESET={}; openCard(null); } };
  $('cardBack').onclick=()=>{ $('card').classList.remove('open'); cur=null; PRESET={}; };
  $('allBtn').onclick=()=>openSheet({kind:'all'});
  $('keysBtn').onclick=openKeys; $('keysBack').onclick=()=>$('keys').classList.remove('open');
  $('kSave').onclick=()=>{ K.set($('kAt').value,$('kGh').value); toast('Keys saved on this phone'); $('keys').classList.remove('open'); refresh(); };
  $('reloadBtn').onclick=()=>{ $('keys').classList.remove('open'); refresh(); };
  $('sweepBtn').onclick=sweep;
  $('picFile').onchange=e=>onFile(e.target.files[0]);
  $('repBtn').onclick=()=>$('picFile').click();
  // every box writes straight into the card as it is typed, so redrawing the chips never loses a word
  const bind={fTitle:'title',fPin:'pin',fW:'w',fH:'h',fPrice:'price',fNotes:'notes',fRegion:'region'};
  Object.keys(bind).forEach(id=>$(id).addEventListener('input',()=>{ if(!cur) return;
    if(id==='fPin'){ setPin($('fPin').value); }
    else cur[bind[id]]=id==='fPrice'?$(id).value.replace(/[^0-9.]/g,''):(id==='fRegion'?$(id).value.trim():$(id).value);
    saveState(); }));
  $('pasteBtn').onclick=async()=>{ try{ const t=await navigator.clipboard.readText(); if(isShortMapLink(t)){ $('fPin').value=t.trim(); setPin(t); return; } const ll=parseLatLng(t); if(!ll) throw 0; $('fPin').value=ll[0]+', '+ll[1]; setPin($('fPin').value); saveState(); toast('Pin pasted'); }
    catch(e){ toast('Paste into the pin box instead'); $('fPin').focus(); } };
  $('hereBtn').onclick=()=>{ if(!navigator.geolocation){ toast('No location on this device'); return; } $('pinNote').innerHTML='<span class="spin"></span> Finding you…';
    navigator.geolocation.getCurrentPosition(p=>{ $('fPin').value=p.coords.latitude.toFixed(6)+', '+p.coords.longitude.toFixed(6); setPin($('fPin').value); saveState(); },()=>{ $('pinNote').textContent='Location not allowed — paste from Maps instead.'; },{enableHighAccuracy:true,timeout:12000}); };
  $('studioBtn').onclick=()=>{ $('fPin').value=STUDIO[0]+', '+STUDIO[1]; setPin($('fPin').value); saveState(); };
  $('liveTog').onclick=()=>{ cur.live=!cur.live; drawForm(); };
  $('soldTog').onclick=()=>{ cur.sold=!cur.sold;
    if(cur.sold){ const wt=PLACESL.find(p=>selName(p.f[P.kind])==='Tony'), col=PLACESL.find(p=>selName(p.f[P.kind])==='Collector');
      if(col&&(!cur.place||(wt&&cur.place===wt.id))) cur.place=col.id; }
    drawForm(); };
  $('saveBtn').onclick=save; $('delBtn').onclick=delTap;
  loadFresh(); loadPlacesCache(); lastPull=loadCache(); if(typeof initMap==='function') initMap(); renderHome();
  if(K.at) refresh(true); else openKeys();
});
