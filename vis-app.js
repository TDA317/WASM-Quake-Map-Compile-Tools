(function(){
  const fileInput = document.getElementById('file-input');
  const runBtn = document.getElementById('run');
  const log = document.getElementById('log-output');
  const status = document.getElementById('status');

  let worker = null;

  function appendLog(s){ log.textContent += s + '\n'; log.scrollTop = log.scrollHeight; }

  runBtn.addEventListener('click', async ()=>{
  const file = fileInput.files[0];
  const prtfile = document.getElementById('prt-input').files[0];
  if (!file) { appendLog('Select a BSP file first'); return; }
    status.textContent = 'starting';

    if (typeof(Worker) !== 'undefined') {
      try {
  // pass debug flag through worker message instead of changing the script path here
  worker = new Worker('vis-worker.js');
      } catch (e) { appendLog('Failed to start worker: '+e); return; }

      worker.onmessage = function(ev){
        const m = ev.data;
        if (m.type === 'inited') { appendLog('module inited'); status.textContent='inited'; }
        else if (m.type === 'log') appendLog(m.text);
        else if (m.type === 'err') appendLog('[err] '+m.text);
        else if (m.type === 'run-ack') appendLog('files: '+m.files.join(', '));
        else if (m.type === 'outputs') {
          appendLog('outputs: '+m.files.map(f=>f.name).join(', '));
          for (const f of m.files) {
            const blob = new Blob([f.buf]);
            const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = f.name; a.textContent = 'Download '+f.name; document.body.appendChild(a); document.body.appendChild(document.createElement('br'));
          }
        } else if (m.type === 'done') { appendLog('done'); status.textContent='done'; }
        else if (m.type === 'exception') appendLog('[exception] '+m.error);
      };

  // tell worker whether to attempt loading debug module
  const useDebug = document.getElementById('option-debug') && document.getElementById('option-debug').checked;
  worker.postMessage({type:'init', debug: !!useDebug});

      const ab = await file.arrayBuffer();
      // Normalize filename extension to lowercase so worker-side code treats .BSP/.bsp consistently
      const nameParts = file.name.split('.');
      let normalizedName = file.name;
      if (nameParts.length > 1) {
        const ext = nameParts.pop();
        normalizedName = nameParts.join('.') + '.' + ext.toLowerCase();
      }
      // Build args from UI controls
      const args = [];
      const threadsVal = document.getElementById('option-threads').value;
      if (threadsVal) { args.push('-threads'); args.push(threadsVal); }
      const levelVal = document.getElementById('option-level').value;
      if (levelVal) { args.push('-level'); args.push(levelVal); }
      if (document.getElementById('option-fast').checked) args.push('-fast');
      if (document.getElementById('option-v').checked) args.push('-v');
      if (document.getElementById('option-vv').checked) args.push('-vv');
      if (document.getElementById('option-credits').checked) args.push('-credits');
      if (document.getElementById('option-noambient').checked) args.push('-noambient');
      if (document.getElementById('option-noambientsky').checked) args.push('-noambientsky');
      if (document.getElementById('option-noambientwater').checked) args.push('-noambientwater');
      if (document.getElementById('option-noambientslime').checked) args.push('-noambientslime');
      if (document.getElementById('option-noambientlava').checked) args.push('-noambientlava');

  // final arg: input path in virtual FS (use normalized name)
  args.push(`/working/${normalizedName}`);

      if (prtfile) {
  const prtab = await prtfile.arrayBuffer();
  worker.postMessage({type:'run', bspName: normalizedName, bspBuffer: ab, prtName: prtfile.name, prtBuffer: prtab, args: args, debug: !!useDebug}, [ab, prtab]);
      } else {
  worker.postMessage({type:'run', bspName: normalizedName, bspBuffer: ab, args: args, debug: !!useDebug}, [ab]);
      }
      status.textContent = 'running';
    } else {
      appendLog('No web worker support');
    }
  });
})();
