// Example wrapper — adjust if your HDLModuleWASM is different
class HDLModuleWASM {
  constructor(Module) {
    this.Module = Module;
  }
  // Example run method
  run() {
    console.log("HDLModuleWASM running with Module:", this.Module);
  }
}

// Attach globally
window.HDLModuleWASM = HDLModuleWASM;
