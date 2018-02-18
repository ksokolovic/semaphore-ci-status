'use strict';

import * as vscode from 'vscode';

import * as fs from 'fs';
import * as path from 'path';

import * as readYaml from 'read-yaml';
import { SemaphoreStatusController } from './semaphore-ci';

export function activate(context: vscode.ExtensionContext) {
    let semaphoreController: SemaphoreStatusController;
    let settings = isConfigured();

    if (settings) {
        initSemaphoreStatus(context, settings);
    }

    context.subscriptions.push(vscode.workspace.onDidChangeWorkspaceFolders(e => {
        settings = isConfigured();
        if (settings) {
            initSemaphoreStatus(context, settings);
        }
    }));

    let updateStatusDisp = vscode.commands.registerCommand("semaphoreci.updateStatus", () => updateSemaphoreStatus(false));
    context.subscriptions.push(updateStatusDisp);

    let openInSemaphoreDisp = vscode.commands.registerCommand("semaphoreci.viewInSemaphore", () => openInSemaphore());
    context.subscriptions.push(openInSemaphoreDisp);

    const pollInterval: number = vscode.workspace.getConfiguration("semaphoreci").get("pollInterval", 0);
    if (pollInterval > 0) {
        setInterval(updateSemaphoreStatus, pollInterval * 60000);
    }

    function initSemaphoreStatus(aContext: vscode.ExtensionContext, settings: any) {
        // Read settings from the configuration file
        semaphoreController = new SemaphoreStatusController(
            settings['authToken'],
            settings['project'],
            settings['branch']
        );

        // Add to the list of disposables which are disposed when the extension is deactivated
        aContext.subscriptions.push(semaphoreController);
    };

    function updateSemaphoreStatus(silent?: boolean) {
        if (!!settings) {
            semaphoreController.update();
            return;
        } 

        if (!silent) {
            vscode.window.showErrorMessage("The Semaphore configuration file .semaphore-ci.yml not found.");
        }
    };

    function openInSemaphore() {
        if (!!settings) {
            semaphoreController.openWeb();
        } else {
            vscode.window.showErrorMessage("The Semaphore configuration file .semaphore-ci.yml not found.");            
        }
    }
}

export function deactivate() {
}

/**
 * Checks whether or not the configuration .semaphore-ci.yml file exists
 * in current workspace.
 */
function isConfigured(): any {
    if (!vscode.workspace.workspaceFolders) {
        return undefined;
    }

    let exists: any = false;
    for (const workspaceItem of vscode.workspace.workspaceFolders) {
        exists = fs.existsSync(path.join(workspaceItem.uri.fsPath, ".semaphore-ci.yml"));
        if (exists) {
            return readYaml.sync(path.join(workspaceItem.uri.fsPath, ".semaphore-ci.yml"));
        }
    }

    return undefined;
}