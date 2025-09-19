@echo off
echo Building vis (debug) for WebAssembly with SAFE_HEAP and ASSERTIONS...

emcc ^
  -O1 ^
  -gsource-map ^
  -o vis-debug.js ^
  -s MODULARIZE=1 ^
  -s "EXPORT_NAME=\"createVisDebugModule\"" ^
  -I. ^
  -Iinclude ^
  -s "EXPORTED_FUNCTIONS=['_main','_malloc','_free']" ^
  -s "EXPORTED_RUNTIME_METHODS=['FS','callMain']" ^
  -s ALLOW_MEMORY_GROWTH=1 ^
  -s TOTAL_STACK=33554432 ^
  -s INITIAL_MEMORY=134217728 ^
  -s INVOKE_RUN=0 ^
  -s NO_EXIT_RUNTIME=1 ^
  -s ASSERTIONS=2 ^
  -s SAFE_HEAP=1 ^
  -Wno-implicit-function-declaration ^
  -Wno-implicit-int ^
  -Wno-return-type ^
  common/log.c ^
  common/threads.c ^
  common/cmdlib.c ^
  common/bspfile.c ^
  common/mathlib.c ^
  qbsp/util.c ^
  vis/vis.c ^
  vis/flow.c ^
  vis/state.c ^
  vis/soundpvs.c

echo Build complete. Output files: vis-debug.js, vis-debug.wasm
