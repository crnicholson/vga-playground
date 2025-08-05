(async function () {
    const vscode = acquireVsCodeApi();

    const canvas = document.getElementById('vgaCanvas');
    const ctx = canvas.getContext('2d');
    const simulateBtn = document.getElementById('simulateBtn');
    const resetBtn = document.getElementById('resetBtn');
    const exampleSelect = document.getElementById('exampleSelect');
    const statusEl = document.getElementById('status');
    const fpsEl = document.getElementById('fps');
    const clockEl = document.getElementById('clock');
    const frameEl = document.getElementById('frame');
    const resolutionEl = document.getElementById('resolution');
    const simStatusEl = document.getElementById('simStatus');

    const VGA_WIDTH = 640;
    const VGA_HEIGHT = 480;
    let isRunning = false;
    let currentCode = '';
    let frameCount = 0;
    let clockCount = 0;
    let fps = 0;
    let lastTime = performance.now();

    canvas.width = VGA_WIDTH;
    canvas.height = VGA_HEIGHT;

    // ================================
    // WASM Loader
    // ================================
    const wasmUri = window.wasmUri;
    let verilatorModule;

    function loadVerilator() {
        return new Promise((resolve, reject) => {
            fetch(wasmUri)
                .then(r => r.arrayBuffer())
                .then(bytes => WebAssembly.instantiate(bytes, {
                    env: {
                        abort: () => console.error("WASM abort"),
                        emscripten_notify_memory_growth: () => { },
                    }
                }))
                .then(result => {
                    const instance = result.instance;
                    const memory = instance.exports.memory;
                    resolve({ instance, memory });
                })
                .catch(reject);
        });
    }

    verilatorModule = await loadVerilator();

    // ================================
    // Fake FS for Verilog code
    // ================================
    const textEncoder = new TextEncoder();
    const FS = {
        files: {},
        writeFile: (path, data) => {
            FS.files[path] = (data instanceof Uint8Array) ? data : textEncoder.encode(data);
        },
        readFile: (path) => {
            return FS.files[path] || null;
        }
    };

    // ================================
    // Simulation Control
    // ================================
    function compileAndRun(code) {
        currentCode = code;
        statusEl.textContent = "Compiling Verilog...";
        FS.writeFile("/tmp/design.v", code);

        // Normally we'd call into verilator compile here
        if (verilatorModule.instance.exports.load_design) {
            verilatorModule.instance.exports.load_design();
        }

        statusEl.textContent = "Running simulation...";
    }

    function renderFrame() {
        const ptr = verilatorModule.instance.exports.framebuffer_ptr();
        const memory = new Uint8Array(verilatorModule.memory.buffer, ptr, VGA_WIDTH * VGA_HEIGHT * 2);

        const imageData = ctx.createImageData(VGA_WIDTH, VGA_HEIGHT);
        const data = imageData.data;

        let di = 0;
        for (let i = 0; i < memory.length; i += 2) {
            const value = memory[i] | (memory[i + 1] << 8); // RGB565
            const r = ((value >> 11) & 0x1F) << 3;
            const g = ((value >> 5) & 0x3F) << 2;
            const b = (value & 0x1F) << 3;
            data[di++] = r;
            data[di++] = g;
            data[di++] = b;
            data[di++] = 255;
        }

        ctx.putImageData(imageData, 0, 0);

        if (verilatorModule.instance.exports.step_frame) {
            verilatorModule.instance.exports.step_frame();
        }
    }

    function animate() {
        if (!isRunning) return;
        const now = performance.now();
        const delta = now - lastTime;
        if (delta >= 1000 / 60) {
            renderFrame();
            frameCount++;
            fps = Math.round(1000 / delta);
            clockCount += VGA_WIDTH * VGA_HEIGHT;
            lastTime = now;
            updateInfo();
        }
        requestAnimationFrame(animate);
    }

    function updateInfo() {
        fpsEl.textContent = fps;
        clockEl.textContent = clockCount.toLocaleString();
        frameEl.textContent = frameCount;
        resolutionEl.textContent = `${VGA_WIDTH}x${VGA_HEIGHT}`;
    }

    // ================================
    // Webview Events
    // ================================
    simulateBtn.addEventListener('click', () => {
        vscode.postMessage({ type: 'simulate', code: currentCode });
    });

    resetBtn.addEventListener('click', () => {
        vscode.postMessage({ type: 'reset' });
    });

    exampleSelect.addEventListener('change', (e) => {
        if (e.target.value) {
            vscode.postMessage({ type: 'selectExample', example: e.target.value });
        }
    });

    window.addEventListener('message', event => {
        const message = event.data;
        switch (message.type) {
            case 'startSimulation':
                startSimulation();
                break;
            case 'resetSimulation':
                resetSimulation();
                break;
            case 'updateCode':
                currentCode = message.code;
                break;
            case 'compileAndRun':
                compileAndRun(message.code);
                break;
            case 'loadExample':
                currentCode = message.code;
                exampleSelect.value = message.name;
                compileAndRun(currentCode);
                break;
        }
    });

    // ================================
    // Start/Stop Simulation
    // ================================
    function startSimulation() {
        if (isRunning) return;
        isRunning = true;
        frameCount = 0;
        clockCount = 0;
        simStatusEl.textContent = "Running";
        simulateBtn.disabled = true;
        statusEl.textContent = "VGA simulation started";
        animate();
    }

    function resetSimulation() {
        isRunning = false;
        simulateBtn.disabled = false;
        simStatusEl.textContent = "Idle";
        statusEl.textContent = "Ready";
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, VGA_WIDTH, VGA_HEIGHT);
        updateInfo();
    }

    updateInfo();
})();
