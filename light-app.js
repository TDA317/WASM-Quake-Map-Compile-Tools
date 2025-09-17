// light-app.js - front-end for running `light` in the browser
var Module = Module || {};
Module.print = Module.print || function(text) { try { const lo = document.getElementById('log-output'); if (lo) { lo.textContent += text + '\n'; lo.scrollTop = lo.scrollHeight; } else console.log(text); } catch(e){ console.log(text); } };
Module.printErr = Module.printErr || function(text) { try { const lo = document.getElementById('log-output'); if (lo) { lo.textContent += 'ERROR: ' + text + '\n'; lo.scrollTop = lo.scrollHeight; } else console.error(text); } catch(e){ console.error(text);} };

var lightWorker = null;
var workerReady = false;
(function() {
    try {
        lightWorker = new Worker('light-worker.js');
        lightWorker.onmessage = function(ev) {
            const m = ev.data;
            if (m.type === 'inited') {
                workerReady = true;
                Module.print('light worker inited');
            } else if (m.type === 'log') {
                Module.print(m.text);
            } else if (m.type === 'err') {
                Module.printErr(m.text);
            } else if (m.type === 'outputs') {
                const container = document.getElementById('download-container');
                if (container) {
                    for (const f of m.files) {
                        try {
                            const blob = new Blob([f.buf], { type: 'application/octet-stream' });
                            const url = URL.createObjectURL(blob);
                            const link = document.createElement('a');
                            link.href = url;
                            link.download = f.name;
                            link.textContent = `Download ${f.name}`;
                            link.style.display = 'block';
                            link.style.marginTop = '10px';
                            container.appendChild(link);
                        } catch (e) { Module.printErr('Failed to create download for ' + f.name + ': ' + e); }
                    }
                }
            } else if (m.type === 'done') {
                Module.print('Worker: done');
                try { document.getElementById('light-button').disabled = false; } catch(e){}
            } else if (m.type === 'exception') {
                Module.printErr('Worker exception: ' + (m.error || m.errno || ''));
                try { document.getElementById('light-button').disabled = false; } catch(e){}
            }
        };
        lightWorker.postMessage({ type: 'init' });
    } catch (e) {
        lightWorker = null;
        console.warn('light worker unavailable:', e);
    }
})();

function initializeLightApp() {
    const lightButton = document.getElementById('light-button');
    const bspFileInput = document.getElementById('bsp-file');

    if (!lightButton) { Module.printErr('UI error: light button not found'); return; }

    lightButton.addEventListener('click', async () => {
        lightButton.disabled = true;
        const logOutput = document.getElementById('log-output');
        if (logOutput) logOutput.textContent = 'Starting lighting...\n';
        try { const dc = document.getElementById('download-container'); if (dc) dc.innerHTML = ''; } catch(e){}

        const bspFile = bspFileInput.files[0];
        if (!bspFile) { Module.printErr('No .bsp file selected.'); lightButton.disabled = false; return; }
        const bspData = new Uint8Array(await bspFile.arrayBuffer());
        // Normalize filename extension to lowercase so .BSP uploads are tolerated
        const bspParts = bspFile.name.split('.');
        let normalizedBspName = bspFile.name;
        if (bspParts.length > 1) {
            const ext = bspParts.pop();
            normalizedBspName = bspParts.join('.') + '.' + ext.toLowerCase();
        }
        const workingDir = '/working';

        // If worker is available, post buffers; otherwise use Module.FS fallback
        if (lightWorker && workerReady) {
            const args = [];
            // gather options from UI
            const threadsVal = document.getElementById('option-threads').value;
            if (threadsVal) { args.push('-threads'); args.push(threadsVal); }
            if (document.getElementById('option-extra').checked) args.push('-extra');
            if (document.getElementById('option-extra4').checked) args.push('-extra4');
            const distVal = document.getElementById('option-dist').value; if (distVal) { args.push('-dist'); args.push(distVal); }
            const rangeVal = document.getElementById('option-range').value; if (rangeVal) { args.push('-range'); args.push(rangeVal); }
            const gateVal = document.getElementById('option-gate').value; if (gateVal) { args.push('-gate'); args.push(gateVal); }
            const lightVal = document.getElementById('option-light').value; if (lightVal) { args.push('-light'); args.push(lightVal); }
            if (document.getElementById('option-addmin').checked) args.push('-addmin');
            if (document.getElementById('option-lit').checked) args.push('-lit');
            if (document.getElementById('option-litonly').checked) args.push('-litonly');
            const softVal = document.getElementById('option-soft').value; if (softVal) { args.push('-soft'); args.push(softVal); }
            const angVal = document.getElementById('option-anglescale').value; if (angVal) { args.push('-anglescale'); args.push(angVal); }

            // final arg is the file path in virtual FS
            const bspPath = `${workingDir}/${normalizedBspName}`;
            args.push(bspPath);

            Module.print('Posting run to light worker with args: ' + args.join(' '));
            try {
                const msg = { type: 'run', bspName: normalizedBspName, bspBuffer: bspData.buffer, args: args };
                lightWorker.postMessage(msg, [bspData.buffer]);
                return;
            } catch (e) {
                Module.printErr('Failed to postMessage to lightWorker: ' + e);
                // fall through to main-thread fallback
            }
        }

        // Fallback: write to Module.FS and callMain
        try {
            if (Module && Module.FS && Module.FS.mkdir) {
                try { Module.FS.mkdir(workingDir); } catch(e) {}
                Module.FS.writeFile(`${workingDir}/${normalizedBspName}`, bspData);
                Module.FS.chdir(workingDir);
            }
        } catch (e) { Module.printErr('FS write failed: ' + e); }

        const args2 = [];
        // same option gathering as above
        const threadsVal2 = document.getElementById('option-threads').value;
        if (threadsVal2) { args2.push('-threads'); args2.push(threadsVal2); }
        if (document.getElementById('option-extra').checked) args2.push('-extra');
        if (document.getElementById('option-extra4').checked) args2.push('-extra4');
        const distVal2 = document.getElementById('option-dist').value; if (distVal2) { args2.push('-dist'); args2.push(distVal2); }
        const rangeVal2 = document.getElementById('option-range').value; if (rangeVal2) { args2.push('-range'); args2.push(rangeVal2); }
        const gateVal2 = document.getElementById('option-gate').value; if (gateVal2) { args2.push('-gate'); args2.push(gateVal2); }
        const lightVal2 = document.getElementById('option-light').value; if (lightVal2) { args2.push('-light'); args2.push(lightVal2); }
        if (document.getElementById('option-addmin').checked) args2.push('-addmin');
        if (document.getElementById('option-lit').checked) args2.push('-lit');
        if (document.getElementById('option-litonly').checked) args2.push('-litonly');
        const softVal2 = document.getElementById('option-soft').value; if (softVal2) { args2.push('-soft'); args2.push(softVal2); }
        const angVal2 = document.getElementById('option-anglescale').value; if (angVal2) { args2.push('-anglescale'); args2.push(angVal2); }
    args2.push(`${workingDir}/${normalizedBspName}`);

        Module.print('Calling light.callMain with args: ' + args2.join(' '));
        try {
            await new Promise(requestAnimationFrame);
            Module.callMain(args2);
        } catch (e) { Module.printErr('light aborted: ' + e); }
        lightButton.disabled = false;

        // collect outputs from FS (lit and bsp)
        try {
            const container = document.getElementById('download-container');
            if (Module && Module.FS && Module.FS.analyzePath) {
                const outBsp = normalizedBspName.replace(/\.bsp$/i, '.bsp');
                const outLit = normalizedBspName.replace(/\.bsp$/i, '.lit');
                const files = [outBsp, outLit];
                for (const fname of files) {
                    const path = `${workingDir}/${fname}`;
                    try {
                        const ap = Module.FS.analyzePath(path);
                        if (ap.exists) {
                            const data = Module.FS.readFile(path, { encoding: 'binary' });
                            const blob = new Blob([data], { type: 'application/octet-stream' });
                            const url = URL.createObjectURL(blob);
                            const link = document.createElement('a');
                            link.href = url; link.download = fname; link.textContent = `Download ${fname}`; link.style.display = 'block'; link.style.marginTop = '10px';
                            container.appendChild(link);
                        }
                    } catch (e) { /* ignore missing */ }
                }
            }
        } catch (e) { Module.printErr('Failed to collect outputs: ' + e); }
    });
}

// Initialize when DOM is ready
if (document.readyState !== 'loading') initializeLightApp(); else document.addEventListener('DOMContentLoaded', initializeLightApp);
