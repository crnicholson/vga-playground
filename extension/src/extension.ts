import * as vscode from 'vscode';
import { VGASimulatorPanel } from './vgaSimulatorPanel';

export function activate(context: vscode.ExtensionContext) {
  const openSimulator = vscode.commands.registerCommand('vga-playground.openSimulator', () => {
    VGASimulatorPanel.createOrShow(context.extensionUri);
  });
  const simulateCmd = vscode.commands.registerCommand('vga-playground.simulate', () => {
    VGASimulatorPanel.simulate();
  });
  const resetCmd = vscode.commands.registerCommand('vga-playground.reset', () => {
    VGASimulatorPanel.reset();
  });
  context.subscriptions.push(openSimulator, simulateCmd, resetCmd);
}

export function deactivate() {
  VGASimulatorPanel.dispose();
}
