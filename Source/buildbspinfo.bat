@echo off
echo Building bspinfo for WebAssembly...

emcc ^
  -O3 ^
  -o bspinfo.js ^
  -s MODULARIZE=1 ^
  -s "EXPORT_NAME=\"createBspinfoModule\"" ^
  -I. ^
  -Iinclude ^
  -s "EXPORTED_FUNCTIONS=['_main','_malloc','_free']" ^
  -s "EXPORTED_RUNTIME_METHODS=['FS','callMain']" ^
  -s ALLOW_MEMORY_GROWTH=1 ^
  -s TOTAL_STACK=8388608 ^
  -s INITIAL_MEMORY=33554432 ^
  -s INVOKE_RUN=0 ^
  -s NO_EXIT_RUNTIME=1 ^
  -Wno-implicit-function-declaration ^
  common/log.c ^
  common/threads.c ^
  common/cmdlib.c ^
  common/bspfile.c ^
  bspinfo/bspinfo.c

echo Build complete. Output files: bspinfo.js, bspinfo.wasm