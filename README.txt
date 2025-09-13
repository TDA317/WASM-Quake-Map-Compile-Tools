Updated 2025-09-13
TDA317 - HTML QBSP+

This is an experimental Quake BSP compiler and other tools. 
Vibecode HTML/WebAssembly port of the tools better detailed below. 
Use at your own risk.

No credit for the original tools. 
Vibecoding isn't as easy as some might think and does often require manual cleanup and edits. But, this would not be possible without the original source and major AI assistance.

I had tried porting EricW's more advanced version of these tools but the AI never figured it out. It kept running into library dependency issues compiling the wasm. I thought I would roll back to the source that was based off of. Thought it might be easier for the tools to work with the Linux source rather than include windows or mac specific libraries.

So, here we go.


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
