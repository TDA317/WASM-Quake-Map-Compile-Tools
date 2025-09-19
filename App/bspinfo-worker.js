// bspinfo-worker.js - runs the modularized bspinfo tool inside a Web Worker
let modulePromise = null;

try {
    importScripts('bspinfo.js');
} catch (e) {
    console.warn('Could not import bspinfo.js in worker:', e);
}

self.onmessage = async function(ev) {
    const msg = ev.data;

    if (msg.type === 'init') {
        if (!modulePromise) {
            modulePromise = createBspinfoModule({
                print: function(text) { self.postMessage({type:'log', text: String(text)}); },
                printErr: function(text) { self.postMessage({type:'err', text: String(text)}); },
                noInitialRun: true
            });
        }
        try {
            await modulePromise;
            self.postMessage({type:'inited'});
        } catch (e) {
            self.postMessage({type:'err', text: 'bspinfo module init failed: '+String(e)});
        }
        return;
    }

    if (msg.type === 'run') {
        try {
            const module = await modulePromise;
            const FS = module.FS;
            const working = '/working';

            // Clear virtual filesystem
            try {
                if (FS.analyzePath(working).exists) {
                    const files = FS.readdir(working);
                    for (const f of files) {
                        if (f !== '.' && f !== '..') FS.unlink(working + '/' + f);
                    }
                    FS.rmdir(working);
                }
            } catch(e){}
            FS.mkdir(working);

            // Write input BSP file
            if (msg.bspName && msg.bspBuffer) {
                FS.writeFile(working + '/' + msg.bspName, new Uint8Array(msg.bspBuffer));
            }

            const args = msg.args || [];
            // The bspinfo tool expects the filename to be the LAST argument,
            // so we add it after all the flags.
            const finalArgs = [...args, working + '/' + msg.bspName];

            try {
                module.callMain(finalArgs);
                // bspinfo doesn't produce output files, just log text
                self.postMessage({type:'done'});
            } catch (e) {
                self.postMessage({type:'exception', error: String(e), errno: e && e.errno});
            }
        } catch (e) {
            self.postMessage({type:'exception', error: String(e)});
        }
    }
};