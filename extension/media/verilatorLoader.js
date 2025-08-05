// loader that wraps the TinyTapeout-verilator runtime
export async function compileVerilator(moduleUrl, sources) {
  // load the Emscripten runtime JS
  await import(moduleUrl); // attaches global Module
  await Module.ready; // wait until Emscripten module initialized

  // write verilog into FS
  for (const [filename, text] of Object.entries(sources)) {
    Module.FS.writeFile(filename, text);
  }

  // compile design
  Module.load_design();
  Module.emit_xml_ast();
  const xmlPtr = Module.get_xml_ast_ptr();
  const xmlLen = Module.get_xml_ast_length();
  const xml = new TextDecoder().decode(
    new Uint8Array(Module.HEAPU8.buffer, xmlPtr, xmlLen)
  );

  const ast = Module.parseXmlAST(xml);
  return { module: Module, ast };
}
