// light-worker.js - runs the modularized light tool inside a Web Worker and forwards logs
let modulePromise = null;

try {
    importScripts('light.js');
} catch (e) {}

function errnoName(errno) {
    try {
        if (typeof ERRNO_CODES !== 'undefined') {
            for (var k in ERRNO_CODES) if (ERRNO_CODES[k] === errno) return k;
        }
    } catch (e) {}
    return String(errno);
}

self.onmessage = async function(ev) {
    const msg = ev.data;

    if (msg.type === 'init') {
        if (!modulePromise) {
            modulePromise = createLightModule({
                print: function(text) { self.postMessage({type:'log', text: String(text)}); },
                printErr: function(text) { self.postMessage({type:'err', text: String(text)}); },
                noInitialRun: true
            });
        }
        self.postMessage({type:'inited'});
        return;
    }

    if (msg.type === 'run') {
        try {
            const module = await modulePromise;
            const FS = module.FS;
            const working = '/working';
            try { if (FS.analyzePath(working).exists) {
                const files = FS.readdir(working);
                for (const f of files) {
                    if (f !== '.' && f !== '..') try { FS.unlink(working + '/' + f); } catch(e){}
                }
                try { FS.rmdir(working); } catch(e){}
            }} catch(e){}
            try { FS.mkdir(working); } catch(e){}

            // write inputs if provided
            if (msg.inputName && msg.inputBuffer) {
                FS.writeFile(working + '/' + msg.inputName, new Uint8Array(msg.inputBuffer));
            }

            if (msg.wads && msg.wads.length) {
                for (const w of msg.wads) {
                    try { FS.writeFile(working + '/' + w.name, new Uint8Array(w.buf)); } catch(e) { self.postMessage({type:'err', text:'Failed to write wad '+w.name+' '+(e.errno?errnoName(e.errno):e)}); }
                }
            }

            // run-ack listing
            try {
                const present = FS.readdir(working).filter(x => x !== '.' && x !== '..');
                self.postMessage({ type: 'run-ack', files: present });
            } catch (e) {
                self.postMessage({ type: 'run-ack', files: [], err: String(e) });
            }

            const args = msg.args || [];
            try {
                module.callMain(args);

                // collect outputs (e.g., .lit, modified bsp)
                try {
                    const possible = ['.lit', '.bsp'];
                    const baseName = (msg.inputName || '').replace(/\.bsp$|\.map$/i, '') || 'output';
                    const files = [];
                    for (const ext of possible) {
                        const fname = baseName + ext;
                        const path = working + '/' + fname;
                        try {
                            const ap = FS.analyzePath(path);
                            if (ap && ap.exists) {
                                const fileData = FS.readFile(path, { encoding: 'binary' });
                                const ab = fileData.buffer.slice(fileData.byteOffset, fileData.byteOffset + fileData.byteLength);
                                files.push({ name: fname, buf: ab });
                            }
                        } catch (e) {}
                    }
                    if (files.length) {
                        const transfers = files.map(f => f.buf);
                        self.postMessage({ type: 'outputs', files: files }, transfers);
                    }
                } catch (collectErr) {
                    self.postMessage({ type: 'err', text: 'Worker failed to collect outputs: ' + String(collectErr) });
                }

                self.postMessage({type:'done'});
            } catch (e) {
                self.postMessage({type:'exception', error: String(e), errno: e && e.errno});
            }
        } catch (e) {
            self.postMessage({type:'exception', error: String(e)});
        }
    }
};
