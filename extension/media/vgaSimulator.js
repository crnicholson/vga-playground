(function() {
    const vscode = acquireVsCodeApi();
    const canvas = document.getElementById('vgaCanvas');
    const ctx = canvas.getContext('2d');
    
    const simulateBtn = document.getElementById('simulateBtn');
    const resetBtn = document.getElementById('resetBtn');
    const exampleSelect = document.getElaementById('exampleSelect');
    const statusEl = document.getElementById('status');
    const fpsEl = document.getElementById('fps');
    const clockEl = document.getElementById('clock');
    const frameEl = document.getElementById('frame');
    const resolutionEl = document.getElementById('resolution');
    const simStatusEl = document.getElementById('simStatus');
    
    let isRunning = false;
    let animationFrame;
    let frameCount = 0;
    let lastFrameTime = 0;
    let fps = 60;
    let clockCount = 0;
    
    const VGA_WIDTH = 640;
    const VGA_HEIGHT = 480;
    const PIXEL_CLOCK = 25175000;
    
    let currentCode = '';
    
    canvas.width = VGA_WIDTH;
    canvas.height = VGA_HEIGHT;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, VGA_WIDTH, VGA_HEIGHT);
    
    simulateBtn.addEventListener('click', () => {
        vscode.postMessage({ type: 'simulate' });
    });
    
    resetBtn.addEventListener('click', () => {
        vscode.postMessage({ type: 'reset' });
    });
    
    exampleSelect.addEventListener('change', (e) => {
        if (e.target.value) {
            vscode.postMessage({ 
                type: 'selectExample', 
                example: e.target.value 
            });
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
                loadExample(message.code, message.name);
                break;
        }
    });
    
    function startSimulation() {
        if (isRunning) return;
        
        isRunning = true;
        frameCount = 0;
        clockCount = 0;
        lastFrameTime = performance.now();
        
        simulateBtn.textContent = 'Running';
        simulateBtn.disabled = true;
        simStatusEl.textContent = 'Running';
        simStatusEl.className = 'value running';
        fpsEl.className = 'value running';
        statusEl.textContent = 'VGA simulation started! You should see output on the display.';
        
        animate();
    }
    
    function resetSimulation() {
        isRunning = false;
        frameCount = 0;
        clockCount = 0;
        
        if (animationFrame) {
            cancelAnimationFrame(animationFrame);
        }
        
        simulateBtn.textContent = 'Simulate';
        simulateBtn.disabled = false;
        simStatusEl.textContent = 'Idle';
        simStatusEl.className = 'value';
        fpsEl.className = 'value';
        statusEl.textContent = 'Ready';
        
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, VGA_WIDTH, VGA_HEIGHT);
        
        updateInfo();
    }
    
    function compileAndRun(code) {
        currentCode = code;
        if (isRunning) {
            statusEl.textContent = 'Code updated, simulation continuing...';
        }
    }
    
    function loadExample(code, name) {
        currentCode = code;
        exampleSelect.value = name;
        statusEl.textContent = `Loaded example: ${name}`;
    }
    
    function animate() {
        if (!isRunning) return;
        
        const currentTime = performance.now();
        const deltaTime = currentTime - lastFrameTime;
        
        if (deltaTime >= 1000 / 60) {
            renderFrame();
            frameCount++;
            lastFrameTime = currentTime;
            
            if (frameCount % 60 === 0) {
                fps = Math.round(1000 / deltaTime);
                updateInfo();
            }
        }
        
        animationFrame = requestAnimationFrame(animate);
    }
    
    function renderFrame() {
        const imageData = ctx.createImageData(VGA_WIDTH, VGA_HEIGHT);
        const data = imageData.data;
        
        if (currentCode.includes('stripes') || currentCode.includes('pix_x[4:3]')) {
            renderStripes(data);
        } else if (currentCode.includes('checker') || currentCode.includes('pix_x[5] ^ pix_y[5]')) {
            renderCheckerboard(data);
        } else {
            renderDefault(data);
        }
        
        ctx.putImageData(imageData, 0, 0);
        clockCount += VGA_WIDTH * VGA_HEIGHT;
    }
    
    function renderStripes(data) {
        for (let y = 0; y < VGA_HEIGHT; y++) {
            for (let x = 0; x < VGA_WIDTH; x++) {
                const index = (y * VGA_WIDTH + x) * 4;
                
                const r = ((x >> 3) & 3) * 85;
                const g = ((x >> 5) & 3) * 85; 
                const b = ((x >> 7) & 3) * 85;
                
                data[index] = r;
                data[index + 1] = g;
                data[index + 2] = b;
                data[index + 3] = 255;
            }
        }
    }
    
    function renderCheckerboard(data) {
        for (let y = 0; y < VGA_HEIGHT; y++) {
            for (let x = 0; x < VGA_WIDTH; x++) {
                const index = (y * VGA_WIDTH + x) * 4;
                
                const checker = ((x >> 5) ^ (y >> 5)) & 1;
                const color = checker ? 255 : 0;
                
                data[index] = color;
                data[index + 1] = color;
                data[index + 2] = color;
                data[index + 3] = 255;
            }
        }
    }
    
    function renderDefault(data) {
        for (let y = 0; y < VGA_HEIGHT; y++) {
            for (let x = 0; x < VGA_WIDTH; x++) {
                const index = (y * VGA_WIDTH + x) * 4;
                
                const r = (x / VGA_WIDTH) * 255;
                const g = (y / VGA_HEIGHT) * 255;
                const b = 128;
                
                data[index] = r;
                data[index + 1] = g;
                data[index + 2] = b;
                data[index + 3] = 255;
            }
        }
    }
    
    function updateInfo() {
        fpsEl.textContent = fps;
        clockEl.textContent = clockCount.toLocaleString();
        frameEl.textContent = frameCount;
        resolutionEl.textContent = `${VGA_WIDTH}x${VGA_HEIGHT}`;
    }
    
    updateInfo();
    
    window.addEventListener('resize', () => {
        const container = document.querySelector('.simulator-container');
        const containerRect = container.getBoundingClientRect();
        const aspectRatio = VGA_WIDTH / VGA_HEIGHT;
        
        let newWidth = containerRect.width - 20;
        let newHeight = newWidth / aspectRatio;
        
        if (newHeight > containerRect.height - 20) {
            newHeight = containerRect.height - 20;
            newWidth = newHeight * aspectRatio;
        }
        
        canvas.style.width = `${newWidth}px`;
        canvas.style.height = `${newHeight}px`;
    });
    
    window.dispatchEvent(new Event('resize'));
    
})();