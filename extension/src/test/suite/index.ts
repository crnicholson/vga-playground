import * as assert from 'assert';
import * as vscode from 'vscode';

suite('VGA Simulator Extension Test Suite', () => {
    vscode.window.showInformationMessage('Start all tests.');

    test('Extension should be present', () => {
        assert.ok(vscode.extensions.getExtension('vga-simulator'));
    });

    test('Should activate', async () => {
        const ext = vscode.extensions.getExtension('vga-simulator');
        if (ext) {
            await ext.activate();
            assert.ok(true);
        }
    });
}); 