"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = require("vscode");
const vgaSimulatorPanel_1 = require("./vgaSimulatorPanel");
function activate(context) {
    const openSimulator = vscode.commands.registerCommand('vga-playground.openSimulator', () => {
        vgaSimulatorPanel_1.VGASimulatorPanel.createOrShow(context.extensionUri);
    });
    const simulateCmd = vscode.commands.registerCommand('vga-playground.simulate', () => {
        vgaSimulatorPanel_1.VGASimulatorPanel.simulate();
    });
    const resetCmd = vscode.commands.registerCommand('vga-playground.reset', () => {
        vgaSimulatorPanel_1.VGASimulatorPanel.reset();
    });
    context.subscriptions.push(openSimulator, simulateCmd, resetCmd);
}
function deactivate() {
    vgaSimulatorPanel_1.VGASimulatorPanel.dispose();
}
//# sourceMappingURL=extension.js.map