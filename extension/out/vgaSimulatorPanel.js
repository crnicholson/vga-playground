"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VGASimulatorPanel = void 0;
const vscode = require("vscode");
class VGASimulatorPanel {
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
        this._currentCode = '';
        this._panel = panel;
        this._extensionUri = extensionUri;
        this._update();
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
        this._panel.webview.onDidReceiveMessage(message => {
            switch (message.type) {
                case 'simulate':
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
        // Here you would integrate with your Verilog simulator
        // For now, we'll send the code to the webview for processing
        this._panel.webview.postMessage({
            type: 'compileAndRun',
            code: this._currentCode
        });
    }
    _loadExample(exampleName) {
        // Load example Verilog code
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
            'stripes': `/*
 * Copyright (c) 2024 Uri Shaked
 * SPDX-License-Identifier: Apache-2.0
 */

\`default_nettype none

module tt_um_vga_example(
    input  wire [7:0] ui_in,    // Dedicated inputs
    output wire [7:0] uo_out,   // Dedicated outputs
    input  wire [7:0] uio_in,   // IOs: Input path
    output wire [7:0] uio_out,  // IOs: Output path
    output wire [7:0] uio_oe,   // IOs: Enable path (active high: 0=input, 1=output)
    input  wire       ena,      // always 1 when the design is powered, so you can ignore it
    input  wire       clk,      // clock
    input  wire       rst_n     // reset_n - low to reset
);

  // VGA signals
  wire hsync;
  wire vsync;
  wire [1:0] R;
  wire [1:0] G;
  wire [1:0] B;
  wire video_active;
  wire [9:0] pix_x;
  wire [9:0] pix_y;
  wire sound;

  // TinyVGA PMOD
  assign uo_out = {hsync, B[0], G[0], R[0], vsync, B[1], G[1], R[1]};

  // Unused outputs assigned to 0.
  assign uio_out = 0;
  assign uio_oe = 0;

  // Suppress unused signals warning
  wire _unused_ok = &{ena, ui_in, uio_in};

  reg [9:0] counter;

  hvsync_generator hvsync_gen(
    .clk(clk),
    .reset(~rst_n),
    .hsync(hsync),
    .vsync(vsync),
    .display_on(video_active),
    .hpos(pix_x),
    .vpos(pix_y)
  );

  always @(posedge clk) begin
    if (~rst_n) begin
      counter <= 0;
    end else begin
      counter <= counter + 1;
    end
  end

  assign R = (video_active) ? pix_x[4:3] : 2'b00;
  assign G = (video_active) ? pix_x[6:5] : 2'b00;
  assign B = (video_active) ? pix_x[8:7] : 2'b00;

endmodule

module hvsync_generator(
    input clk,
    input reset,
    output hsync,
    output vsync,
    output display_on,
    output [9:0] hpos,
    output [9:0] vpos
);

  // horizontal constants
  parameter H_DISPLAY       = 640; // horizontal display width
  parameter H_BACK          =  48; // horizontal left border (back porch)
  parameter H_FRONT         =  16; // horizontal right border (front porch) 
  parameter H_SYNC          =  96; // horizontal sync width
  
  // vertical constants
  parameter V_DISPLAY       = 480; // vertical display height
  parameter V_TOP           =  33; // vertical top border
  parameter V_BOTTOM        =  10; // vertical bottom border
  parameter V_SYNC          =   2; // vertical sync # lines
  
  // derived constants
  parameter H_SYNC_START    = H_DISPLAY + H_FRONT;
  parameter H_SYNC_END      = H_DISPLAY + H_FRONT + H_SYNC - 1;
  parameter H_MAX           = H_DISPLAY + H_BACK + H_FRONT + H_SYNC - 1;
  parameter V_SYNC_START    = V_DISPLAY + V_BOTTOM;
  parameter V_SYNC_END      = V_DISPLAY + V_BOTTOM + V_SYNC - 1;
  parameter V_MAX           = V_DISPLAY + V_TOP + V_BOTTOM + V_SYNC - 1;

  wire hmaxxed = (hpos == H_MAX) || reset;  // set when hpos is maximum
  wire vmaxxed = (vpos == V_MAX) || reset;  // set when vpos is maximum
  
  // horizontal position counter
  always @(posedge clk)
  begin
    if(hmaxxed)
      hpos <= 0;
    else
      hpos <= hpos + 1;
  end

  // vertical position counter
  always @(posedge clk)
  begin
    if(hmaxxed)
      if(vmaxxed)
        vpos <= 0;
      else
        vpos <= vpos + 1;
  end
  
  // horizontal sync: pulse during horizontal sync period
  assign hsync = ~((hpos >= H_SYNC_START) && (hpos <= H_SYNC_END));
  
  // vertical sync: pulse during vertical sync period
  assign vsync = ~((vpos >= V_SYNC_START) && (vpos <= V_SYNC_END));
  
  // display_on is set when pixel is in "safe" visible area
  assign display_on = (hpos < H_DISPLAY) && (vpos < V_DISPLAY);

  reg [9:0] hpos;
  reg [9:0] vpos;

endmodule`,
            'checkerboard': `// Simple checkerboard pattern
module tt_um_vga_example(
    input  wire [7:0] ui_in,
    output wire [7:0] uo_out,
    input  wire [7:0] uio_in,
    output wire [7:0] uio_out,
    output wire [7:0] uio_oe,
    input  wire       ena,
    input  wire       clk,
    input  wire       rst_n
);

  wire hsync, vsync, video_active;
  wire [9:0] pix_x, pix_y;
  wire [1:0] R, G, B;
  
  assign uo_out = {hsync, B[0], G[0], R[0], vsync, B[1], G[1], R[1]};
  assign uio_out = 0;
  assign uio_oe = 0;
  wire _unused_ok = &{ena, ui_in, uio_in};

  hvsync_generator hvsync_gen(
    .clk(clk), .reset(~rst_n), .hsync(hsync), .vsync(vsync),
    .display_on(video_active), .hpos(pix_x), .vpos(pix_y)
  );

  wire checker = (pix_x[5] ^ pix_y[5]);
  assign R = video_active ? (checker ? 2'b11 : 2'b00) : 2'b00;
  assign G = video_active ? (checker ? 2'b11 : 2'b00) : 2'b00;
  assign B = video_active ? (checker ? 2'b11 : 2'b00) : 2'b00;

endmodule`
        };
    }
    _update() {
        const webview = this._panel.webview;
        this._panel.webview.html = this._getHtmlForWebview(webview);
    }
    _getHtmlForWebview(webview) {
        const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'vgaSimulator.js'));
        const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'vgaSimulator.css'));
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
                    <div class="info-item">
                        <span class="label">FPS:</span>
                        <span id="fps" class="value">60</span>
                    </div>
                    <div class="info-item">
                        <span class="label">Clock:</span>
                        <span id="clock" class="value">25,175,000</span>
                    </div>
                    <div class="info-item">
                        <span class="label">Frame:</span>
                        <span id="frame" class="value">0</span>
                    </div>
                    <div class="info-item">
                        <span class="label">Resolution:</span>
                        <span id="resolution" class="value">640x480</span>
                    </div>
                    <div class="info-item">
                        <span class="label">Status:</span>
                        <span id="simStatus" class="value">Idle</span>
                    </div>
                </div>
            </div>
            <script src="${scriptUri}"></script>
        </body>
        </html>`;
    }
}
exports.VGASimulatorPanel = VGASimulatorPanel;
VGASimulatorPanel.viewType = 'vgaSimulator';
//# sourceMappingURL=vgaSimulatorPanel.js.map