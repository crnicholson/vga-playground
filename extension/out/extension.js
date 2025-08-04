"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = require("vscode");
const vgaSimulatorPanel_1 = require("./vgaSimulatorPanel");
function activate(context) {
    console.log('VGA Playground extension is now active!');
    // Register command to open VGA simulator
    const openSimulatorCommand = vscode.commands.registerCommand('vga-playground.openSimulator', () => {
        vgaSimulatorPanel_1.VGASimulatorPanel.createOrShow(context.extensionUri);
    });
    // Register command to simulate
    const simulateCommand = vscode.commands.registerCommand('vga-playground.simulate', () => {
        vgaSimulatorPanel_1.VGASimulatorPanel.simulate();
    });
    // Register command to reset
    const resetCommand = vscode.commands.registerCommand('vga-playground.reset', () => {
        vgaSimulatorPanel_1.VGASimulatorPanel.reset();
    });
    context.subscriptions.push(openSimulatorCommand, simulateCommand, resetCommand);
    // Auto-open simulator when opening .v files
    vscode.workspace.onDidOpenTextDocument((document) => {
        if (document.languageId === 'verilog') {
            // Optional: auto-open simulator
            // VGASimulatorPanel.createOrShow(context.extensionUri);
        }
    });
    // Watch for changes in Verilog files
    vscode.workspace.onDidChangeTextDocument((event) => {
        if (event.document.languageId === 'verilog') {
            vgaSimulatorPanel_1.VGASimulatorPanel.updateCode(event.document.getText());
        }
    });
}
function deactivate() {
    vgaSimulatorPanel_1.VGASimulatorPanel.dispose();
}
//# sourceMappingURL=extension.js.map