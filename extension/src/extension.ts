import * as vscode from 'vscode';
import { VGASimulatorProvider } from './vgaSimulatorProvider';
import { VerilogParser } from './verilogParser';
import { VerilatorWASMSimulator } from './verilatorSimulator';

export function activate(context: vscode.ExtensionContext) {
    console.log('VGA Simulator extension is now active!');

    // Create VGA simulator provider
    const vgaSimulatorProvider = new VGASimulatorProvider(context.extensionUri);
    const verilogParser = new VerilogParser();
    const verilatorSimulator = new VerilatorWASMSimulator(context.extensionUri);

    // Register the webview provider
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(
            'vga-simulator-view',
            vgaSimulatorProvider
        )
    );

    // Register commands
    let openSimulatorCommand = vscode.commands.registerCommand('vga-simulator.openSimulator', async () => {
        const panel = vscode.window.createWebviewPanel(
            'vgaSimulator',
            'VGA Simulator',
            vscode.ViewColumn.Two,
            {
                enableScripts: true,
                retainContextWhenHidden: true
            }
        );

        // Get the current Verilog file content
        const editor = vscode.window.activeTextEditor;
        if (editor && editor.document.languageId === 'verilog') {
            const verilogContent = editor.document.getText();
            const vgaSignals = verilogParser.parseVGASignals(verilogContent);
            
            // Compile the Verilog code using Verilator
            const compilationSuccess = await verilatorSimulator.compile(verilogContent);
            
            // Check if WASM is available
            const wasmAvailable = verilatorSimulator.isWASMAvailable();
            
            panel.webview.html = getWebviewContent(panel.webview, context.extensionUri, vgaSignals, verilatorSimulator, compilationSuccess, wasmAvailable);
            
            // Handle messages from webview
            panel.webview.onDidReceiveMessage(
                async (message: any) => {
                    switch (message.command) {
                        case 'simulate':
                            vscode.window.showInformationMessage('VGA simulation started!');
                            break;
                        case 'reset':
                            verilatorSimulator.reset();
                            vscode.window.showInformationMessage('VGA simulation reset!');
                            break;
                        case 'compile':
                            const success = await verilatorSimulator.compile(verilogContent);
                            panel.webview.postMessage({ 
                                command: 'compilationResult', 
                                success: success 
                            });
                            break;
                        case 'getVGAFrame':
                            // Generate complete VGA frame using Verilator
                            const frame = await verilatorSimulator.getFrame();
                            panel.webview.postMessage({
                                command: 'vgaFrame',
                                data: {
                                    width: frame.width,
                                    height: frame.height,
                                    pixels: Array.from(frame.pixels), // Convert to regular array for JSON serialization
                                    frameNumber: frame.frameNumber,
                                    clockCount: frame.clockCount
                                }
                            });
                            break;
                        case 'hideCompilationStatus':
                            panel.webview.postMessage({ 
                                command: 'hideCompilationStatus'
                            });
                            break;
                    }
                },
                undefined,
                context.subscriptions
            );
        } else {
            vscode.window.showWarningMessage('Please open a Verilog file to use the VGA Simulator.');
        }
    });

    let simulateCommand = vscode.commands.registerCommand('vga-simulator.simulate', () => {
        vscode.commands.executeCommand('vga-simulator.openSimulator');
    });

    let resetCommand = vscode.commands.registerCommand('vga-simulator.reset', () => {
        verilatorSimulator.reset();
        vscode.window.showInformationMessage('VGA simulation reset!');
    });

    context.subscriptions.push(openSimulatorCommand, simulateCommand, resetCommand);
}

function getWebviewContent(webview: vscode.Webview, extensionUri: vscode.Uri, vgaSignals: any, simulator: VerilatorWASMSimulator, compilationSuccess: boolean, wasmAvailable: boolean): string {
    const styleResetUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'reset.css'));
    const styleVSCodeUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'vscode.css'));

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>VGA Simulator</title>
    <link href="${styleResetUri}" rel="stylesheet">
    <link href="${styleVSCodeUri}" rel="stylesheet">
    <style>
        body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            padding: 20px;
        }
        
        .controls {
            margin-bottom: 20px;
            display: flex;
            gap: 10px;
            align-items: center;
        }
        
        .btn {
            padding: 8px 16px;
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
        }
        
        .btn:hover {
            background-color: var(--vscode-button-hoverBackground);
        }
        
        .btn.running {
            background-color: #4CAF50;
        }
        
        .btn.error {
            background-color: #f44336;
        }
        
        .vga-display {
            border: 2px solid var(--vscode-panel-border);
            background-color: #000;
            margin: 20px 0;
            position: relative;
            overflow: hidden;
        }
        
        .vga-canvas {
            display: block;
            background-color: #000;
        }
        
        .status {
            font-family: monospace;
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
            margin-top: 10px;
        }
        
        .fps {
            position: absolute;
            top: 10px;
            right: 10px;
            color: #4CAF50;
            font-weight: bold;
            font-size: 14px;
        }
        
        .compilation-status {
            padding: 8px;
            margin: 10px 0;
            border-radius: 4px;
            font-weight: bold;
            opacity: 1;
            transition: opacity 0.5s ease-out;
        }
        
        .compilation-status.hidden {
            opacity: 0;
        }
        
        .compilation-success {
            background-color: #4CAF50;
            color: white;
        }
        
        .compilation-error {
            background-color: #f44336;
            color: white;
        }
        
        .simulator-info {
            background-color: var(--vscode-panel-background);
            border: 1px solid var(--vscode-panel-border);
            padding: 10px;
            margin: 10px 0;
            border-radius: 4px;
            font-size: 11px;
        }
        
        .wasm-status {
            background-color: var(--vscode-notifications-background);
            border: 1px solid var(--vscode-notifications-border);
            padding: 8px;
            margin: 10px 0;
            border-radius: 4px;
            font-size: 10px;
        }
    </style>
</head>
<body>
    <div class="compilation-status ${compilationSuccess ? 'compilation-success' : 'compilation-error'}" id="compilationStatus">
        ${compilationSuccess ? '✓ Verilog compiled successfully with Verilator' : '✗ Verilog compilation failed'}
    </div>
    
    <div class="simulator-info">
        <strong>Verilator WASM Simulator</strong><br>
        Real Verilog compilation and simulation using Verilator WebAssembly<br>
        High-performance simulation with proper Verilog semantics
    </div>
    
    <div class="wasm-status">
        <strong>WASM Status:</strong> ${wasmAvailable ? 'Real Verilator WASM available' : 'Fallback mode active (WASM not found)'}<br>
        ${wasmAvailable ? 'To enable real Verilator WASM: Place <code>verilator_bin.wasm</code> in the <code>resources/</code> folder' : ''}
    </div>
    
    <div class="controls">
        <button class="btn" id="simulateBtn">Simulate</button>
        <button class="btn" id="resetBtn">Reset</button>
        <button class="btn" id="compileBtn">Recompile</button>
    </div>
    
    <div class="vga-display">
        <canvas id="vgaCanvas" class="vga-canvas" width="640" height="480"></canvas>
        <div class="fps" id="fpsDisplay">FPS: 0</div>
    </div>
    
    <div class="status" id="statusDisplay">
        VGA simulation ready!<br>
        Clock: 0<br>
        Frame: 0<br>
        Resolution: 640x480<br>
        Status: Idle<br>
        Simulator: ${wasmAvailable ? 'Real Verilator WASM' : 'Verilator WASM (Fallback)'}
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        
        let canvas = document.getElementById('vgaCanvas');
        let ctx = canvas.getContext('2d');
        let isRunning = false;
        let frameCount = 0;
        let clockCount = 0;
        let lastTime = 0;
        let animationId;
        let currentFrame = null;
        
        // VGA timing constants (640x480 @ 60Hz)
        const H_SYNC_PULSE = 96;
        const H_BACK_PORCH = 48;
        const H_DISPLAY = 640;
        const H_FRONT_PORCH = 16;
        const H_TOTAL = H_SYNC_PULSE + H_BACK_PORCH + H_DISPLAY + H_FRONT_PORCH;
        
        const V_SYNC_PULSE = 2;
        const V_BACK_PORCH = 33;
        const V_DISPLAY = 480;
        const V_FRONT_PORCH = 10;
        const V_TOTAL = V_SYNC_PULSE + V_BACK_PORCH + V_DISPLAY + V_FRONT_PORCH;
        
        // Hide compilation status after 3 seconds
        setTimeout(() => {
            const statusDiv = document.getElementById('compilationStatus');
            if (statusDiv) {
                statusDiv.classList.add('hidden');
                setTimeout(() => {
                    statusDiv.style.display = 'none';
                }, 500);
            }
        }, 3000);
        
        function drawFrame() {
            if (!isRunning) return;
            
            // Request VGA frame from Verilator
            vscode.postMessage({ command: 'getVGAFrame' });
            
            // Clear canvas
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, 640, 480);
            
            // Draw the complete frame if available
            if (currentFrame && currentFrame.pixels) {
                const imageData = ctx.createImageData(currentFrame.width, currentFrame.height);
                imageData.data.set(currentFrame.pixels);
                ctx.putImageData(imageData, 0, 0);
            }
            
            frameCount++;
            clockCount += H_TOTAL * V_TOTAL;
            
            // Update status with real simulation data
            document.getElementById('statusDisplay').innerHTML = \`
                VGA simulation running!<br>
                Clock: \${clockCount.toLocaleString()}<br>
                Frame: \${frameCount}<br>
                Resolution: 640x480<br>
                Status: Running<br>
                Frame Number: \${currentFrame ? currentFrame.frameNumber : 0}<br>
                Simulator: ${wasmAvailable ? 'Real Verilator WASM' : 'Verilator WASM (Fallback)'}
            \`;
            
            animationId = requestAnimationFrame(drawFrame);
        }
        
        function updateFPS(currentTime) {
            if (lastTime === 0) {
                lastTime = currentTime;
                return;
            }
            
            const deltaTime = currentTime - lastTime;
            const fps = Math.round(1000 / deltaTime);
            document.getElementById('fpsDisplay').textContent = \`FPS: \${fps}\`;
            lastTime = currentTime;
        }
        
        function startSimulation() {
            if (isRunning) return;
            
            isRunning = true;
            document.getElementById('simulateBtn').textContent = 'Running';
            document.getElementById('simulateBtn').classList.add('running');
            
            vscode.postMessage({ command: 'simulate' });
            
            function animate(currentTime) {
                updateFPS(currentTime);
                drawFrame();
                if (isRunning) {
                    animationId = requestAnimationFrame(animate);
                }
            }
            
            animationId = requestAnimationFrame(animate);
        }
        
        function stopSimulation() {
            isRunning = false;
            document.getElementById('simulateBtn').textContent = 'Simulate';
            document.getElementById('simulateBtn').classList.remove('running');
            
            if (animationId) {
                cancelAnimationFrame(animationId);
            }
        }
        
        function resetSimulation() {
            stopSimulation();
            frameCount = 0;
            clockCount = 0;
            lastTime = 0;
            currentFrame = null;
            
            // Clear canvas
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, 640, 480);
            
            document.getElementById('statusDisplay').innerHTML = \`
                VGA simulation ready!<br>
                Clock: 0<br>
                Frame: 0<br>
                Resolution: 640x480<br>
                Status: Idle<br>
                Simulator: ${wasmAvailable ? 'Real Verilator WASM' : 'Verilator WASM (Fallback)'}
            \`;
            
            document.getElementById('fpsDisplay').textContent = 'FPS: 0';
            
            vscode.postMessage({ command: 'reset' });
        }
        
        function recompile() {
            vscode.postMessage({ command: 'compile' });
        }
        
        // Event listeners
        document.getElementById('simulateBtn').addEventListener('click', () => {
            if (isRunning) {
                stopSimulation();
            } else {
                startSimulation();
            }
        });
        
        document.getElementById('resetBtn').addEventListener('click', resetSimulation);
        document.getElementById('compileBtn').addEventListener('click', recompile);
        
        // Handle messages from extension
        window.addEventListener('message', event => {
            const message = event.data;
            switch (message.command) {
                case 'compilationResult':
                    const statusDiv = document.getElementById('compilationStatus');
                    if (message.success) {
                        statusDiv.className = 'compilation-status compilation-success';
                        statusDiv.textContent = '✓ Verilog compiled successfully with Verilator';
                    } else {
                        statusDiv.className = 'compilation-status compilation-error';
                        statusDiv.textContent = '✗ Verilog compilation failed';
                    }
                    statusDiv.style.display = 'block';
                    statusDiv.classList.remove('hidden');
                    
                    // Hide again after 3 seconds
                    setTimeout(() => {
                        statusDiv.classList.add('hidden');
                        setTimeout(() => {
                            statusDiv.style.display = 'none';
                        }, 500);
                    }, 3000);
                    break;
                case 'vgaFrame':
                    currentFrame = message.data;
                    break;
                case 'hideCompilationStatus':
                    const statusDiv2 = document.getElementById('compilationStatus');
                    if (statusDiv2) {
                        statusDiv2.classList.add('hidden');
                        setTimeout(() => {
                            statusDiv2.style.display = 'none';
                        }, 500);
                    }
                    break;
            }
        });
        
        // Initialize
        resetSimulation();
    </script>
</body>
</html>`;
}

export function deactivate() {} 