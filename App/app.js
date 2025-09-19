document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const logOutput = document.getElementById('log-output');
    const downloadContainer = document.getElementById('download-container');

    // --- Worker Setup ---
    let qbspWorker, lightWorker, visWorker, bspinfoWorker, bsputilWorker;
    let qbspReady = false, lightReady = false, visReady = false, bspinfoReady = false, bsputilReady = false;

    function appendLog(text, type = 'log') {
        const prefix = type === 'err' ? 'ERROR: ' : '';
        logOutput.textContent += prefix + text + '\n';
        logOutput.scrollTop = logOutput.scrollHeight;
    }

    function createWorker(scriptName, onReady) {
        try {
            const worker = new Worker(scriptName);
            worker.onmessage = (e) => handleWorkerMessage(e.data, worker);
            worker.postMessage({ type: 'init' });
            appendLog(`${scriptName.split('-')[0]} worker initializing...`);
            // A bit of a hack: the 'inited' message will set the ready flag.
            return worker;
        } catch (e) {
            appendLog(`Failed to create ${scriptName}: ${e}`, 'err');
            return null;
        }
    }

    // --- State for Chained Compilation ---
    let compilationChain = null;

    function handleWorkerMessage(msg, worker) {
        const workerName = worker.name || 'unknown'; // We'll set .name when creating
        switch (msg.type) {
            case 'inited':
                appendLog(`${workerName} worker ready.`);
                if (workerName === 'qbsp') qbspReady = true;
                if (workerName === 'light') lightReady = true;
                if (workerName === 'vis') visReady = true;
                if (workerName === 'bspinfo') bspinfoReady = true;
                if (workerName === 'bsputil') bsputilReady = true;
                break;
            case 'log':
                appendLog(msg.text);
                break;
            case 'err':
                appendLog(msg.text, 'err');
                break;
            case 'run-ack':
                appendLog(`[${workerName}] Files in virtual FS: ${msg.files.join(', ')}`);
                break;
            case 'outputs':
                appendLog(`[${workerName}] Received ${msg.files.length} output file(s).`);
                if (compilationChain && compilationChain.onOutputs) {
                    compilationChain.onOutputs(msg.files);
                } else {
                    displayDownloads(msg.files);
                }
                break;
            case 'done':
                appendLog(`[${workerName}] Compilation finished.`);
                if (compilationChain && compilationChain.onDone) {
                    compilationChain.onDone();
                } else {
                    setButtonsEnabled(true);
                }
                break;
            case 'exception':
                appendLog(`[${workerName}] Worker exception: ${msg.error}`, 'err');
                if (compilationChain) {
                    appendLog('Compilation chain aborted due to error.', 'err');
                    compilationChain = null;
                }
                setButtonsEnabled(true);
                break;
            default:
                appendLog(`[${workerName}] Unknown message: ${msg.type}`);
        }
    }

    qbspWorker = createWorker('qbsp-worker.js');
    if(qbspWorker) qbspWorker.name = 'qbsp';

    lightWorker = createWorker('light-worker.js');
    if(lightWorker) lightWorker.name = 'light';

    visWorker = createWorker('vis-worker.js');
    if(visWorker) visWorker.name = 'vis';

    bspinfoWorker = createWorker('bspinfo-worker.js');
    if(bspinfoWorker) bspinfoWorker.name = 'bspinfo';

    bsputilWorker = createWorker('bsputil-worker.js');
    if(bsputilWorker) bsputilWorker.name = 'bsputil';

    // --- Tab-switching Logic ---
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabPanels = document.querySelectorAll('.tab-panel');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            const targetTab = button.getAttribute('data-tab');
            tabPanels.forEach(panel => {
                if (panel.id === targetTab) {
                    panel.classList.add('active');
                } else {
                    panel.classList.remove('active');
                }
            });
        });
    });

    // --- UI Logic ---
    const allRunButtons = document.querySelectorAll('#forge-button, #light-button, #vis-button, #full-compile-button, #bspinfo-button, #bsputil-button');

    function setButtonsEnabled(enabled) {
        allRunButtons.forEach(btn => btn.disabled = !enabled);
    }

    function clearOutput() {
        logOutput.textContent = '';
        downloadContainer.innerHTML = '';
    }

    function displayDownloads(files) {
        files.forEach(file => {
            const blob = new Blob([file.buf], { type: 'application/octet-stream' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = file.name;
            a.textContent = `Download ${file.name}`;
            downloadContainer.appendChild(a);
        });
    }


    // --- QBSP Logic ---
    document.getElementById('forge-button').addEventListener('click', async () => {
        if (!qbspReady) {
            appendLog('QBSP worker is not ready yet.', 'err');
            return;
        }
        setButtonsEnabled(false);
        clearOutput();

        const mapFile = document.getElementById('map-file').files[0];
        if (!mapFile) {
            appendLog('No .map file selected.', 'err');
            setButtonsEnabled(true);
            return;
        }

        const wadFiles = document.getElementById('wad-files').files;
        const args = [];
        document.querySelectorAll('#qbsp-tab input[type="checkbox"]').forEach(cb => {
            if (cb.checked) args.push(`-${cb.id.replace('option-', '')}`);
        });
        const leakdist = document.getElementById('option-leakdist').value;
        if (leakdist) args.push('-leakdist', leakdist);
        const subdivide = document.getElementById('option-subdivide').value;
        if (subdivide) args.push('-subdivide', subdivide);

        const mapBuffer = await mapFile.arrayBuffer();
        const wadPayload = [];
        const transfers = [mapBuffer];

        for (const wadFile of wadFiles) {
            const wadBuffer = await wadFile.arrayBuffer();
            wadPayload.push({ name: wadFile.name, buf: wadBuffer });
            transfers.push(wadBuffer);
        }

        if (wadPayload.length > 0) {
            args.push('-wadpath', '/working');
            args.push('-override_wad', Array.from(wadFiles).map(f => f.name).join(';'));
        }

        const mapName = mapFile.name.toLowerCase();
        args.push(`/working/${mapName}`);

        appendLog(`Running QBSP with args: ${args.join(' ')}`);
        qbspWorker.postMessage({
            type: 'run',
            mapName: mapName,
            mapBuffer: mapBuffer,
            wads: wadPayload,
            args: args
        }, transfers);
    });

    // --- LIGHT Logic ---
    document.getElementById('light-button').addEventListener('click', async () => {
        if (!lightReady) {
            appendLog('Light worker is not ready yet.', 'err');
            return;
        }
        setButtonsEnabled(false);
        clearOutput();

        const bspFile = document.getElementById('bsp-file').files[0];
        if (!bspFile) {
            appendLog('No .bsp file selected.', 'err');
            setButtonsEnabled(true);
            return;
        }

        const args = [];
        document.querySelectorAll('#light-tab input[type="checkbox"]').forEach(cb => {
            if (cb.checked) args.push(`-${cb.id.replace('option-', '')}`);
        });
        document.querySelectorAll('#light-tab input[type="number"]').forEach(input => {
            if (input.value) {
                args.push(`-${input.id.replace('option-', '')}`, input.value);
            }
        });

        const bspBuffer = await bspFile.arrayBuffer();
        const bspName = bspFile.name.toLowerCase();
        args.push(`/working/${bspName}`);

        appendLog(`Running LIGHT with args: ${args.join(' ')}`);
        lightWorker.postMessage({
            type: 'run',
            bspName: bspName,
            bspBuffer: bspBuffer,
            args: args
        }, [bspBuffer]);
    });

    // --- VIS Logic ---
    document.getElementById('vis-button').addEventListener('click', async () => {
        if (!visReady) {
            appendLog('VIS worker is not ready yet.', 'err');
            return;
        }
        setButtonsEnabled(false);
        clearOutput();

        const bspFile = document.getElementById('vis-bsp-file').files[0];
        if (!bspFile) {
            appendLog('No .bsp file selected.', 'err');
            setButtonsEnabled(true);
            return;
        }

        const prtFile = document.getElementById('prt-input').files[0];
        const useDebug = document.getElementById('option-debug').checked;

        // Re-initialize worker if debug flag changed
        visWorker.postMessage({ type: 'init', debug: useDebug });

        const args = [];
        document.querySelectorAll('#vis-tab input[type="checkbox"]').forEach(cb => {
            // Don't pass the debug flag as a command-line arg
            if (cb.checked && cb.id !== 'option-debug') {
                args.push(`-${cb.id.replace('option-', '')}`);
            }
        });
        const level = document.getElementById('option-level').value;
        if (level) args.push('-level', level);
        const threads = document.getElementById('vis-option-threads').value;
        if (threads) args.push('-threads', threads);

        const bspBuffer = await bspFile.arrayBuffer();
        const bspName = bspFile.name.toLowerCase();
        args.push(`/working/${bspName}`);

        const message = {
            type: 'run',
            bspName: bspName,
            bspBuffer: bspBuffer,
            args: args,
            debug: useDebug
        };
        const transfers = [bspBuffer];

        if (prtFile) {
            const prtBuffer = await prtFile.arrayBuffer();
            message.prtName = prtFile.name.toLowerCase();
            message.prtBuffer = prtBuffer;
            transfers.push(prtBuffer);
        }

        appendLog(`Running VIS with args: ${args.join(' ')}`);
        visWorker.postMessage(message, transfers);
    });

    // --- Full Compile Chain Logic ---
    document.getElementById('full-compile-button').addEventListener('click', async () => {
        if (!qbspReady || !lightReady || !visReady || !bspinfoReady || !bsputilReady) {
            appendLog('All workers must be ready.', 'err');
            return;
        }
        setButtonsEnabled(false);
        clearOutput();

        const mapFile = document.getElementById('full-map-file').files[0];
        if (!mapFile) {
            appendLog('No .map file selected for full compile.', 'err');
            setButtonsEnabled(true);
            return;
        }

        const mapName = mapFile.name.toLowerCase();
        const baseName = mapName.replace(/\.map$/i, '');

        // --- Step 1: QBSP ---
        function runQbsp() {
            appendLog('\n--- [1/3] Starting QBSP ---');
            const wadFiles = document.getElementById('full-wad-files').files;
            const args = [];
            document.querySelectorAll('#full-compile-tab #full-option-nofill, #full-compile-tab #full-option-noclip, #full-compile-tab #full-option-noskip, #full-compile-tab #full-option-onlyents, #full-compile-tab #full-option-verbose, #full-compile-tab #full-option-splitspecial, #full-compile-tab #full-option-transsky, #full-compile-tab #full-option-oldaxis, #full-compile-tab #full-option-bspleak, #full-compile-tab #full-option-oldleak, #full-compile-tab #full-option-bsp2').forEach(cb => {
                if (cb.checked) args.push(`-${cb.id.replace('full-option-', '')}`);
            });
            const leakdist = document.getElementById('full-option-leakdist').value;
            if (leakdist) args.push('-leakdist', leakdist);
            const subdivide = document.getElementById('full-option-subdivide').value;
            if (subdivide) args.push('-subdivide', subdivide);

            const wadPayload = [];
            const fileReadPromises = [mapFile.arrayBuffer()];
            for (const wadFile of wadFiles) {
                fileReadPromises.push(wadFile.arrayBuffer());
            }

            Promise.all(fileReadPromises).then(buffers => {
                const mapBuffer = buffers.shift();
                const transfers = [mapBuffer];

                for (let i = 0; i < wadFiles.length; i++) {
                    const wadBuffer = buffers[i];
                    wadPayload.push({ name: wadFiles[i].name, buf: wadBuffer });
                    transfers.push(wadBuffer);
                }

                if (wadPayload.length > 0) {
                    args.push('-wadpath', '/working');
                    args.push('-override_wad', Array.from(wadFiles).map(f => f.name).join(';'));
                }
                args.push(`/working/${mapName}`);

                appendLog(`Running QBSP with args: ${args.join(' ')}`);
                qbspWorker.postMessage({ type: 'run', mapName: mapName, mapBuffer: mapBuffer, wads: wadPayload, args: args }, transfers);
            });
        }

        // --- Step 2: LIGHT ---
        function runLight(bspFile) {
            appendLog('\n--- [2/3] Starting LIGHT ---');
            const args = [];
            document.querySelectorAll('#full-compile-tab #full-option-extra, #full-compile-tab #full-option-extra4, #full-compile-tab #full-option-addmin, #full-compile-tab #full-option-lit, #full-compile-tab #full-option-litonly').forEach(cb => {
                if (cb.checked) args.push(`-${cb.id.replace('full-option-', '')}`);
            });
            document.querySelectorAll('#full-compile-tab #full-option-threads, #full-compile-tab #full-option-dist, #full-compile-tab #full-option-range, #full-compile-tab #full-option-gate, #full-compile-tab #full-option-light, #full-compile-tab #full-option-soft, #full-compile-tab #full-option-anglescale').forEach(input => {
                if (input.value) args.push(`-${input.id.replace('full-option-', '')}`, input.value);
            });
            args.push(`/working/${bspFile.name}`);

            appendLog(`Running LIGHT with args: ${args.join(' ')}`);
            lightWorker.postMessage({ type: 'run', bspName: bspFile.name, bspBuffer: bspFile.buf, args: args }, [bspFile.buf]);
        }

        // --- Step 3: VIS ---
        function runVis(bspFile, prtFile) {
            appendLog('\n--- [3/3] Starting VIS ---');
            const useDebug = document.getElementById('full-option-debug').checked;
            visWorker.postMessage({ type: 'init', debug: useDebug });

            const args = [];
            document.querySelectorAll('#full-compile-tab #full-option-fast, #full-compile-tab #full-option-v, #full-compile-tab #full-option-vv').forEach(cb => {
                if (cb.checked) args.push(`-${cb.id.replace('full-option-', '')}`);
            });
            const level = document.getElementById('full-option-level').value;
            if (level) args.push('-level', level);
            const threads = document.getElementById('full-vis-option-threads').value;
            if (threads) args.push('-threads', threads);
            args.push(`/working/${bspFile.name}`);

            const message = { type: 'run', bspName: bspFile.name, bspBuffer: bspFile.buf, args: args, debug: useDebug };
            const transfers = [bspFile.buf];

            if (prtFile) {
                message.prtName = prtFile.name;
                message.prtBuffer = prtFile.buf;
                transfers.push(prtFile.buf);
            }

            appendLog(`Running VIS with args: ${args.join(' ')}`);
            visWorker.postMessage(message, transfers);
        }

        // --- Chain Execution ---
        compilationChain = {
            step: 1,
            files: {},
            onOutputs: function(outputFiles) {
                outputFiles.forEach(f => this.files[f.name] = f);
            },
            onDone: function() {
                if (this.step === 1) { // QBSP finished
                    this.step = 2;
                    const bspFile = this.files[`${baseName}.bsp`];
                    if (!bspFile) {
                        appendLog('QBSP did not produce a .bsp file. Aborting chain.', 'err');
                        compilationChain = null;
                        setButtonsEnabled(true);
                        return;
                    }
                    runLight(bspFile);
                } else if (this.step === 2) { // LIGHT finished
                    this.step = 3;
                    const bspFile = this.files[`${baseName}.bsp`];
                    const prtFile = this.files[`${baseName}.prt`];
                    runVis(bspFile, prtFile);
                } else if (this.step === 3) { // VIS finished
                    appendLog('\n--- Full compile chain finished! ---');
                    compilationChain = null;
                    setButtonsEnabled(true);

                    // Display only the final files for download
                    const finalFiles = [];
                    const bspFile = this.files[`${baseName}.bsp`];
                    const prtFile = this.files[`${baseName}.prt`];
                    const litFile = this.files[`${baseName}.lit`];
                    const visFile = this.files[`${baseName}.vis`];

                    if (bspFile) finalFiles.push(bspFile);
                    if (prtFile) finalFiles.push(prtFile);
                    if (litFile) finalFiles.push(litFile);
                    if (visFile) finalFiles.push(visFile);
                    displayDownloads(finalFiles);
                }
            }
        };

        runQbsp();
    });

    // --- BSPInfo Logic ---
    document.getElementById('bspinfo-button').addEventListener('click', async () => {
        if (!bspinfoReady) {
            appendLog('BSPInfo worker is not ready yet.', 'err');
            return;
        }
        setButtonsEnabled(false);
        clearOutput();

        const bspFile = document.getElementById('bspinfo-bsp-file').files[0];
        if (!bspFile) {
            appendLog('No .bsp file selected.', 'err');
            setButtonsEnabled(true);
            return;
        }

        const args = [];
        document.querySelectorAll('#bspinfo-tab input[type="checkbox"]').forEach(cb => {
            if (cb.checked) args.push(`-${cb.id.replace('info-', '')}`);
        });

        const bspBuffer = await bspFile.arrayBuffer();
        const bspName = bspFile.name.toLowerCase();

        appendLog(`Running BSPInfo with args: ${args.join(' ')}`);
        bspinfoWorker.postMessage({
            type: 'run',
            bspName: bspName,
            bspBuffer: bspBuffer,
            args: args
        }, [bspBuffer]);
    });

    // --- BSPUtil Logic ---
    document.getElementById('bsputil-button').addEventListener('click', async () => {
        if (!bsputilReady) {
            appendLog('BSPUtil worker is not ready yet.', 'err');
            return;
        }
        setButtonsEnabled(false);
        clearOutput();

        const bspFile = document.getElementById('bsputil-bsp-file').files[0];
        if (!bspFile) {
            appendLog('No .bsp file selected.', 'err');
            setButtonsEnabled(true);
            return;
        }

        const args = [];
        const message = { type: 'run', bspName: bspFile.name };
        const transfers = [];

        const bspBuffer = await bspFile.arrayBuffer();
        message.bspBuffer = bspBuffer;
        transfers.push(bspBuffer);

        document.querySelectorAll('#bsputil-tab input[type="checkbox"]').forEach(cb => {
            if (cb.checked) args.push(`--${cb.id.replace('util-', '')}`);
        });

        const removeLump = document.getElementById('util-remove-lump').value;
        if (removeLump) args.push('--remove-lump', removeLump);
        const convert = document.getElementById('util-convert').value;
        if (convert) args.push('--convert', convert);

        const mergeFile = document.getElementById('util-merge-file').files[0];
        if (mergeFile) {
            args.push('--merge', `/working/${mergeFile.name}`);
            message.mergeName = mergeFile.name;
            message.mergeBuffer = await mergeFile.arrayBuffer();
            transfers.push(message.mergeBuffer);
        }

        const isInfoOnly = document.getElementById('util-info').checked || document.getElementById('util-leak-check').checked;
        if (!isInfoOnly) {
            const outName = document.getElementById('util-output-name').value || bspFile.name;
            args.unshift('--out', `/working/${outName}`);
            message.outName = outName;
        }
        args.push(`/working/${bspFile.name}`);
        message.args = args;

        appendLog(`Running BSPUtil with args: ${args.join(' ')}`);
        bsputilWorker.postMessage(message, transfers);
    });
});