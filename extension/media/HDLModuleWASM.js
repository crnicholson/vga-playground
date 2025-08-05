export default class HDLModuleWASM {
  constructor(module, ast, width = 640, height = 480) {
    this.M = module;
    this.ast = ast;
    this.width = width;
    this.height = height;
  }
  init() {
    const io = this.ast.io;
    // these names map to wasm exports
    this.stepFrame = this.M.step_frame;
    this.framebuffer_ptr = this.M.framebuffer_ptr;
    this.memory = this.M.HEAPU8.buffer;
  }
  stepFrameAndGetBuffer() {
    this.stepFrame();
    const ptr = this.framebuffer_ptr();
    const len = this.width * this.height * 3;
    return new Uint8ClampedArray(this.memory, ptr, len);
  }
}
