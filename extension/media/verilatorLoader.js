window.compileVerilator = async function () {
  console.log("Loading Verilator module from", window.veriUri);

  // Dynamically import Emscripten JS as an ES module
  const verilatorModule = await import(window.veriUri);
  console.log("Verilator JS imported, now instantiating with WASM at", window.wasmUri);

  const Module = await verilatorModule.default({
    locateFile: (path) => {
      if (path.endsWith('.wasm')) {
        console.log("Redirecting WASM load to", window.wasmUri);
        return window.wasmUri;
      }
      return path;
    }
  });

  return Module;
};
