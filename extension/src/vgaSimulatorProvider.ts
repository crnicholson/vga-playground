import * as vscode from 'vscode';

export class VGASimulatorProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'vga-simulator-view';

    constructor(
        private readonly _extensionUri: vscode.Uri,
    ) { }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [
                this._extensionUri
            ]
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        // Handle messages from the webview
        webviewView.webview.onDidReceiveMessage((data: any) => {
            switch (data.type) {
                case 'simulate':
                    vscode.window.showInformationMessage('VGA simulation started!');
                    break;
                case 'reset':
                    vscode.window.showInformationMessage('VGA simulation reset!');
                    break;
            }
        });
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>VGA Simulator</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            padding: 10px;
        }
        
        .controls {
            margin-bottom: 15px;
            display: flex;
            flex-direction: column;
            gap: 8px;
        }
        
        .btn {
            padding: 6px 12px;
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 11px;
            width: 100%;
        }
        
        .btn:hover {
            background-color: var(--vscode-button-hoverBackground);
        }
        
        .btn.running {
            background-color: #4CAF50;
        }
        
        .vga-display {
            border: 1px solid var(--vscode-panel-border);
            background-color: #000;
            margin: 10px 0;
            position: relative;
            overflow: hidden;
            width: 100%;
            height: 200px;
        }
        
        .vga-canvas {
            display: block;
            background-color: #000;
            width: 100%;
            height: 100%;
        }
        
        .status {
            font-family: monospace;
            font-size: 10px;
            color: var(--vscode-descriptionForeground);
            margin-top: 8px;
            line-height: 1.3;
        }
        
        .fps {
            position: absolute;
            top: 5px;
            right: 5px;
            color: #4CAF50;
            font-weight: bold;
            font-size: 12px;
        }
        
        .select-example {
            padding: 4px 8px;
            background-color: var(--vscode-dropdown-background);
            color: var(--vscode-dropdown-foreground);
            border: 1px solid var(--vscode-dropdown-border);
            border-radius: 4px;
            font-size: 10px;
            width: 100%;
        }
    </style>
</head>
<body>
    <div class="controls">
        <button class="btn" id="simulateBtn">Simulate</button>
        <button class="btn" id="resetBtn">Reset</button>
        <select class="select-example" id="exampleSelect">
            <option value="stripes">Stripes Pattern</option>
            <option value="checkerboard">Checkerboard</option>
            <option value="gradient">Gradient</option>
            <option value="test">Test Pattern</option>
        </select>
    </div>
    
    <div class="vga-display">
        <canvas id="vgaCanvas" class="vga-canvas" width="320" height="200"></canvas>
        <div class="fps" id="fpsDisplay">FPS: 60</div>
    </div>
    
    <div class="status" id="statusDisplay">
        VGA simulation started!<br>
        Clock: 0<br>
        Frame: 0<br>
        Resolution: 320x200<br>
        Status: Idle
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
        
        // VGA timing constants (320x200 @ 60Hz)
        const H_SYNC_PULSE = 96;
        const H_BACK_PORCH = 48;
        const H_DISPLAY = 320;
        const H_FRONT_PORCH = 16;
        const H_TOTAL = H_SYNC_PULSE + H_BACK_PORCH + H_DISPLAY + H_FRONT_PORCH;
        
        const V_SYNC_PULSE = 2;
        const V_BACK_PORCH = 33;
        const V_DISPLAY = 200;
        const V_FRONT_PORCH = 10;
        const V_TOTAL = V_SYNC_PULSE + V_BACK_PORCH + V_DISPLAY + V_FRONT_PORCH;
        
        // Color patterns
        const patterns = {
            stripes: (x, y) => {
                const stripeWidth = 40;
                const stripeIndex = Math.floor(x / stripeWidth);
                const colors = [
                    [255, 255, 255], // White
                    [255, 255, 0],   // Yellow
                    [0, 255, 255],   // Cyan
                    [0, 255, 0],     // Green
                    [255, 0, 255],   // Magenta
                    [255, 0, 0],     // Red
                    [0, 0, 255],     // Blue
                    [0, 0, 0]        // Black
                ];
                return colors[stripeIndex % colors.length];
            },
            checkerboard: (x, y) => {
                const squareSize = 20;
                const isEven = ((Math.floor(x / squareSize) + Math.floor(y / squareSize)) % 2) === 0;
                return isEven ? [255, 255, 255] : [0, 0, 0];
            },
            gradient: (x, y) => {
                const r = Math.floor((x / 320) * 255);
                const g = Math.floor((y / 200) * 255);
                const b = Math.floor(((x + y) / (320 + 200)) * 255);
                return [r, g, b];
            },
            test: (x, y) => {
                // Standard color bar test pattern
                const barWidth = 40;
                const barIndex = Math.floor(x / barWidth);
                const colors = [
                    [255, 255, 255], // White
                    [255, 255, 0],   // Yellow
                    [0, 255, 255],   // Cyan
                    [0, 255, 0],     // Green
                    [255, 0, 255],   // Magenta
                    [255, 0, 0],     // Red
                    [0, 0, 255],     // Blue
                    [0, 0, 0]        // Black
                ];
                return colors[barIndex % colors.length];
            }
        };
        
        let currentPattern = 'stripes';
        
        function drawFrame() {
            if (!isRunning) return;
            
            const pattern = patterns[currentPattern];
            
            // Clear canvas
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, 320, 200);
            
            // Draw pattern
            for (let y = 0; y < 200; y++) {
                for (let x = 0; x < 320; x++) {
                    const [r, g, b] = pattern(x, y);
                    ctx.fillStyle = \`rgb(\${r}, \${g}, \${b})\`;
                    ctx.fillRect(x, y, 1, 1);
                }
            }
            
            frameCount++;
            clockCount += H_TOTAL * V_TOTAL;
            
            // Update status
            document.getElementById('statusDisplay').innerHTML = \`
                VGA simulation started!<br>
                Clock: \${clockCount.toLocaleString()}<br>
                Frame: \${frameCount}<br>
                Resolution: 320x200<br>
                Status: Running
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
            
            vscode.postMessage({ type: 'simulate' });
            
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
            
            // Clear canvas
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, 320, 200);
            
            document.getElementById('statusDisplay').innerHTML = \`
                VGA simulation started!<br>
                Clock: 0<br>
                Frame: 0<br>
                Resolution: 320x200<br>
                Status: Idle
            \`;
            
            document.getElementById('fpsDisplay').textContent = 'FPS: 0';
            
            vscode.postMessage({ type: 'reset' });
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
        
        document.getElementById('exampleSelect').addEventListener('change', (e) => {
            currentPattern = e.target.value;
        });
        
        // Initialize
        resetSimulation();
    </script>
</body>
</html>`;
    }
} 