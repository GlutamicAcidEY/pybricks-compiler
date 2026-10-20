import * as vscode from 'vscode';
import { exec } from 'child_process';

export function activate(context: vscode.ExtensionContext) {
    let disposable = vscode.commands.registerCommand('pybricks-compiler.run', () => {
        const activeEditor = vscode.window.activeTextEditor;
        
        if (!activeEditor) {
            vscode.window.showErrorMessage('❌ Please open a Pybricks Python file first!');
            return;
        }

        const filePath = activeEditor.document.uri.fsPath;
        const outputChannel = vscode.window.createOutputChannel("Pybricks Compiler");
        outputChannel.show();

        // 1. Fetch user values from the VS Code settings storage
        const config = vscode.workspace.getConfiguration('pybricks');
        const connectionType = config.get<string>('connectionType', 'ble');
        const stayConnected = config.get<boolean>('stayConnected', false);

        // 2. Dynamically build the final CLI execution string
        // Base layout: pybricksdev run <ble|usb>
        let command = `python -m pybricksdev run ${connectionType}`;

        // Append configuration flags if ticked true
        if (stayConnected) {
            command += ' --stay-connected';
        }

        // Add the path to the target workspace script file
        command += ` "${filePath}"`;

        outputChannel.appendLine(`[Pybricks] Using configuration configuration options...`);
        outputChannel.appendLine(`[Running]: ${command}\n`);

        // 3. Execute the process
        const process = exec(command, (error, stdout, stderr) => {
            if (error) {
                const message = error.message.toLowerCase();
                
                if (message.includes('not found') || message.includes('is not recognized')) {
                    vscode.window.showErrorMessage('❌ Error: "pybricksdev" is not installed. Run "pip install pybricksdev" in your terminal.');
                } else if (message.includes('device') || message.includes('bluetooth') || message.includes('time out') || message.includes('usb')) {
                    vscode.window.showErrorMessage(`🤖 Connection Failed: Could not discover hub over ${connectionType.toUpperCase()}. Check physical connection or pairing mode.`);
                } else {
                    vscode.window.showErrorMessage(`❌ Run Failed: Check the "Pybricks Compiler" output log at the bottom.`);
                }
                return;
            }
            
            vscode.window.showInformationMessage(`🚀 Script completed execution over ${connectionType.toUpperCase()}!`);
        });

        process.stdout?.on('data', (data) => outputChannel.append(data.toString()));
        process.stderr?.on('data', (data) => outputChannel.append(`[Log]: ${data.toString()}`));
    });

    context.subscriptions.push(disposable);
}

export function deactivate() {}
