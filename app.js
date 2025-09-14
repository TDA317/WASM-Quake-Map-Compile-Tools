// app.js

// Define the Module object for Emscripten.
// This object is used to configure the WebAssembly module's behavior.
var Module = {
    // This function will be called when the Emscripten runtime is fully initialized.
    onRuntimeInitialized: function() {
        console.log('Emscripten runtime initialized.');
        initializeApp();
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

// This function sets up the application's event listeners and logic.
function initializeApp() {
    const forgeButton = document.getElementById('forge-button');
    const mapFileInput = document.getElementById('map-file');
    const wadFilesInput = document.getElementById('wad-files');
    const logOutput = document.getElementById('log-output');
    const downloadLink = document.getElementById('download-link');

    // Add a click event listener to the "Forge" button.
    forgeButton.addEventListener('click', async () => {
        // Disable the button to prevent multiple compilations at once.
        forgeButton.disabled = true;
        logOutput.textContent = 'Starting compilation...\n';
        downloadLink.style.display = 'none';

        const mapFile = mapFileInput.files[0];
        if (!mapFile) {
            Module.printErr('No .map file selected.');
            forgeButton.disabled = false;
            return;
        }

        const wadFiles = wadFilesInput.files;
        const workingDir = '/working';

        try {
            // --- 1. Set up the virtual file system ---
            // Clean up any files from a previous run.
            if (Module.FS.analyzePath(workingDir).exists) {
                const files = Module.FS.readdir(workingDir);
                files.forEach(file => {
                    if (file !== '.' && file !== '..') {
                        Module.FS.unlink(`${workingDir}/${file}`);
                    }
                });
                Module.FS.rmdir(workingDir);
            }
            Module.FS.mkdir(workingDir);

            // Write the .map file to the virtual file system.
            const mapData = new Uint8Array(await mapFile.arrayBuffer());
            Module.FS.writeFile(`${workingDir}/${mapFile.name}`, mapData);

            // Write any .wad files to the virtual file system.
            for (const wadFile of wadFiles) {
                const wadData = new Uint8Array(await wadFile.arrayBuffer());
                Module.FS.writeFile(`${workingDir}/${wadFile.name}`, wadData);
            }

            // --- 2. Construct the command-line arguments for qbsp ---
            const args = [];
            args.push('qbsp'); // The program name.

            const mapPath = `${workingDir}/${mapFile.name}`;
            const bspPath = mapPath.replace(/\.map$/i, '.bsp');
            args.push(mapPath);
            args.push(bspPath);

            // Add selected options from the checkboxes.
            const options = document.querySelectorAll('input[type="checkbox"][id^="option-"]');
            options.forEach(option => {
                if (option.checked) {
                    args.push(`-${option.id.replace('option-', '')}`);
                }
            });

            // If .wad files are provided, specify the path.
            if (wadFiles.length > 0) {
                args.push('-wadpath');
                args.push(workingDir);
            }

            Module.print(`Running qbsp with args: ${args.join(' ')}\n`);

            // --- 3. Run qbsp ---
            // callMain will throw an exception if the C code calls exit() or longjmp().
            Module.callMain(args);

            // --- 4. Handle the output ---
            // Check if the output .bsp file was created.
            if (Module.FS.analyzePath(bspPath).exists) {
                const bspData = Module.FS.readFile(bspPath, { encoding: 'binary' });
                const blob = new Blob([bspData], { type: 'application/octet-stream' });
                const url = URL.createObjectURL(blob);

                downloadLink.href = url;
                downloadLink.download = mapFile.name.replace(/\.map$/i, '.bsp');
                downloadLink.style.display = 'block';
                Module.print(`\nSuccess! ${downloadLink.download} is ready for download.`);
            } else {
                Module.printErr('Output .bsp file not found after compilation.');
            }

        } catch (e) {
            // This catch block will handle errors from the C code (e.g., via exit()).
            Module.printErr(`A critical error occurred during compilation.`);
            console.error(e);
        } finally {
            // Re-enable the button regardless of success or failure.
            forgeButton.disabled = false;
        }
    });
}
