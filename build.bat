@echo off
echo Building qbsp for WebAssembly...

rem The Emscripten compiler command
emcc ^
  -O3 ^
  -o qbsp.js ^
  -s MODULARIZE=1 ^
  -s "EXPORT_NAME=\"createQBSPModule\"" ^
  -I. ^
  -Iinclude ^
  -s "EXPORTED_FUNCTIONS=['_main', '_malloc', '_free']" ^
  -s "EXPORTED_RUNTIME_METHODS=['ccall', 'cwrap', 'FS', 'callMain']" ^
  -s ALLOW_MEMORY_GROWTH=1 ^
  -s TOTAL_STACK=16777216 ^
  -s INITIAL_MEMORY=67108864 ^
  -s INVOKE_RUN=0 ^
  -s NO_EXIT_RUNTIME=1 ^
  -DDOUBLEVEC_T ^
  -Wno-implicit-function-declaration ^
  -Wno-implicit-int ^
  -Wno-return-type ^
  common/threads.c ^
  common/log.c ^
  qbsp/brush.c ^
  qbsp/bspfile.c ^
  qbsp/cmdlib.c ^
  qbsp/csg4.c ^
  qbsp/file.c ^
  qbsp/globals.c ^
  qbsp/map.c ^
  qbsp/mathlib.c ^
  qbsp/merge.c ^
  qbsp/outside.c ^
  qbsp/parser.c ^
  qbsp/portals.c ^
  qbsp/qbsp.c ^
  qbsp/solidbsp.c ^
  qbsp/surfaces.c ^
  qbsp/tjunc.c ^
  qbsp/util.c ^
  qbsp/wad.c ^
  qbsp/winding.c ^
  qbsp/writebsp.c

echo Build complete. Output files: qbsp.js, qbsp.wasm

echo Building light for WebAssembly...

emcc ^
  -O3 ^
  -o light.js ^
  -s MODULARIZE=1 ^
  -s "EXPORT_NAME=\"createLightModule\"" ^
  -I. ^
  -Iinclude ^
  -s "EXPORTED_FUNCTIONS=['_main', '_malloc', '_free']" ^
  -s "EXPORTED_RUNTIME_METHODS=['FS','callMain']" ^
  -s ALLOW_MEMORY_GROWTH=1 ^
  -s TOTAL_STACK=16777216 ^
  -s INITIAL_MEMORY=67108864 ^
  -s INVOKE_RUN=0 ^
  -s NO_EXIT_RUNTIME=1 ^
  -DDOUBLEVEC_T ^
  -Wno-implicit-function-declaration ^
  -Wno-implicit-int ^
  -Wno-return-type ^
  common/log.c ^
  light/light.c ^
  light/entities.c ^
  light/litfile.c ^
  light/ltface.c ^
  light/trace.c

echo Build complete. Output files: light.js, light.wasm
