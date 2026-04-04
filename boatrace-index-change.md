# index.html — add BOATRACE code to private viewing router

Find this line in the checkViewingCode() function in index.html:

  if (['SALTMARSH','COLLECTOR','PRIVATE','NEONMONK','AARON'].includes(code)) {

Add BOATRACE routing BEFORE that block:

  if (code === 'BOATRACE') {
    window.location.href = 'boatrace.html';
    return;
  }

Full updated block should look like:

  function checkViewingCode() {
    const code = document.getElementById('viewing-code').value.trim().toUpperCase();
    if (code === 'CRAIG') { window.location.href = 'craig.html'; return; }
    if (code === 'FAYE') { window.location.href = 'faye.html'; return; }
    if (code === 'BOATRACE') { window.location.href = 'boatrace.html'; return; }
    if (['CROWBOROUGH','CAROLECBGC','JOHNCBGC','DIANE'].includes(code)) { window.location.href = 'crowborough.html'; return; }
    if (['SALTMARSH','COLLECTOR','PRIVATE','NEONMONK','AARON'].includes(code)) { window.location.href = 'private.html'; return; }
    // invalid code
    const inp = document.getElementById('viewing-code');
    inp.style.borderColor = 'rgba(200,80,80,0.6)';
    setTimeout(() => inp.style.borderColor = '', 1600);
  }
