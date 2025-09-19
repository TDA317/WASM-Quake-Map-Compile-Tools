HTML Quake Map Compiler Suite

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


Updated 2020-07-26

------------------
 Tyr-Utils (v0.17)
------------------
  Website: http://disenchant.net
  Author:  Kevin Shanahan (AKA Tyrann)
  Email:   tyrann@disenchant.net

A collection of command line utilities for building Quake levels and working
with various Quake file formats. I need to work on the documentation a bit
more, but below are some brief descriptions of the tools.

Included utilities:

  qbsp    - Used for turning a .map file into a playable .bsp file.

  light   - Used for lighting a level after the bsp stage.
            This util was previously known as TyrLite

  vis     - Creates the potentially visible set (PVS) for a bsp.

  bspinfo - Print stats about the data contained in a bsp file.

  bsputil - Simple tool for manipulation of bsp file data

See the doc/ directory for more detailed descriptions of the various
tools capabilities.  See changelog.txt for a brief overview of recent
changes or git://disenchant.net/tyrutils for the full changelog and
source code.

---------
 License
---------

    This program is free software; you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation; either version 2 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program; if not, write to the Free Software
    Foundation, Inc., 59 Temple Place, Suite 330, Boston, MA  02111-1307  USA
