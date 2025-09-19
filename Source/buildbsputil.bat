@echo off
echo Building bsputil for WebAssembly...

emcc ^
  -O3 ^
  -o bsputil.js ^
  -s MODULARIZE=1 ^
  -s "EXPORT_NAME=\"createBsputilModule\"" ^
  -I. ^
  -Iinclude ^
  -s "EXPORTED_FUNCTIONS=['_main','_malloc','_free']" ^
  -s "EXPORTED_RUNTIME_METHODS=['FS','callMain']" ^
  -s ALLOW_MEMORY_GROWTH=1 ^
  -s TOTAL_STACK=16777216 ^
  -s INITIAL_MEMORY=67108864 ^
  -s INVOKE_RUN=0 ^
  -s NO_EXIT_RUNTIME=1 ^
  -Wno-implicit-function-declaration ^
  common/log.c ^
  common/threads.c ^
  common/cmdlib.c ^
  common/bspfile.c ^
  qbsp/util.c ^
  bsputil/bsputil.c

echo Build complete. Output files: bsputil.js, bsputil.wasm