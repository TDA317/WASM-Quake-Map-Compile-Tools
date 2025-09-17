// app.js
var Module = {
    // This function will be called when the Emscripten runtime is fully initialized.
    onRuntimeInitialized: function() {
        console.log('Emscripten runtime initialized.');
        try {
            if (!window.__appInitialized) {
                initializeApp();
                window.__appInitialized = true;
            }
        } catch (e) { initializeApp(); }
    },
    // Redirect stdout from the C code to our log element.
    print: function(text) {
        if (arguments.length > 1) {
            text = Array.prototype.slice.call(arguments).join(' ');
        }
        console.log(text);
        const logOutput = document.getElementById('log-output');
        logOutput.textContent += text + '\n';
        logOutput.scrollTop = logOutput.scrollHeight; // Auto-scroll
    },
    // Redirect stderr from the C code to our log element.
    printErr: function(text) {
        if (arguments.length > 1) {
            text = Array.prototype.slice.call(arguments).join(' ');
        }
        console.error(text);
        const logOutput = document.getElementById('log-output');
        logOutput.textContent += 'ERROR: ' + text + '\n';
        logOutput.scrollTop = logOutput.scrollHeight; // Auto-scroll
    }
};

// Fallback: if the page DOM is ready but the Emscripten onRuntimeInitialized never fires
// (e.g. when qbsp.js is built with MODULARIZE), ensure initializeApp still runs once.
if (typeof window !== 'undefined') {
    if (document.readyState !== 'loading') {
        if (!window.__appInitialized) { try { initializeApp(); window.__appInitialized = true; } catch(e){} }
    } else {
        document.addEventListener('DOMContentLoaded', function() {
            if (!window.__appInitialized) { try { initializeApp(); window.__appInitialized = true; } catch(e){} }
        });
    }
}

// Helper to map errno number to name if ERRNO_CODES is available
function errnoName(errno) {
    try {
        if (typeof ERRNO_CODES !== 'undefined') {
            for (var k in ERRNO_CODES) {
                if (ERRNO_CODES[k] === errno) return k;
            }
        }
    } catch (e) {}
    return String(errno);
}

// Attempt to create the qbsp worker as soon as possible so network requests
// for qbsp-worker.js (and qbsp.js via importScripts) appear in the Network tab.
var qbspWorker = null;
var workerReady = false;
(function() {
    try {
        qbspWorker = new Worker('qbsp-worker.js');
        qbspWorker.onmessage = function(ev) {
            const m = ev.data;
            if (m.type === 'inited') {
                workerReady = true;
                // Prepend worker init message so it appears before the welcome text
                try {
                    const lo = document.getElementById('log-output');
                    if (lo) {
                        lo.textContent = 'qbsp worker inited\n' + lo.textContent;
                    }
                } catch (e) {}
                // already prepended to the visible log; print to dev console only
                console.log('qbsp worker inited');
                // ensure UI knows worker is ready
                const readyBadge = document.getElementById('worker-ready');
                if (readyBadge) readyBadge.textContent = 'Worker: ready';
            } else if (m.type === 'log') {
                if (typeof Module !== 'undefined' && Module.print) Module.print(m.text); else console.log(m.text);
            } else if (m.type === 'err') {
                if (typeof Module !== 'undefined' && Module.printErr) Module.printErr(m.text); else console.error(m.text);
            } else if (m.type === 'run-ack') {
                try { Module.print('Worker run-ack: ' + (m.files && m.files.length ? m.files.join(', ') : '(none)') ); } catch(e) { console.log('Worker run-ack', m); }
            } else if (m.type === 'outputs') {
                try {
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
                            } catch (e) { console.error('Failed to create download for', f.name, e); }
                        }
                    }
                } catch (e) { console.error('Failed to handle outputs message', e); }
            } else if (m.type === 'done') {
                if (typeof Module !== 'undefined' && Module.print) Module.print('Worker: done'); else console.log('Worker: done');
                // Re-enable Forge if it was disabled
                try { const fb = document.getElementById('forge-button'); if (fb) fb.disabled = false; } catch(e){}
                try { const readyBadge2 = document.getElementById('worker-ready'); if (readyBadge2) readyBadge2.textContent = 'Worker: idle'; } catch(e){}
            } else if (m.type === 'exception') {
                if (typeof Module !== 'undefined' && Module.printErr) Module.printErr('Worker exception: ' + (m.error || m.errno || '')); else console.error(m.error || m.errno || 'Worker exception');
                try { const fb = document.getElementById('forge-button'); if (fb) fb.disabled = false; } catch(e){}
            }
        };
        // ask the worker to initialize the module; worker will reply with 'inited'
        qbspWorker.postMessage({type:'init'});
    } catch (e) {
        qbspWorker = null;
        console.warn('qbsp worker unavailable:', e);
    }
})();

// This function sets up the application's event listeners and logic.
function initializeApp() {
    const forgeButton = document.getElementById('forge-button');
    const mapFileInput = document.getElementById('map-file');
    const wadFilesInput = document.getElementById('wad-files');
    const logOutput = document.getElementById('log-output');
    const downloadLink = document.getElementById('download-link');

    // Add a click event listener to the "Forge" button.
    if (!forgeButton) {
        Module.printErr('UI error: forge button not found');
        return;
    }
    forgeButton.addEventListener('click', async () => {
    // Debug: indicate click and status
    try { Module.print(`Forge clicked; workerReady=${workerReady}; qbspWorker=${qbspWorker? 'present':'null'};`); } catch(e){ console.log('Forge clicked'); }
    // Disable the button to prevent multiple compilations at once.
    forgeButton.disabled = true;
    logOutput.textContent = 'Starting compilation...\n';
    if (downloadLink) downloadLink.style.display = 'none';
    try { const dc = document.getElementById('download-container'); if (dc) dc.innerHTML = ''; } catch(e){}

        const mapFile = mapFileInput.files[0];
        if (!mapFile) {
            Module.printErr('No .map file selected.');
            forgeButton.disabled = false;
            return;
        }
        
    const wadFiles = wadFilesInput.files;
    const workingDir = '/working';

    // Status UI elements (declare here so finally can reset them)
    const spinner = document.getElementById('spinner');
    const statusText = document.getElementById('status-text');
    const elapsedElem = document.getElementById('elapsed');
    const logcountElem = document.getElementById('logcount');

        try {
            // --- 1. Set up the virtual file system ---
            // If we're using the worker path, we shouldn't touch Module.FS in the main thread
            // because the modularized module may not have been initialized here. Only perform
            // FS operations when the worker is not available (fallback path) and Module.FS exists.
            const mapData = new Uint8Array(await mapFile.arrayBuffer());
            // Normalize filename extension to lowercase so toolchains that append or
            // compare against ".map" work regardless of the uploaded filename case.
            const mapNameParts = mapFile.name.split('.');
            let normalizedMapName = mapFile.name;
            if (mapNameParts.length > 1) {
                const ext = mapNameParts.pop();
                normalizedMapName = mapNameParts.join('.') + '.' + ext.toLowerCase();
            }
            if (!(qbspWorker && workerReady)) {
                try {
                    if (Module && Module.FS && Module.FS.analyzePath && Module.FS.analyzePath(workingDir).exists) {
                        const files = Module.FS.readdir(workingDir);
                        for (const file of files) {
                            if (file !== '.' && file !== '..') {
                                try {
                                    Module.FS.unlink(`${workingDir}/${file}`);
                                } catch (e) {
                                    Module.printErr(`Failed to unlink ${workingDir}/${file}: ${e && e.errno ? errnoName(e.errno) : e}`);
                                }
                            }
                        }
                        try { Module.FS.rmdir(workingDir); } catch (e) {}
                    }
                } catch (e) {
                    Module.printErr('FS cleanup failed: ' + e);
                }
                try { if (Module && Module.FS && Module.FS.mkdir) Module.FS.mkdir(workingDir); } catch (e) { /* ignore if exists */ }

                // Write the .map file to the virtual file system for fallback runs
                try { Module.FS.writeFile(`${workingDir}/${normalizedMapName}`, mapData); } catch (e) { Module.printErr('Failed to write map to FS: ' + e); }
            }

            // Write any .wad files to the virtual file system.
            // Read .wad File objects into memory and write them to FS for the fallback path.
            // We'll also keep their ArrayBuffers in `wadBuffers` so we can transfer them to the worker.
            const wadBuffers = [];
            for (const wadFile of wadFiles) {
                try {
                    const wadUint8 = new Uint8Array(await wadFile.arrayBuffer());
                    const ab = wadUint8.buffer.slice(wadUint8.byteOffset, wadUint8.byteOffset + wadUint8.byteLength);
                    wadBuffers.push({ name: wadFile.name, ab: ab });
                    // write to FS so the non-worker fallback sees the wad files
                    if (!(qbspWorker && workerReady)) {
                        try { Module.FS.writeFile(`${workingDir}/${wadFile.name}`, wadUint8); } catch (e) { Module.printErr('Failed to write wad to FS: ' + e); }
                    }
                } catch (e) {
                    Module.printErr('Failed to read wad file: ' + e);
                }
            }

            // --- 2. Construct the command-line arguments for qbsp ---
            // The first argument is implicitly the program name, so we start with the options.
            const args = [];

            // Add selected options from the checkboxes.
            const checkboxes = document.querySelectorAll('input[type="checkbox"][id^="option-"]');
            checkboxes.forEach(option => {
                if (option.checked) {
                    args.push(`-${option.id.replace('option-', '')}`);
                }
            });

            // Handle numeric options
            const leakdistInput = document.getElementById('option-leakdist');
            if (leakdistInput.value) {
                args.push('-leakdist');
                args.push(leakdistInput.value);
            }

            const subdivideInput = document.getElementById('option-subdivide');
            if (subdivideInput.value) {
                args.push('-subdivide');
                args.push(subdivideInput.value);
            }

            // If .wad files are provided, specify the path and the override list.
            if (wadFiles.length > 0) {
                args.push('-wadpath');
                args.push(workingDir);
                
                const wadNames = Array.from(wadFiles).map(f => f.name).join(';');
                args.push('-override_wad');
                args.push(wadNames);
            }
            
            // Add filename last.
            const mapPath = `${workingDir}/${normalizedMapName}`;
            const bspPath = mapPath.replace(/\.map$/i, '.bsp'); // We still need bspPath to find the output file.
            args.push(mapPath);
            
            Module.print(`Running qbsp with args: ${args.join(' ')}\n`);

            // If we have a worker and it's ready, send a 'run' message with transferable buffers
            if (qbspWorker && workerReady) {
                try {
                    Module.print('Posting run to worker...');
                    const msg = { type: 'run', mapName: normalizedMapName, mapBuffer: mapData.buffer, wads: [], args: args };
                    const transfers = [ mapData.buffer ];
                    for (const w of wadBuffers) {
                        msg.wads.push({ name: w.name, buf: w.ab });
                        transfers.push(w.ab);
                    }
                    qbspWorker.postMessage(msg, transfers);
                    // Wait for worker to reply via onmessage handlers (logs/done/exception)
                    return; // Do not fall back to main-thread callMain
                } catch (e) {
                    Module.printErr('Failed to postMessage to qbspWorker: ' + e);
                    // fall through to main-thread callMain fallback
                }
            }

            // --- 3. Run qbsp ---
            // Ensure FS cwd is the working dir so relative writes land where the UI expects.
            try {
                if (Module.FS && Module.FS.chdir) {
                    Module.print(`Changing FS cwd to ${workingDir}`);
                    Module.FS.chdir(workingDir);
                }
            } catch (e) {
                Module.printErr(`Failed to chdir to ${workingDir}: ${e}`);
            }

            // Let the browser render the "Starting compilation..." text before
            // we block the main thread with the synchronous call to the wasm module.
            await new Promise(requestAnimationFrame);

            // Diagnostic: list FS contents so we can see what files are present
            try {
                if (Module.FS && Module.FS.readdir) {
                    Module.print('FS root: ' + Module.FS.readdir('/').join(', '));
                    if (Module.FS.analyzePath(workingDir).exists) {
                        Module.print('FS working: ' + Module.FS.readdir(workingDir).join(', '));
                    } else {
                        Module.print('FS working: (not present)');
                    }
                }
            } catch (e) {
                Module.printErr('FS listing failed: ' + e);
            }

            // callMain will block the main thread; setup UI and heartbeat
            var startTime = Date.now();
            if (spinner) spinner.style.display = 'block';
            if (statusText) statusText.textContent = 'Compiling...';
            if (elapsedElem) elapsedElem.textContent = '0.0s';
            if (logcountElem) logcountElem.textContent = '0 lines';

            // Add a heartbeat so the user knows the compile is still running
            var heartbeatInterval = 5000; // ms
            var heartbeat = setInterval(function() {
                Module.print('Still compiling...');
                try {
                    if (logcountElem) logcountElem.textContent = document.getElementById('log-output').textContent.split('\n').length + ' lines';
                    if (elapsedElem) elapsedElem.textContent = ((Date.now() - startTime)/1000).toFixed(1) + 's';
                } catch (e) {}
            }, heartbeatInterval);

            try {
                Module.callMain(args);
                var duration = ((Date.now() - startTime) / 1000).toFixed(1);
                Module.print('qbsp finished in ' + duration + 's');
                if (statusText) statusText.textContent = 'Done (' + duration + 's)';
                if (spinner) spinner.style.display = 'none';
                if (elapsedElem) elapsedElem.textContent = duration + 's';
                try { if (logcountElem) logcountElem.textContent = document.getElementById('log-output').textContent.split('\n').length + ' lines'; } catch (e) {}
            } catch (err) {
                Module.printErr('qbsp aborted with an exception.');
                console.error(err);
            } finally {
                clearInterval(heartbeat);
                // Diagnostic: list FS again to show any outputs written by qbsp
                try {
                    if (Module.FS && Module.FS.readdir) {
                        Module.print('FS root (post): ' + Module.FS.readdir('/').join(', '));
                        if (Module.FS.analyzePath(workingDir).exists) {
                            Module.print('FS working (post): ' + Module.FS.readdir(workingDir).join(', '));
                        } else {
                            Module.print('FS working (post): (not present)');
                        }
                    }
                } catch (e) {
                    Module.printErr('FS listing failed (post): ' + e);
                }
            }

            // --- 4. Handle the output ---
            const outputContainer = document.getElementById('download-container');
            outputContainer.innerHTML = ''; // Clear previous links

            const possibleExtensions = ['.bsp', '.prt', '.pts', '.por'];
            let filesFound = 0;

            for (const ext of possibleExtensions) {
                const outputFileName = normalizedMapName.replace(/\.map$/i, ext);
                const outputFilePath = `${workingDir}/${outputFileName}`;
                try {
                    const ap = Module.FS.analyzePath(outputFilePath);
                    if (ap && ap.exists) {
                        try {
                            const fileData = Module.FS.readFile(outputFilePath, { encoding: 'binary' });
                            const blob = new Blob([fileData], { type: 'application/octet-stream' });
                            const url = URL.createObjectURL(blob);
                            const link = document.createElement('a');
                            link.href = url;
                            link.download = outputFileName;
                            link.textContent = `Download ${outputFileName}`;
                            link.style.display = 'block';
                            link.style.marginTop = '10px';
                            outputContainer.appendChild(link);
                            filesFound++;
                        } catch (readErr) {
                            Module.printErr(`Failed to read ${outputFilePath}: ${readErr && readErr.errno ? errnoName(readErr.errno) : readErr}`);
                        }
                    }
                } catch (anErr) {
                    Module.printErr(`FS analyzePath failed for ${outputFilePath}: ${anErr && anErr.errno ? errnoName(anErr.errno) : anErr}`);
                }
            }

            if (filesFound > 0) {
                Module.print(`\nSuccess! ${filesFound} output file(s) are ready for download.`);
            } else {
                Module.printErr('No output files found after compilation.');
            }

        } catch (e) {
            // This catch block will handle errors from the C code (e.g., via exit()).
            Module.printErr('A critical error occurred during compilation.');
            // Print expanded error information for ErrnoError and others
            try {
                var details = {
                    name: e && e.name,
                    errno: e && e.errno,
                    code: e && e.code,
                    message: e && e.message
                };
                Module.printErr('Error details: ' + JSON.stringify(details));
                if (e && e.stack) {
                    Module.printErr('Stack: ' + (e.stack.toString()));
                }
            } catch (logErr) {
                // ignore logging errors
            }
            console.error(e);
            // Diagnostic: dump FS state to help track what caused the ErrnoError
            try {
                if (Module.FS && Module.FS.readdir) {
                    Module.print('FS root (err): ' + Module.FS.readdir('/').join(', '));
                    if (Module.FS.analyzePath(workingDir).exists) {
                        Module.print('FS working (err): ' + Module.FS.readdir(workingDir).join(', '));
                    } else {
                        Module.print('FS working (err): (not present)');
                    }
                }
            } catch (fsErr) {
                Module.printErr('FS dump failed in catch: ' + fsErr);
            }
        } finally {
            // Re-enable the button regardless of success or failure.
            forgeButton.disabled = false;
            try {
                if (spinner) spinner.style.display = 'none';
                if (statusText) statusText.textContent = 'Idle';
                if (elapsedElem) elapsedElem.textContent = '0.0s';
                if (logcountElem) logcountElem.textContent = document.getElementById('log-output').textContent.split('\n').length + ' lines';
            } catch (e) {}
        }
    });
}
