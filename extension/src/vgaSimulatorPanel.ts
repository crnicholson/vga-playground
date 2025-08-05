import * as vscode from 'vscode';

export class VGASimulatorPanel {
  public static currentPanel: VGASimulatorPanel | undefined;
  public static readonly viewType = 'vgaSimulator';

  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionUri: vscode.Uri;
  private _disposables: vscode.Disposable[] = [];
  private _isRunning = false;
  private _currentCode = '';

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
    this._panel = panel;
    this._extensionUri = extensionUri;

    const editor = vscode.window.activeTextEditor;
    if (editor && editor.document.languageId === 'verilog') {
      this._currentCode = editor.document.getText();
    }

    // Render initial HTML
    this._update();

    // Clean up when panel is disposed
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

    // Send initial code after webview is ready
    setTimeout(() => {
      this._panel.webview.postMessage({
        type: 'updateCode',
        code: this._currentCode
      });
    }, 100);

    // Handle messages from the webview
    this._panel.webview.onDidReceiveMessage(
      async message => {
        switch (message.type) {
          case 'simulate':
            this._simulate();
            return;
          case 'reset':
            this._reset();
            return;
          case 'updateCode':
            this._currentCode = message.code;
            return;
          case 'compileAndRun':
            this._compileAndRun();
            return;
        }
      },
      null,
      this._disposables
    );
  }

  public static createOrShow(extensionUri: vscode.Uri) {
    const column = vscode.window.activeTextEditor
      ? vscode.ViewColumn.Beside
      : vscode.ViewColumn.One;

    if (VGASimulatorPanel.currentPanel) {
      VGASimulatorPanel.currentPanel._panel.reveal(column);
    } else {
      const panel = vscode.window.createWebviewPanel(
        VGASimulatorPanel.viewType,
        'VGA Simulator',
        column,
        {
          enableScripts: true,
          localResourceRoots: [
            vscode.Uri.joinPath(extensionUri, 'media')
          ]
        }
      );
      VGASimulatorPanel.currentPanel = new VGASimulatorPanel(panel, extensionUri);
    }
  }

  public static simulate() {
    VGASimulatorPanel.currentPanel?._simulate();
  }

  public static reset() {
    VGASimulatorPanel.currentPanel?._reset();
  }

  public static updateCode(code: string) {
    VGASimulatorPanel.currentPanel?._updateCode(code);
  }

  public static dispose() {
    VGASimulatorPanel.currentPanel?.dispose();
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

  private _simulate() {
    this._isRunning = true;
    this._panel.webview.postMessage({ type: 'compileAndRun', code: this._currentCode });
  }

  private _reset() {
    this._isRunning = false;
    this._panel.webview.postMessage({ type: 'resetSimulation' });
  }

  private _updateCode(code: string) {
    this._currentCode = code;
    this._panel.webview.postMessage({ type: 'updateCode', code });
  }

  private _compileAndRun() {
    if (!this._isRunning) {
      return;
    }
    this._panel.webview.postMessage({
      type: 'compileAndRun',
      code: this._currentCode
    });
  }

  private _update() {
    this._panel.webview.html = this._getHtmlForWebview(this._panel.webview);
  }

  private _getHtmlForWebview(webview: vscode.Webview): string {
    const mediaPath      = vscode.Uri.joinPath(this._extensionUri, 'media');
    const scriptVerilator= webview.asWebviewUri(vscode.Uri.joinPath(mediaPath, 'verilator_bin.js'));
    const scriptLoader   = webview.asWebviewUri(vscode.Uri.joinPath(mediaPath, 'verilatorLoader.js'));
    const scriptHDL      = webview.asWebviewUri(vscode.Uri.joinPath(mediaPath, 'HDLModuleWASM.js'));
    const scriptSim      = webview.asWebviewUri(vscode.Uri.joinPath(mediaPath, 'vgaSimulator.js'));
    const styleUri       = webview.asWebviewUri(vscode.Uri.joinPath(mediaPath, 'vgaSimulator.css'));
    const wasmUri        = webview.asWebviewUri(vscode.Uri.joinPath(mediaPath, 'verilator_bin.wasm'));

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

  <script>
    window.veriUri = '${scriptVerilator}';
    window.wasmUri = '${wasmUri}';
  </script>

  <!-- Order matters -->
  <script src="${scriptLoader}"></script>
  <script src="${scriptHDL}"></script>
  <script src="${scriptSim}"></script>
</body>
</html>`;
  }
}
