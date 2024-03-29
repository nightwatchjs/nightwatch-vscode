import { WebviewView, WebviewViewResolveContext } from 'vscode';
import * as vsCodeTypes from '../types/vscodeTypes';
import os from 'os';
import { Settings } from '../Settings';
import { extensionName } from '../appGlobals';
import { getNonce } from './utils';

export class QuickSettingPanel implements vsCodeTypes.WebviewViewProvider {
  public static readonly viewType = `${extensionName}.quickSettingPanel`;

  public _view: vsCodeTypes.WebviewView | undefined;
  private _extensionUri: vsCodeTypes.Uri;
  private _vscode: vsCodeTypes.VSCode;
  private _workspaceUri: vsCodeTypes.Uri;
  private _nightwatchSettings: Settings;

  constructor(
    vscode: vsCodeTypes.VSCode,
    extensionUri: vsCodeTypes.Uri,
    workspaceUri: vsCodeTypes.Uri,
    nightwatchSettings: Settings,
  ) {
    this._vscode = vscode;
    this._extensionUri = extensionUri;
    this._workspaceUri = workspaceUri;
    this._nightwatchSettings = nightwatchSettings;
    this._vscode.workspace.onDidChangeConfiguration((_event) => {
      this._updateSettings();
    });
  }

  public async changeConfig() {
    const config = this._vscode.workspace.getConfiguration(
      'nightwatch',
      this._workspaceUri,
    );
    const parallels = this._nightwatchSettings.get<number>(
      `quickSettings.parallels`,
    );
    await config.update(
      'quickSettings.parallels',
      parallels === 0 ? os.cpus().length : parallels,
      true,
    );
  }

  public getWebview() {
    return this._view;
  }

  public resolveWebviewView(
    webviewView: WebviewView,
    context: WebviewViewResolveContext<unknown>,
    token: vsCodeTypes.CancellationToken,
  ): void | Thenable<void> {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri],
    };

    webviewView.webview.html = this._htmlForWebview(
      this._vscode,
      this._extensionUri,
      webviewView.webview,
    );
    webviewView.webview.onDidReceiveMessage((data) => {
      if (data.method === 'toggle') {
        this._vscode.commands.executeCommand(
          `${extensionName}.${data.params.command}`,
        );
      }
      if (data.method === 'change') {
        this._nightwatchSettings.set<number>(
          `quickSettings.${data.params.command}`,
          +data.params.value,
        );
      }
    });

    this._updateSettings();
  }

  private _updateSettings() {
    return this._view?.webview.postMessage({
      method: 'settings',
      params: { settings: this._nightwatchSettings.json('quickSettings') },
    });
  }

  private _htmlForWebview(
    vscode: vsCodeTypes.VSCode,
    extensionURI: vsCodeTypes.Uri,
    webview: vsCodeTypes.Webview,
  ) {
    const styleURI = webview.asWebviewUri(
      vscode.Uri.joinPath(
        extensionURI,
        'media',
        'quickSetting',
        'quickSettingPanel.css',
      ),
    );
    const scriptURI = webview.asWebviewUri(
      vscode.Uri.joinPath(
        extensionURI,
        'media',
        'quickSetting',
        'quickSettingPanel.js',
      ),
    );

    const nonce = getNonce();

    return `<!DOCTYPE html>
      <html lang="en">

      <head>
        <meta charset="UTF-8">
        <meta http-equiv="Content-Security-Policy"
          content="default-src 'none'; style-src ${
            webview.cspSource
          }; script-src 'nonce-${nonce}';">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link href="${styleURI}" rel="stylesheet">
        <title>Nightwatch Quick Settings</title>
      </head>

      <body>
        <section>
          <article>
            <label for="headless-mode">Headless Mode</label>
            <input type="checkbox" name="headlessMode" id="headless-mode">
          </article>

          <article>
            <label for="open-report">Open Report</label>
            <input type="checkbox" name="openReport" id="open-report">
          </article>

          <article>
            <label for="parallels">Number of Parallels</label>
            <input type="number" id="parallels" name="parallels" min="2" max="12" step="2" value="${
              os.cpus().length
            }">
          </article>

        </section>

        <script nonce="${nonce}" src="${scriptURI}"></script>
      </body>

      </html>
    `;
  }
}
