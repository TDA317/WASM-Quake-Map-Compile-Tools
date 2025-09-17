@echo off
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
  -Wno-implicit-function-declaration ^
  -Wno-implicit-int ^
  -Wno-return-type ^
  common/log.c ^
  common/threads.c ^
  common/cmdlib.c ^
  common/bspfile.c ^
  common/mathlib.c ^
  qbsp/util.c ^
  light/light.c ^
  light/entities.c ^
  light/litfile.c ^
  light/ltface.c ^
  light/trace.c

echo Build complete. Output files: light.js, light.wasm
