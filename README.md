# HTML Quake Map Compiler Suite

This project is a WebAssembly port of the classic Tyr-Utils (v0.17) Quake map compiler toolset, presented in a modern, single-page web interface. It allows level designers to compile Quake maps directly in their browser, without needing to install any local command-line tools.

Vibecoded by **[TDA317](https://github.com/TDA317)** with AI assistance.

Original command-line utilities by **Kevin Shanahan (Tyrann)**.

---

## Features

*   **Fully In-Browser:** No installation required. All compilation is done locally in your browser using WebAssembly.
*   **Complete Toolset:** Includes the five core utilities from Tyr-Utils:
    *   **QBSP:** The BSP builder that converts `.map` files into playable `.bsp` files.
    *   **LIGHT:** The lighting compiler to calculate and bake lightmaps into the BSP.
    *   **VIS:** The visibility compiler that generates the Potentially Visible Set (PVS) for optimizing rendering.
    *   **BSPInfo:** A utility to inspect and print statistics about the data within a `.bsp` file.
    *   **BSPUtil:** A tool for various manipulations of `.bsp` file data.
*   **Modern UI:**
    *   A clean, tabbed interface to easily switch between tools.
    *   A "Full Compile" tab to automate the standard QBSP -> LIGHT -> VIS pipeline.
    *   A dark theme for comfortable use.
    *   Tooltips for all compiler flags to explain their function.

## How to Use

This application should be run from a web server due to many browser security policies that prevent WebAssembly from loading on `file:///` URLs. So, you cannot simply open the `index.html` file directly in your browser.

A simple way to do this locally is to use Python's built-in web server. Navigate to the project's root directory in your terminal and run:

`python -m http.server`

Then, open your browser and go to `http://localhost:8000`.

### Instructions

1.  **Select a Tool:** Choose the tool you want to use from the tab bar at the top (e.g., `QBSP`, `LIGHT`, etc.).
2.  **Provide Input Files:** Use the file input fields to select your `.map` or `.bsp` files.
3.  **Set Options:** Check the boxes and fill in the values for the desired command-line flags. Hover over any option to see a tooltip explaining what it does.
4.  **Run the Tool:** Click the main button for that tab (e.g., "Forge BSP", "Illuminate") to start the process.
5.  **View Output:** The compilation log will appear in the "Log" window at the bottom of the page.
6.  **Download Files:** Once the process is complete, download links for any output files (like the final `.bsp`) will appear below the log.

### Full Compile

The **Full Compile** tab streamlines the entire map-making process. It allows you to set all the options for QBSP, LIGHT, and VIS at once and runs them in sequence, automatically passing the output from one stage to the next. At the end, it provides download links for only the final, necessary files.

## Project Structure

The repository is organized into two main parts:

*   **/app:** Contains the runnable web application, including `index.html`, the compiled WebAssembly modules (`.wasm`, `.js`), and the worker scripts. This is all you need to run the tool suite.
*   **/source:** Contains all the original C source code (`.c`, `.h`) and the batch files (`.bat`) required to build the tools. If you want to modify the compilers, you will work in this directory and use the build scripts to regenerate the WebAssembly modules in the root folder.

---

## Original Tool Information

*   **Original Author:** Kevin Shanahan (AKA Tyrann)
*   **Website:** http://disenchant.net
*   **Email:** tyrann@disenchant.net

This project is based on Tyr-Utils v0.17. For a detailed history of the original command-line tools, please see `changelog.txt`.

### A Note on Porting

This project began as an experiment to port the Linux source of Tyr-Utils to WebAssembly using the **Emscripten** toolchain. The original code was chosen for its relative lack of platform-specific dependencies compared to more modern forks. While this port aims to be faithful to the original, some minor changes were necessary to ensure compatibility and functionality within a web environment.

## License

This program is free software; you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation; either version 2 of the License, or (at your option) any later version.

This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.

You should have received a copy of the GNU General Public License along with this program; if not, write to the Free Software Foundation, Inc., 59 Temple Place, Suite 330, Boston, MA 02111-1307 USA.

See file, 'COPYING', for details.
