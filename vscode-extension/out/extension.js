"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
const vscode = require("vscode");
const vgaSimulatorPanel_1 = require("./vgaSimulatorPanel");
function activate(context) {
    console.log('VGA Simulator extension activated');
    // Register commands
    const openSimulatorCommand = vscode.commands.registerCommand('vgaSimulator.openSimulator', () => {
        vgaSimulatorPanel_1.VGASimulatorPanel.createOrShow(context.extensionUri);
    });
    const simulateCommand = vscode.commands.registerCommand('vgaSimulator.simulate', async () => {
        const activeEditor = vscode.window.activeTextEditor;
        if (!activeEditor) {
            vscode.window.showErrorMessage('No active Verilog file found');
            return;
        }
        const document = activeEditor.document;
        if (!document.fileName.endsWith('.v') && !document.fileName.endsWith('.sv')) {
            vscode.window.showErrorMessage('Please open a Verilog file (.v or .sv)');
            return;
        }
        // Create or show the simulator panel
        vgaSimulatorPanel_1.VGASimulatorPanel.createOrShow(context.extensionUri);
        // Send the current file content to the simulator
        const content = document.getText();
        const fileName = document.fileName;
        vgaSimulatorPanel_1.VGASimulatorPanel.currentPanel?.simulateVerilogCode(content, fileName);
    });
    const loadExamplesCommand = vscode.commands.registerCommand('vgaSimulator.loadExamples', async () => {
        vgaSimulatorPanel_1.VGASimulatorPanel.createOrShow(context.extensionUri);
        vgaSimulatorPanel_1.VGASimulatorPanel.currentPanel?.loadExamples();
    });
    // Register file watcher for auto-update
    const config = vscode.workspace.getConfiguration('vgaSimulator');
    if (config.get('autoUpdate', true)) {
        const watcher = vscode.workspace.createFileSystemWatcher('**/*.{v,sv}');
        watcher.onDidChange((uri) => {
            if (vgaSimulatorPanel_1.VGASimulatorPanel.currentPanel && vscode.window.activeTextEditor?.document.uri.toString() === uri.toString()) {
                const document = vscode.window.activeTextEditor.document;
                const content = document.getText();
                vgaSimulatorPanel_1.VGASimulatorPanel.currentPanel.simulateVerilogCode(content, document.fileName);
            }
        });
        context.subscriptions.push(watcher);
    }
    context.subscriptions.push(openSimulatorCommand, simulateCommand, loadExamplesCommand);
}
exports.activate = activate;
function deactivate() {
    vgaSimulatorPanel_1.VGASimulatorPanel.currentPanel?.dispose();
}
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map