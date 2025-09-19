// bsputil-worker.js - runs the modularized bsputil tool inside a Web Worker
let modulePromise = null;

try {
    importScripts('bsputil.js');
} catch (e) {
    console.warn('Could not import bsputil.js in worker:', e);
}

self.onmessage = async function(ev) {
    const msg = ev.data;

    if (msg.type === 'init') {
        if (!modulePromise) {
            modulePromise = createBsputilModule({
                print: function(text) { self.postMessage({type:'log', text: String(text)}); },
                printErr: function(text) { self.postMessage({type:'err', text: String(text)}); },
                noInitialRun: true
            });
        }
        try {
            await modulePromise;
            self.postMessage({type:'inited'});
        } catch (e) {
            self.postMessage({type:'err', text: 'bsputil module init failed: '+String(e)});
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
            // Write second input BSP file for merge
            if (msg.mergeName && msg.mergeBuffer) {
                FS.writeFile(working + '/' + msg.mergeName, new Uint8Array(msg.mergeBuffer));
            }

            const args = msg.args || [];

            try {
                module.callMain(args);

                // Collect output files
                if (msg.outName) {
                    const outName = msg.outName;
                    const path = working + '/' + outName;
                    try {
                        if (FS.analyzePath(path).exists) {
                            const fileData = FS.readFile(path, { encoding: 'binary' });
                            const ab = fileData.buffer.slice(fileData.byteOffset, fileData.byteOffset + fileData.byteLength);
                            const files = [{ name: outName, buf: ab }];
                            self.postMessage({ type: 'outputs', files: files }, [ab]);
                        }
                    } catch (e) {
                        // ignore if output file not found
                    }
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