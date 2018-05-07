'use strict';

import * as vscode from 'vscode';
import { mkdirSync, writeFileSync, existsSync } from 'fs';
import fetch from 'node-fetch';

const baseUrl = 'https://raw.githubusercontent.com/acharluk/easy-cpp-projects/master';

interface EasyFilesJSON {
    directories: string[];
    templates: { [name: string]: { [from: string]: string } };
}

export function activate(context: vscode.ExtensionContext) {
    let createProjectCommand = vscode.commands.registerCommand('easycpp.createProject', createProject);
    let createClassCommand = vscode.commands.registerCommand('easycpp.createClass', createClass);

    context.subscriptions.push(createProjectCommand);
    context.subscriptions.push(createClassCommand);
}

export function deactivate() {
}

const createClass = () => {
    fetch(baseUrl + '/templates/classes/files.json')
    .then(data => data.json())
    .then(templates => {
        vscode.window.showQuickPick(templates)
        .then(selected => {
            if (!selected) { return; }

            vscode.window.showInputBox({prompt: "Enter class name"})
            .then(val => {
                if (!val || !vscode.window.activeTextEditor) { return; }
                let currentFolderWorkspace = vscode.workspace.getWorkspaceFolder(vscode.window.activeTextEditor.document.uri);
                if (!currentFolderWorkspace) { return; }
                
                const currentFolder = currentFolderWorkspace.uri.fsPath;

                fetch(`${baseUrl}/templates/classes/${selected}/easyclass.cpp`)
                .then(value => value.text())
                .then(data => {
                    data = data.replace(new RegExp('easyclass', 'g'), val);
                    writeFileSync(`${currentFolder}/src/${val}.cpp`, data);
                })
                .catch(error => vscode.window.showErrorMessage(`Easy C++ Error: ${error}`));
                
                fetch(`${baseUrl}/templates/classes/${selected}/easyclass.hpp`)
                .then(value => value.text())
                .then(data => {
                    data = data.replace(new RegExp('easyclass', 'g'), val);
                    writeFileSync(`${currentFolder}/include/${val}.hpp`, data);
                })
                .then(() => {
                    vscode.workspace.openTextDocument(`${currentFolder}/include/${val}.hpp`)
                    .then(doc => vscode.window.showTextDocument(doc));
                })
                .catch(error => vscode.window.showErrorMessage(`Easy C++ Error: ${error}`));
            });
        });
    })
    .catch(error => vscode.window.showErrorMessage(`Easy C++ error: ${error}`));
};

const createProject = () => {
    if (!vscode.workspace.workspaceFolders) {
        vscode.window.showErrorMessage("Open a folder or workspace before creating a project!");
        return;
    }
    fetch(baseUrl + '/templates/project/files.json')
    .then(res => res.json())
    .then(data => {
        let templates = [];
        for (let tname in data.templates) { templates.push(tname); }

        vscode.window.showQuickPick(templates)
        .then(selected => selectFolderAndDownload(data, selected));
    })
    .catch(error => vscode.window.showErrorMessage("Easy C++ Projects error: Could not fetch 'files.json' from GitHub\nError: " + error));
};

function selectFolderAndDownload(files: EasyFilesJSON, templateName: string | undefined): void {
    if (!templateName || !vscode.workspace.workspaceFolders) { return; }
    
    if (vscode.workspace.workspaceFolders.length > 1) {
        vscode.window.showWorkspaceFolderPick()
        .then(chosen => {
            if (!chosen) { return; }
            let folder = chosen.uri;
            downloadTemplate(files, templateName, folder.fsPath);
        });
    } else {
        downloadTemplate(files, templateName, vscode.workspace.workspaceFolders[0].uri.fsPath);
    }
}

function downloadTemplate(files: EasyFilesJSON, templateName: string, folder: string): void {
    files.directories.forEach((dir: string) => {
        if (!existsSync(folder + '/' + dir)) {
            mkdirSync(folder + '/' + dir);
        }
    });

    for (let file in files.templates[templateName]) {
        fetch(baseUrl + '/templates/project/' + file)
        .then(res => res.text())
        .then(data => {
            writeFileSync(folder + '/' + files.templates[templateName][file], data);
            if (files.templates[templateName][file] === 'src/main.cpp') {
                vscode.workspace.openTextDocument(folder + '/src/main.cpp')
                .then(doc => vscode.window.showTextDocument(doc));
            }
        })
        .catch(error => vscode.window.showErrorMessage(`Easy C++ Projects error: Could not download '${file}' from GitHub\nError: ` + error));
    }
}