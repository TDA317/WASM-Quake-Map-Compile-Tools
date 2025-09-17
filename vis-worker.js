// vis-worker.js - runs the modularized vis tool inside a Web Worker and forwards logs
let modulePromise = null;
let lastDebugFlag = false;

async function ensureModule(debug) {
    if (modulePromise && lastDebugFlag === debug) return modulePromise;
    // reset
    modulePromise = null;
    lastDebugFlag = debug;
    try {
        if (debug) {
            // try debug module first
            importScripts('vis-debug.js');
            if (typeof createVisDebugModule === 'function') {
                modulePromise = createVisDebugModule({ print: (t)=>self.postMessage({type:'log', text:String(t)}), printErr: (t)=>self.postMessage({type:'err', text:String(t)}), noInitialRun: true });
                return modulePromise;
            }
            // fall through to normal
        }
    } catch (e) {
        console.warn('Could not import vis-debug.js in worker:', e);
    }
    try {
        importScripts('vis.js');
    } catch (e) {
        console.warn('Could not import vis.js in worker:', e);
        throw e;
    }
    if (typeof createVisModule === 'function') {
        modulePromise = createVisModule({ print: (t)=>self.postMessage({type:'log', text:String(t)}), printErr: (t)=>self.postMessage({type:'err', text:String(t)}), noInitialRun: true });
        return modulePromise;
    }
    throw new Error('No createVisModule/createVisDebugModule factory found');
}

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
        try {
            await ensureModule(!!msg.debug);
            self.postMessage({type:'inited'});
        } catch (e) {
            self.postMessage({type:'err', text: 'module init failed: '+String(e)});
        }
        return;
    }

    if (msg.type === 'run') {
        try {
            const module = await ensureModule(!!msg.debug);
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

            // write inputs if provided (BSP + optional PRT)
            const inName = msg.bspName || msg.inputName;
            const inBuf = msg.bspBuffer || msg.inputBuffer;
            if (inName && inBuf) {
                FS.writeFile(working + '/' + inName, new Uint8Array(inBuf));
            }
            if (msg.prtName && msg.prtBuffer) {
                FS.writeFile(working + '/' + msg.prtName, new Uint8Array(msg.prtBuffer));
            }

            // run-ack
            try {
                const present = FS.readdir(working).filter(x => x !== '.' && x !== '..');
                self.postMessage({ type: 'run-ack', files: present });
            } catch (e) {
                self.postMessage({ type: 'run-ack', files: [], err: String(e) });
            }

            const args = msg.args || [];
            try {
                module.callMain(args);

                // collect outputs (e.g., .vis, modified bsp)
                try {
                    const possible = ['.vis', '.bsp', '.prt'];
                    const baseName = (inName || '').replace(/\.bsp$|\.map$/i, '') || 'output';
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
