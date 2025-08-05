import { compileVerilator } from './verilatorLoader.js';
import HDLModuleWASM from './HDLModuleWASM.js';

(async function() {
  const vscode = acquireVsCodeApi();
  const canvas = document.getElementById('vgaCanvas');
  const ctx = canvas.getContext('2d');
  const statusEl = document.getElementById('status');
  const fpsEl = document.getElementById('fps');
  const frameEl = document.getElementById('frame');
  const clockEl = document.getElementById('clock');
  const VGA_WIDTH = 640, VGA_HEIGHT = 480;

  let hdl, frameCount = 0, clockCount = 0, lastTime = performance.now();

  async function compileAndRun(code) {
    statusEl.textContent = 'Compiling...';
    const { module, ast } = await compileVerilator('verilator_bin.js', { 'design.v': code });
    hdl = new HDLModuleWASM(module, ast, VGA_WIDTH, VGA_HEIGHT);
    hdl.init();
    statusEl.textContent = 'Simulation started';
    frameCount = clockCount = 0;
    lastTime = performance.now();
    requestAnimationFrame(animate);
  }

  function animate(now) {
    if (!hdl) return;
    const dt = now - lastTime;
    if (dt >= 1000 / 60) {
      const buf = hdl.stepFrameAndGetBuffer();
      ctx.putImageData(new ImageData(buf, VGA_WIDTH, VGA_HEIGHT), 0, 0);
      frameCount++;
      clockCount += VGA_WIDTH * VGA_HEIGHT;
      fpsEl.textContent = Math.round(1000 / dt);
      frameEl.textContent = frameCount;
      clockEl.textContent = clockCount.toLocaleString();
      lastTime = now;
    }
    requestAnimationFrame(animate);
  }

  window.addEventListener('message', ev => {
    const msg = ev.data;
    if (msg.type === 'compileAndRun') compileAndRun(msg.code);
    else if (msg.type === 'resetSimulation') {
      hdl = null;
      frameCount = clockCount = 0;
      statusEl.textContent = 'Reset';
      ctx.clearRect(0, 0, VGA_WIDTH, VGA_HEIGHT);
    }
  });

  statusEl.textContent = 'Ready';
})();
