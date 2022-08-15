const vscode = require('vscode');

function trace(...args) {
  vscode.window.showInformationMessage(...args);
}

const defaultScrapFolder = '/Users/zhuowei/Documents/scrap';

/**
 * @param {vscode.Uri} baseUri
 * @param {string} baseName
 * @param {string} baseExtension
 * @param {Set} usedPaths
 */

async function genNewPath(baseUri, baseName, baseExtension, usedPaths) {
  for (let i = 1; i < 1000; i++) {
    const newUri = vscode.Uri.joinPath(baseUri, baseName + i + baseExtension);
    if (usedPaths.has(newUri.toString())) {
      continue;
    }
    try {
      const statOut = await vscode.workspace.fs.stat(newUri);
    } catch (e) {
      if (e.code === 'FileNotFound') {
        return newUri;
      }
      throw e;
    }
  }
  throw new Error('what? more than 1000 files?!');
}

async function saveScrapMacroFunc() {
  const textEncoder = new TextEncoder();
  const documents = vscode.workspace.textDocuments;
  const currentDateStr = new Date().toISOString().split('T')[0];
  const scrapDirUri = vscode.workspace.workspaceFolders &&
          vscode.workspace.workspaceFolders.length > 0 ?
      vscode.Uri.joinPath(vscode.workspace.workspaceFolders[0].uri, 'scrap') :
      vscode.Uri.file(defaultScrapFolder);

  const untitledDocsUris = [];

  for (const document of documents) {
    if (!document.isUntitled) {
      continue;
    }
    const documentContents = document.getText();
    if (documentContents.trim().length === 0) {
      continue;
    }
    const lastPart = document.uri.path.split('-');
    let theNumber = parseInt(lastPart[lastPart.length - 1]);
    if (theNumber !== theNumber) {
      theNumber = -1;
    }
    untitledDocsUris.push([document, theNumber]);
  }

  untitledDocsUris.sort((a, b) => a[1] - b[1]);

  const editLog = [];
  const usedPaths = new Set();

  for (const documentUriAndPart of untitledDocsUris) {
    const document = documentUriAndPart[0];
    const newPath =
        await genNewPath(scrapDirUri, currentDateStr + '_', '.txt', usedPaths);
    usedPaths.add(newPath.toString());
    await vscode.workspace.fs.writeFile(
        newPath, textEncoder.encode(document.getText()));
    editLog.push(document.uri.toString() + ' -> ' + newPath.toString());
    await vscode.window.showTextDocument(document);
    // close without saving
    await vscode.commands.executeCommand(
        'workbench.action.revertAndCloseActiveEditor');
  }
  trace(editLog.join('\n'));
}

module.exports.macroCommands = {
  saveScrapMacro: {
    no: 1,
    func: saveScrapMacroFunc,
  },
};