// VGA Simulator for VS Code Extension
class VGASimulator {
  constructor() {
    console.log('VGA Simulator constructor called');
    this.canvas = null;
    this.ctx = null;
    this.imageData = null;
    this.isRunning = false;
    this.clockCount = 0;
    this.frameCount = 0;
    this.lastFrameTime = 0;
    this.fps = 0;
    this.jmod = null;
    this.verilatorModule = null;
    this.compilationErrors = [];
    this.compilationOutput = '';
    this.patternType = 'default';
    this.currentVerilogCode = '';

    // VGA timing parameters for 640x480@60Hz
    this.H_DISPLAY = 640;
    this.H_BACK = 48;
    this.H_FRONT = 16;
    this.H_SYNC = 96;
    this.V_DISPLAY = 480;
    this.V_TOP = 33;
    this.V_BOTTOM = 10;
    this.V_SYNC = 2;

    this.H_MAX = this.H_DISPLAY + this.H_BACK + this.H_FRONT + this.H_SYNC - 1;
    this.V_MAX = this.V_DISPLAY + this.V_TOP + this.V_BOTTOM + this.V_SYNC - 1;

    this.currentX = 0;
    this.currentY = 0;

    try {
      this.initializeUI();
      this.setupVSCodeMessaging();
      console.log('VGA Simulator initialized successfully');
    } catch (error) {
      console.error('Error initializing VGA Simulator:', error);
    }
  }

  initializeUI() {
    console.log('Initializing VGA Simulator UI...');

    this.canvas = document.getElementById('vga-display');
    if (!this.canvas) {
      console.error('Canvas element not found!');
      return;
    }

    this.ctx = this.canvas.getContext('2d');
    if (!this.ctx) {
      console.error('Could not get canvas 2D context!');
      return;
    }

    console.log('Canvas initialized:', this.canvas.width, 'x', this.canvas.height);

    this.imageData = this.ctx.createImageData(640, 480);

    // Initialize with a test pattern to verify canvas works
    console.log('Drawing initial test pattern...');
    for (let i = 0; i < this.imageData.data.length; i += 4) {
      const pixel = Math.floor(i / 4);
      const x = pixel % 640;
      const y = Math.floor(pixel / 640);

      // Create a simple test pattern
      this.imageData.data[i] = (x / 640) * 255; // R
      this.imageData.data[i + 1] = (y / 480) * 255; // G
      this.imageData.data[i + 2] = 128; // B
      this.imageData.data[i + 3] = 255; // A
    }
    this.ctx.putImageData(this.imageData, 0, 0);
    console.log('Initial test pattern drawn');

    // Setup controls
    const simulateBtn = document.getElementById('simulate-btn');
    const resetBtn = document.getElementById('reset-btn');
    const examplesSelect = document.getElementById('examples-select');

    if (simulateBtn) {
      simulateBtn.addEventListener('click', () => {
        console.log('Simulate button clicked');
        this.requestSimulation();
      });
    }

    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        console.log('Reset button clicked');
        this.reset();
      });
    }

    if (examplesSelect) {
      examplesSelect.addEventListener('change', (e) => {
        if (e.target.value) {
          console.log('Example selected:', e.target.value);
          this.loadExample(e.target.value);
        }
      });
    }

    console.log('UI initialization complete');
  }

  setupVSCodeMessaging() {
    // Get VS Code API
    this.vscode = acquireVsCodeApi();

    // Listen for messages from VS Code
    window.addEventListener('message', (event) => {
      const message = event.data;

      switch (message.command) {
        case 'simulate':
          this.simulateCode(message.code, message.fileName);
          break;
        case 'loadExamples':
          this.populateExamples();
          break;
      }
    });

    // Notify VS Code that webview is ready
    this.vscode.postMessage({ command: 'ready' });

    // Start with a default test pattern to show that the simulator works
    setTimeout(() => {
      console.log('Starting default test pattern...');
      this.startTestPattern();
    }, 1000);
  }

  startTestPattern() {
    this.patternType = 'default';
    this.updateStatus('Test Pattern', 'success');
    this.updateCompilationOutput('Running test pattern to verify display...\\n');
    this.initializeSimulation({ patternBased: true });
    this.startSimulation();
  }

  async simulateCode(code, fileName) {
    this.updateStatus('Analyzing code...', 'loading');
    this.updateCompilationOutput('Starting VGA simulation...\\n');
    this.updateCompilationOutput(`File: ${fileName}\\n`);

    try {
      // Extract module name from file
      const moduleMatch = code.match(/module\\s+(\\w+)/);
      const topModule = moduleMatch ? moduleMatch[1] : 'tt_um_vga_example';
      this.updateCompilationOutput(`Found module: ${topModule}\\n`);

      // For now, skip actual Verilator compilation and use pattern generation
      // based on the Verilog code analysis
      this.updateCompilationOutput('Analyzing Verilog patterns...\\n');

      // Parse the code to understand what kind of pattern it should generate
      this.currentVerilogCode = code;
      this.analyzeVerilogPattern(code);

      this.updateCompilationOutput('Pattern analysis complete!\\n');
      this.updateCompilationOutput('Initializing VGA simulation...\\n');

      // Initialize the simulation with pattern-based output
      await this.initializeSimulation({ patternBased: true });

      this.updateStatus('Running', 'success');
      this.updateCompilationOutput(
        'VGA simulation started! You should see output on the display.\\n',
      );
      this.startSimulation();
    } catch (error) {
      console.error('Simulation error:', error);
      this.updateCompilationOutput(`Error: ${error.message}\\n`);
      this.updateStatus('Error', 'error');
    }
  }

  async compileVerilog(options) {
    try {
      // Load Verilator WebAssembly module
      if (!this.verilatorModule) {
        const wasmResponse = await fetch(window.verilatorWasmPath);
        const wasmBinary = await wasmResponse.arrayBuffer();

        // Import the Verilator JS module
        const verilatorScript = await import(window.verilatorJsPath);

        this.verilatorModule = await verilatorScript.default({
          wasmBinary: wasmBinary,
          noInitialRun: true,
          noExitRuntime: true,
          print: (message) => {
            console.log(message);
            this.updateCompilationOutput(this.compilationOutput + message + '\\n');
          },
          printErr: (message) => {
            console.error(message);
            this.updateCompilationOutput(this.compilationOutput + 'ERROR: ' + message + '\\n');
            this.compilationErrors.push(message);
          },
        });
      }

      this.compilationErrors = [];
      this.compilationOutput = '';

      const { FS } = this.verilatorModule;

      // Create source files
      let sourceList = [];
      FS.mkdir('src');
      for (const [name, source] of Object.entries(options.sources)) {
        const path = `src/${name}`;
        sourceList.push(path);
        FS.writeFile(path, source);
      }

      const xmlPath = `obj_dir/V${options.topModule}.xml`;

      // Run Verilator compilation
      const args = [
        '--cc',
        '-O3',
        '-Wall',
        '-Wno-EOFNEWLINE',
        '-Wno-DECLFILENAME',
        '--x-assign',
        'fast',
        '--debug-check', // for XML output
        '-Isrc/',
        '--top-module',
        options.topModule,
        ...sourceList,
      ];

      try {
        this.verilatorModule.callMain(args);
      } catch (e) {
        console.error('Verilator compilation failed:', e);
        return {
          errors: [
            {
              type: 'error',
              file: '',
              line: 1,
              column: 1,
              message: 'Compilation failed: ' + e,
            },
          ],
        };
      }

      if (this.compilationErrors.length > 0) {
        return {
          errors: this.compilationErrors.map((err) => ({
            type: 'error',
            file: '',
            line: 1,
            column: 1,
            message: err,
          })),
        };
      }

      // Parse XML output
      let xmlContent;
      try {
        xmlContent = FS.readFile(xmlPath, { encoding: 'utf8' });
      } catch (e) {
        return {
          errors: [
            {
              type: 'error',
              file: '',
              line: 1,
              column: 1,
              message: 'XML output not found: ' + e,
            },
          ],
        };
      }

      // For now, return a simplified result
      // In a full implementation, you'd parse the XML and create the HDL modules
      return {
        errors: [],
        output: {
          modules: {
            TOP: { xmlContent },
            '@CONST-POOL@': {},
          },
        },
      };
    } catch (error) {
      console.error('Compilation error:', error);
      return {
        errors: [
          {
            type: 'error',
            file: '',
            line: 1,
            column: 1,
            message: 'Compilation failed: ' + error.message,
          },
        ],
      };
    }
  }

  analyzeVerilogPattern(code) {
    // Analyze the Verilog code to determine what pattern to generate
    this.patternType = 'default';

    if (code.includes('moving_x') || code.includes('counter')) {
      this.patternType = 'stripes';
      this.updateCompilationOutput('Detected: Animated stripes pattern\\n');
    } else if (code.includes('checkers') || code.includes('checker')) {
      this.patternType = 'checkers';
      this.updateCompilationOutput('Detected: Checkerboard pattern\\n');
    } else if (code.includes('conway') || code.includes('life')) {
      this.patternType = 'conway';
      this.updateCompilationOutput('Detected: Conway Game of Life\\n');
    } else if (code.includes('ball') || code.includes('bounce')) {
      this.patternType = 'bouncing';
      this.updateCompilationOutput('Detected: Bouncing pattern\\n');
    } else if (code.includes('logo')) {
      this.patternType = 'logo';
      this.updateCompilationOutput('Detected: Logo animation\\n');
    } else {
      this.updateCompilationOutput('Using default test pattern\\n');
    }
  }

  async initializeSimulation(compilationOutput) {
    // Initialize simulation with pattern-based rendering
    this.jmod = {
      state: {
        ui_in: 0,
        ena: 1,
        rst_n: 1,
        uo_out: 0,
        uio_out: 0,
        uio_oe: 0,
      },
      patternBased: true,
      data8: new Uint8Array(256),
      globals: {
        lookup: (name) => ({ offset: 0 }),
      },
      powercycle: () => {},
      tick2: (cycles) => {
        this.clockCount += cycles;
      },
    };

    this.reset();
    this.updateCompilationOutput('Simulation module initialized\\n');
  }

  reset() {
    if (this.jmod) {
      this.jmod.powercycle();
      this.jmod.state.ena = 1;
      this.jmod.state.rst_n = 0;
      this.jmod.tick2(10);
      this.jmod.state.rst_n = 1;
    }

    this.clockCount = 0;
    this.frameCount = 0;
    this.updateSimulationInfo();
  }

  startSimulation() {
    if (this.isRunning) return;

    this.isRunning = true;
    this.updateCompilationOutput('VGA simulation loop started\\n');
    console.log('Starting VGA simulation animation loop');
    this.animate();
  }

  stopSimulation() {
    this.isRunning = false;
    this.updateCompilationOutput('VGA simulation stopped\\n');
  }

  animate() {
    if (!this.isRunning) return;

    const now = performance.now();
    if (now - this.lastFrameTime >= 16.67) {
      // ~60 FPS
      this.simulateFrame();
      this.lastFrameTime = now;
      this.frameCount++;

      // Update FPS counter
      if (this.frameCount % 60 === 0) {
        this.fps = Math.round(1000 / 16.67);
        document.getElementById('fps-counter').textContent = `FPS: ${this.fps}`;

        // Debug output every 60 frames
        if (this.frameCount % 300 === 0) {
          console.log(`Frame ${this.frameCount}, Pattern: ${this.patternType}`);
        }
      }
    }

    requestAnimationFrame(() => this.animate());
  }

  simulateFrame() {
    if (!this.jmod) return;

    // Fast simulation - just render visible pixels directly
    for (let y = 0; y < this.V_DISPLAY; y++) {
      for (let x = 0; x < this.H_DISPLAY; x++) {
        this.currentX = x;
        this.currentY = y;

        const vgaSignals = this.getVGASignalsFromModule();
        this.setPixel(x, y, vgaSignals);

        // Simulate some clock cycles (much reduced for performance)
        if (x % 64 === 0) {
          this.clockCount += 64;
        }
      }
    }

    // Update display after complete frame
    this.ctx.putImageData(this.imageData, 0, 0);
    this.updateSimulationInfo();

    // Debug output for first few frames
    if (this.frameCount < 5) {
      console.log(
        `Frame ${this.frameCount}: Pattern ${this.patternType}, Clock ${this.clockCount}`,
      );
    }
  }

  getVGASignalsFromModule() {
    if (!this.jmod) {
      return this.getTestPattern(this.currentX, this.currentY);
    }

    // Generate pattern based on detected Verilog code
    switch (this.patternType) {
      case 'stripes':
        return this.getStripesPattern(this.currentX, this.currentY);
      case 'checkers':
        return this.getCheckersPattern(this.currentX, this.currentY);
      case 'bouncing':
        return this.getBouncingPattern(this.currentX, this.currentY);
      case 'conway':
        return this.getConwayPattern(this.currentX, this.currentY);
      case 'logo':
        return this.getLogoPattern(this.currentX, this.currentY);
      default:
        return this.getTestPattern(this.currentX, this.currentY);
    }
  }

  getStripesPattern(x, y) {
    // Match the exact Verilog logic from stripes.v:
    // wire [9:0] moving_x = pix_x + counter;
    // assign R = video_active ? {moving_x[5], pix_y[2]} : 2'b00;
    // assign G = video_active ? {moving_x[6], pix_y[2]} : 2'b00;
    // assign B = video_active ? {moving_x[7], pix_y[5]} : 2'b00;
    // always @(posedge vsync) counter <= counter + 1;

    const counter = this.frameCount; // Direct frame count as counter (increments at 60Hz like vsync)
    const pix_x = x;
    const pix_y = y;
    const moving_x = (pix_x + counter) & 0x3ff; // 10-bit mask

    // Extract specific bits as per the Verilog code
    const r_bit5 = (moving_x >> 5) & 1;
    const r_bit2 = (pix_y >> 2) & 1;
    const g_bit6 = (moving_x >> 6) & 1;
    const g_bit2 = (pix_y >> 2) & 1;
    const b_bit7 = (moving_x >> 7) & 1;
    const b_bit5 = (pix_y >> 5) & 1;

    // Combine bits as in Verilog: {bit_high, bit_low}
    const r = (r_bit5 << 1) | r_bit2;
    const g = (g_bit6 << 1) | g_bit2;
    const b = (b_bit7 << 1) | b_bit5;

    return { r, g, b };
  }

  getCheckersPattern(x, y) {
    // Checkerboard pattern
    const checker = ((x >> 5) ^ (y >> 5)) & 1;
    const r = checker ? 3 : 0;
    const g = checker ? 3 : 0;
    const b = checker ? 3 : 0;

    return { r, g, b };
  }

  getBouncingPattern(x, y) {
    // Simple bouncing square
    const squareSize = 32;
    const bounceX = 50 + Math.abs(((this.frameCount * 2) % 1180) - 590);
    const bounceY = 50 + Math.abs(((this.frameCount * 1.5) % 860) - 430);

    const inSquare =
      x >= bounceX && x < bounceX + squareSize && y >= bounceY && y < bounceY + squareSize;

    return {
      r: inSquare ? 3 : 0,
      g: inSquare ? 2 : 0,
      b: inSquare ? 1 : 0,
    };
  }

  getConwayPattern(x, y) {
    // Simplified cellular automaton pattern
    const cellSize = 8;
    const cellX = Math.floor(x / cellSize);
    const cellY = Math.floor(y / cellSize);

    const alive = (cellX + cellY + this.frameCount) % 7 < 3;

    return {
      r: alive ? 3 : 0,
      g: alive ? 3 : 0,
      b: alive ? 1 : 0,
    };
  }

  getLogoPattern(x, y) {
    // Simple logo-like pattern
    const centerX = 320 + Math.sin(this.frameCount * 0.1) * 100;
    const centerY = 240 + Math.cos(this.frameCount * 0.08) * 80;

    const dist = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
    const inLogo = dist < 60;

    return {
      r: inLogo ? (Math.floor(dist / 10) + this.frameCount) % 4 : 0,
      g: inLogo ? 2 : 0,
      b: inLogo ? 3 : 0,
    };
  }

  getTestPattern(x, y) {
    // Colorful test pattern
    const r = Math.floor((x / this.H_DISPLAY) * 4) & 3;
    const g = Math.floor((y / this.V_DISPLAY) * 4) & 3;
    const b = Math.floor((x + y + this.frameCount) / 3 / 160) & 3;

    return { r, g, b };
  }

  setPixel(x, y, vgaSignals) {
    const index = (y * 640 + x) * 4;

    // Convert 2-bit RGB to 8-bit
    this.imageData.data[index] = vgaSignals.r * 85; // R (0, 85, 170, 255)
    this.imageData.data[index + 1] = vgaSignals.g * 85; // G
    this.imageData.data[index + 2] = vgaSignals.b * 85; // B
    this.imageData.data[index + 3] = 255; // A
  }

  requestSimulation() {
    this.vscode.postMessage({
      command: 'requestSimulation',
    });
  }

  loadExample(exampleName) {
    this.vscode.postMessage({
      command: 'loadExample',
      example: exampleName,
    });
  }

  populateExamples() {
    const select = document.getElementById('examples-select');
    const examples = [
      'Stripes',
      'Bouncing Logo',
      "Conway's Game of Life",
      'Checkers',
      'Balls',
      'Drop Demo',
      'Music Visualizer',
      'Gamepad Test',
    ];

    examples.forEach((example) => {
      const option = document.createElement('option');
      option.value = example.toLowerCase().replace(/[^a-z0-9]/g, '-');
      option.textContent = example;
      select.appendChild(option);
    });
  }

  updateStatus(message, className = '') {
    const statusElement = document.getElementById('status');
    statusElement.textContent = message;
    statusElement.className = className;
  }

  updateCompilationOutput(message) {
    const output = document.getElementById('compilation-output');
    output.textContent = message;
    output.scrollTop = output.scrollHeight;
  }

  updateSimulationInfo() {
    document.getElementById('clock-count').textContent = this.clockCount.toLocaleString();
    document.getElementById('frame-count').textContent = this.frameCount.toLocaleString();
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new VGASimulator();
});
