import * as vscode from 'vscode';
import * as path from 'path';

export class VGASimulatorPanel {
    public static currentPanel: VGASimulatorPanel | undefined;
    public static readonly viewType = 'vgaSimulator';

    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private _disposables: vscode.Disposable[] = [];

    public static createOrShow(extensionUri: vscode.Uri) {
        const column = vscode.window.activeTextEditor
            ? vscode.ViewColumn.Beside
            : undefined;

        if (VGASimulatorPanel.currentPanel) {
            VGASimulatorPanel.currentPanel._panel.reveal(column);
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            VGASimulatorPanel.viewType,
            'VGA Simulator',
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                localResourceRoots: [
                    vscode.Uri.joinPath(extensionUri, 'media'),
                    vscode.Uri.joinPath(extensionUri, 'out')
                ]
            }
        );

        VGASimulatorPanel.currentPanel = new VGASimulatorPanel(panel, extensionUri);
    }

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
        this._panel = panel;
        this._extensionUri = extensionUri;

        this._update();

        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

        this._panel.webview.onDidReceiveMessage(
            message => {
                switch (message.command) {
                    case 'alert':
                        vscode.window.showErrorMessage(message.text);
                        return;
                    case 'log':
                        console.log(message.text);
                        return;
                    case 'ready':
                        this._onWebviewReady();
                        return;
                }
            },
            null,
            this._disposables
        );
    }

    public simulateVerilogCode(code: string, fileName: string) {
        this._panel.webview.postMessage({
            command: 'simulate',
            code: code,
            fileName: fileName
        });
    }

    public loadExamples() {
        this._panel.webview.postMessage({
            command: 'loadExamples'
        });
    }

    public dispose() {
        VGASimulatorPanel.currentPanel = undefined;

        this._panel.dispose();

        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }

    private _onWebviewReady() {
        // Webview is ready, can send initial data
        console.log('VGA Simulator webview ready');
    }

    private _update() {
        const webview = this._panel.webview;
        this._panel.title = 'VGA Simulator';
        this._panel.webview.html = this._getHtmlForWebview(webview);
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        // Get paths to resources
        const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'vgaSimulator.js'));
        const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'vgaSimulator.css'));
        
        // Copy the compiled Verilator resources
        const verilatorWasmUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'verilator_bin.wasm'));
        const verilatorJsUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'verilator_bin.js'));

        const nonce = getNonce();

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}' ${webview.cspSource} 'unsafe-inline' 'unsafe-eval'; worker-src 'none'; img-src ${webview.cspSource} data:;">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link href="${styleUri}" rel="stylesheet">
    <title>VGA Simulator</title>
</head>
<body>
    <div id="container">
        <div id="controls">
            <button id="simulate-btn">Simulate</button>
            <button id="reset-btn">Reset</button>
            <select id="examples-select">
                <option value="">Select Example...</option>
            </select>
            <div id="status">Ready</div>
        </div>
        
        <div id="display-container">
            <canvas id="vga-display" width="640" height="480"></canvas>
            <div id="fps-counter">FPS: 0</div>
        </div>
        
        <div id="info-panel">
            <div id="compilation-output">VGA Simulator loaded. Open a .v or .sv file and click Simulate to start.</div>
            <div id="simulation-info">
                <div>Clock: <span id="clock-count">0</span></div>
                <div>Frame: <span id="frame-count">0</span></div>
                <div>Resolution: 640x480</div>
                <div>Status: <span id="sim-status">Idle</span></div>
            </div>
        </div>
    </div>

    <script nonce="${nonce}">
        console.log('VGA Simulator webview loading...');
        window.verilatorWasmPath = '${verilatorWasmUri}';
        window.verilatorJsPath = '${verilatorJsUri}';
        
        // Test canvas immediately
        window.addEventListener('DOMContentLoaded', () => {
            console.log('DOM loaded, testing canvas...');
            const canvas = document.getElementById('vga-display');
            const ctx = canvas.getContext('2d');
            
            // Fill with test pattern to verify canvas works
            ctx.fillStyle = 'red';
            ctx.fillRect(0, 0, 100, 100);
            ctx.fillStyle = 'green';
            ctx.fillRect(100, 0, 100, 100);
            ctx.fillStyle = 'blue';
            ctx.fillRect(200, 0, 100, 100);
            
            console.log('Test pattern drawn on canvas');
        });
    </script>
    <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
    }
}

function getNonce() {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}
