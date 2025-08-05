"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VGASimulatorPanel = void 0;
const vscode = require("vscode");
class VGASimulatorPanel {
    updateCurrentCode() {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            this._currentCode = editor.document.getText();
        }
    }
    static createOrShow(extensionUri) {
        const column = vscode.window.activeTextEditor
            ? vscode.ViewColumn.Beside
            : undefined;
        if (VGASimulatorPanel.currentPanel) {
            VGASimulatorPanel.currentPanel._panel.reveal(column);
            return;
        }
        const panel = vscode.window.createWebviewPanel(VGASimulatorPanel.viewType, 'VGA Simulator', column || vscode.ViewColumn.One, {
            enableScripts: true,
            localResourceRoots: [
                vscode.Uri.joinPath(extensionUri, 'media'),
                vscode.Uri.joinPath(extensionUri, 'out', 'compiled')
            ]
        });
        VGASimulatorPanel.currentPanel = new VGASimulatorPanel(panel, extensionUri);
    }
    static simulate() {
        if (VGASimulatorPanel.currentPanel) {
            VGASimulatorPanel.currentPanel._simulate();
        }
    }
    static reset() {
        if (VGASimulatorPanel.currentPanel) {
            VGASimulatorPanel.currentPanel._reset();
        }
    }
    static updateCode(code) {
        if (VGASimulatorPanel.currentPanel) {
            VGASimulatorPanel.currentPanel._updateCode(code);
        }
    }
    static dispose() {
        if (VGASimulatorPanel.currentPanel) {
            VGASimulatorPanel.currentPanel.dispose();
        }
    }
    constructor(panel, extensionUri) {
        this._disposables = [];
        this._isRunning = false;
        this._currentCode = "";
        this._panel = panel;
        this._extensionUri = extensionUri;
        this._update();
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
        this._panel.webview.onDidReceiveMessage(async (message) => {
            switch (message.type) {
                case 'simulate':
                    const editor = vscode.window.activeTextEditor;
                    if (editor && message.code !== undefined) {
                        const edit = new vscode.WorkspaceEdit();
                        const fullRange = new vscode.Range(editor.document.positionAt(0), editor.document.positionAt(editor.document.getText().length));
                        edit.replace(editor.document.uri, fullRange, message.code);
                        await vscode.workspace.applyEdit(edit);
                        await editor.document.save();
                    }
                    this._simulate();
                    return;
                case 'reset':
                    this._reset();
                    return;
                case 'codeChange':
                    this._currentCode = message.code;
                    this._compileAndRun();
                    return;
                case 'selectExample':
                    this._loadExample(message.example);
                    return;
            }
        }, null, this._disposables);
    }
    dispose() {
        VGASimulatorPanel.currentPanel = undefined;
        this._panel.dispose();
        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }
    _simulate() {
        this._isRunning = true;
        this._panel.webview.postMessage({ type: 'startSimulation' });
        this._compileAndRun();
    }
    _reset() {
        this._isRunning = false;
        this._panel.webview.postMessage({ type: 'resetSimulation' });
    }
    _updateCode(code) {
        this._currentCode = code;
        this._panel.webview.postMessage({ type: 'updateCode', code });
    }
    _compileAndRun() {
        if (!this._isRunning)
            return;
        this._panel.webview.postMessage({
            type: 'compileAndRun',
            code: this._currentCode
        });
    }
    _loadExample(exampleName) {
        const examples = this._getExamples();
        const example = examples[exampleName];
        if (example) {
            this._currentCode = example;
            this._panel.webview.postMessage({
                type: 'loadExample',
                code: example,
                name: exampleName
            });
        }
    }
    _getExamples() {
        return {
            'stripes': `// Verilog stripes pattern
\`default_nettype none
module top(...); /* full stripes code here */ endmodule`,
            'checkerboard': `// Verilog checkerboard pattern
module top(...); /* full checkerboard code here */ endmodule`
        };
    }
    _update() {
        const webview = this._panel.webview;
        this._panel.webview.html = this._getHtmlForWebview(webview);
    }
    _getHtmlForWebview(webview) {
        const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'vgaSimulator.js'));
        const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'vgaSimulator.css'));
        const wasmUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'verilator_bin.wasm'));
        const extUriScript = `<script>window.extensionUri = '${webview.asWebviewUri(this._extensionUri)}'; window.wasmUri = '${wasmUri}';</script>`;
        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <link href="${styleUri}" rel="stylesheet">
            <title>VGA Simulator</title>
        </head>
        <body>
            <div class="container">
                <div class="controls">
                    <button id="simulateBtn" class="btn primary">Simulate</button>
                    <button id="resetBtn" class="btn">Reset</button>
                    <select id="exampleSelect" class="select">
                        <option value="">Select Example...</option>
                        <option value="stripes">Stripes</option>
                        <option value="checkerboard">Checkerboard</option>
                    </select>
                    <span id="status" class="status">Ready</span>
                </div>
                <div class="simulator-container">
                    <canvas id="vgaCanvas" width="640" height="480"></canvas>
                </div>
                <div class="info-panel">
                    <div class="info-item"><span class="label">FPS:</span> <span id="fps" class="value">0</span></div>
                    <div class="info-item"><span class="label">Clock:</span> <span id="clock" class="value">0</span></div>
                    <div class="info-item"><span class="label">Frame:</span> <span id="frame" class="value">0</span></div>
                    <div class="info-item"><span class="label">Resolution:</span> <span id="resolution" class="value">640x480</span></div>
                    <div class="info-item"><span class="label">Status:</span> <span id="simStatus" class="value">Idle</span></div>
                </div>
            </div>
            ${extUriScript}
            <script src="${scriptUri}"></script>
        </body>
        </html>`;
    }
}
exports.VGASimulatorPanel = VGASimulatorPanel;
VGASimulatorPanel.viewType = 'vgaSimulator';
//# sourceMappingURL=vgaSimulatorPanel.js.map