// VGA Simulator UI logic
(function () {
  const vscode       = acquireVsCodeApi();
  const canvas       = document.getElementById('vgaCanvas');
  const ctx          = canvas.getContext('2d');
  const statusEl     = document.getElementById('status');
  const fpsEl        = document.getElementById('fps');
  const frameEl      = document.getElementById('frame');
  const clockEl      = document.getElementById('clock');
  const simulateBtn  = document.getElementById('simulateBtn');
  const resetBtn     = document.getElementById('resetBtn');
  const exampleSelect= document.getElementById('exampleSelect');

  const VGA_WIDTH  = 640, VGA_HEIGHT = 480;

  let hdl = null;
  let frameCount = 0, clockCount = 0, lastTime = performance.now();
  let currentCode = '';

  console.log('vgaSimulator.js loaded');

  simulateBtn.addEventListener('click', () => {
    console.log('Simulate clicked, code len:', currentCode.length);
    vscode.postMessage({ type: 'simulate', code: currentCode });
  });

  resetBtn.addEventListener('click', () => {
    console.log('Reset clicked');
    vscode.postMessage({ type: 'reset' });
  });

  exampleSelect.addEventListener('change', e => {
    console.log('Example selected:', e.target.value);
    vscode.postMessage({ type: 'selectExample', example: e.target.value });
  });

  window.addEventListener('message', ev => {
    const msg = ev.data;
    console.log('Message from host:', msg);
    switch (msg.type) {
      case 'updateCode':
        currentCode = msg.code;
        break;

      case 'compileAndRun':
      case 'loadExample':
        currentCode = msg.code;
        if (msg.name) exampleSelect.value = msg.name;
        runSimulation(currentCode);
        break;

      case 'resetSimulation':
        console.log('Reset simulation');
        hdl = null;
        frameCount = clockCount = 0;
        statusEl.textContent = 'Reset';
        ctx.clearRect(0, 0, VGA_WIDTH, VGA_HEIGHT);
        break;

      default:
        console.warn('Unknown message type:', msg.type);
    }
  });

  async function runSimulation(code) {
    console.log('runSimulation, code length:', code.length);
    statusEl.textContent = 'Compiling…';
    try {
      const Module = await window.compileVerilator();
      console.log('Compiled, instantiating HDLModuleWASM');
      hdl = new window.HDLModuleWASM(Module);
      if (hdl.init) hdl.init(code, VGA_WIDTH, VGA_HEIGHT);
      statusEl.textContent = 'Simulation started';
      frameCount = clockCount = 0;
      lastTime = performance.now();
      requestAnimationFrame(animate);
    } catch (err) {
      console.error('runSimulation error:', err);
      statusEl.textContent = 'Error';
    }
  }

  function animate(now) {
    if (!hdl) return;
    const dt = now - lastTime;
    if (dt >= 1000 / 60) {
      if (hdl.stepFrameAndGetBuffer) {
        const buf = hdl.stepFrameAndGetBuffer();
        ctx.putImageData(new ImageData(buf, VGA_WIDTH, VGA_HEIGHT), 0, 0);
      }
      frameCount++;
      clockCount += VGA_WIDTH * VGA_HEIGHT;
      fpsEl.textContent   = Math.round(1000 / dt);
      frameEl.textContent = frameCount;
      clockEl.textContent = clockCount.toLocaleString();
      lastTime = now;
    }
    requestAnimationFrame(animate);
  }

  statusEl.textContent = 'Ready';
  console.log('vgaSimulator.js initialized');
})();
