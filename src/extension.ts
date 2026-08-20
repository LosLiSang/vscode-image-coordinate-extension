import * as vscode from 'vscode';

interface CoordsMessage {
  type: 'coords';
  x: number;
  y: number;
  color?: string | null;
}
interface LeaveMessage {
  type: 'leave';
}
interface CopyMessage {
  type: 'copy';
  text: string;
}
type WebviewMessage = CoordsMessage | LeaveMessage | CopyMessage;

export function activate(context: vscode.ExtensionContext): void {
  const statusItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusItem.name = 'Image Coordinate Viewer';
  statusItem.text = '$(file-media) —, —';
  statusItem.tooltip = 'Image coordinates at mouse position';
  statusItem.command = 'imageCoordinateViewer.copyCoords';
  statusItem.show();

  const provider = new CoordinateEditorProvider(context, statusItem);

  context.subscriptions.push(
    statusItem,
    vscode.window.registerCustomEditorProvider('imageCoordinateViewer.editor', provider, {
      webviewOptions: { retainContextWhenHidden: true },
      supportsMultipleEditorsPerDocument: false,
    }),
    vscode.commands.registerCommand('imageCoordinateViewer.copyCoords', () => {
      const c = provider.lastCoords;
      if (c) {
        void vscode.env.clipboard.writeText(`${c.x}, ${c.y}`);
        void vscode.window.setStatusBarMessage(`Copied coordinates (${c.x}, ${c.y})`, 2000);
      }
    }),
    vscode.commands.registerCommand('imageCoordinateViewer.copyColor', () => {
      const color = provider.lastColor;
      if (color) {
        void vscode.env.clipboard.writeText(color);
        void vscode.window.setStatusBarMessage(`Copied color ${color}`, 2000);
      }
    })
  );
}

class CoordinateEditorProvider implements vscode.CustomTextEditorProvider {
  lastCoords: { x: number; y: number } | null = null;
  lastColor: string | null = null;

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly statusItem: vscode.StatusBarItem
  ) {}

  resolveCustomTextEditor(
    document: vscode.TextDocument,
    webviewPanel: vscode.WebviewPanel
  ): void {
    webviewPanel.webview.options = { enableScripts: true };
    webviewPanel.webview.html = this.getHtml(webviewPanel.webview, document.uri);

    webviewPanel.webview.onDidReceiveMessage((msg: WebviewMessage) => {
      switch (msg.type) {
        case 'coords':
          this.lastCoords = { x: msg.x, y: msg.y };
          this.lastColor = msg.color ?? null;
          this.statusItem.text = `$(file-media) ${msg.x}, ${msg.y}` + (msg.color ? `  ${msg.color}` : '');
          break;
        case 'leave':
          this.statusItem.text = '$(file-media) —, —';
          break;
        case 'copy':
          void vscode.env.clipboard.writeText(msg.text);
          void vscode.window.setStatusBarMessage(`Copied ${msg.text}`, 1500);
          break;
      }
    });
  }

  private getHtml(webview: vscode.Webview, uri: vscode.Uri): string {
    const imgSrc = webview.asWebviewUri(uri);
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, 'media', 'main.js')
    );
    const csp = `default-src 'none'; img-src ${webview.cspSource} data:; style-src ${webview.cspSource} 'unsafe-inline'; script-src ${webview.cspSource};`;
    return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="${csp}">
<style>
  html, body { height: 100%; margin: 0; padding: 0; background: var(--vscode-editor-background); overflow: hidden; }
  body { display: flex; align-items: center; justify-content: center; }
  #viewport { position: relative; max-width: 100%; max-height: 100vh; display: flex; align-items: center; justify-content: center; overflow: auto; }
  #imgWrap { position: relative; line-height: 0; }
  #img { max-width: 100%; max-height: 100vh; user-select: none; -webkit-user-drag: none; cursor: crosshair; }
  #img.actual { max-width: none; max-height: none; }
  #crossV, #crossH { position: absolute; background: rgba(255,255,255,.55); box-shadow: 0 0 1px rgba(0,0,0,.8); pointer-events: none; display: none; }
  #crossV { width: 1px; top: 0; bottom: 0; }
  #crossH { height: 1px; left: 0; right: 0; }
  #tooltip {
    position: absolute; pointer-events: none; display: none;
    background: var(--vscode-editorWidget-background); color: var(--vscode-editorWidget-foreground);
    border: 1px solid var(--vscode-widget-border); border-radius: 3px;
    font-family: var(--vscode-editor-font-family); font-size: 12px;
    padding: 3px 7px; white-space: nowrap; z-index: 10; line-height: 1.5;
  }
  #tooltip .swatch { display: inline-block; width: 10px; height: 10px; border: 1px solid var(--vscode-widget-border); vertical-align: -1px; margin-right: 5px; }
  #info {
    position: fixed; top: 6px; left: 8px; z-index: 20;
    font-family: var(--vscode-editor-font-family); font-size: 12px;
    color: var(--vscode-descriptionForeground); background: var(--vscode-editor-background);
    padding: 2px 8px; border-radius: 3px; opacity: .9;
  }
</style>
</head>
<body>
  <div id="info"></div>
  <div id="viewport"><div id="imgWrap">
    <img id="img" src="${imgSrc}">
    <div id="crossV"></div><div id="crossH"></div>
    <div id="tooltip"></div>
  </div></div>
<script src="${scriptUri}"></script>
</body>
</html>`;
  }
}

export function deactivate(): void {}
