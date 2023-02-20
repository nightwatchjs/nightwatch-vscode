import { WebviewViewResolveContext } from 'vscode';
import { extensionName } from '../appGlobals';
import { Settings } from '../Settings';
import * as vsCodeTypes from '../types/vscodeTypes';

export interface NwConfig {
  src_folders?: string[] | null;
  page_objects_path?: string[] | null;
  custom_commands_path?: string[] | null;
  custom_assertions_path: string;
  plugins?: null[] | null;
  globals_path: string;
  webdriver: unknown;
  test_workers: unknown;
  test_settings: Record<string, unknown>;
}

export class EnvironmentsPanel implements vsCodeTypes.WebviewViewProvider {
  public static readonly viewType = `${extensionName}.environmentPanel`;
  public _view: vsCodeTypes.WebviewView | undefined;

  private _vscode: typeof import('vscode');
  private _extensionUri: vsCodeTypes.Uri;
  private _workspaceUri: vsCodeTypes.Uri;
  private _settings: Settings;
  private _context: vsCodeTypes.ExtensionContext;

  constructor(
    vscode: vsCodeTypes.VSCode,
    extensionUri: vsCodeTypes.Uri,
    workspaceUri: vsCodeTypes.Uri,
    context: vsCodeTypes.ExtensionContext,
    vscodeSettings: Settings
  ) {
    this._vscode = vscode;
    this._extensionUri = extensionUri;
    this._workspaceUri = workspaceUri;
    this._context = context;
    this._settings = vscodeSettings;
  }

  resolveWebviewView(
    webviewView: vsCodeTypes.WebviewView,
    context: WebviewViewResolveContext<unknown>,
    token: vsCodeTypes.CancellationToken
  ): void | Thenable<void> {
    this._view = webviewView;
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri],
    };

    webviewView.webview.html = this._htmlForWebview(this._vscode, this._extensionUri, webviewView.webview);
    this._updateNwEnvironments();

  }

  private _updateNwEnvironments() {
    return this._view?.webview.postMessage({
      method: 'environments',
      params: { environments: this.getNwEnvironments() },
    });
  }

  private getNwEnvironments(): string[] {
    const environments = this._context.workspaceState.get<NwConfig>('nwConfig')!.test_settings;
    return Object.keys(environments).filter((env) => !env.includes('cucumber'));
  }

  private _htmlForWebview(vscode: vsCodeTypes.VSCode, extensionURI: vsCodeTypes.Uri, webview: vsCodeTypes.Webview) {
    const styleURI = webview.asWebviewUri(
      vscode.Uri.joinPath(extensionURI, 'media', 'environments', 'environmentsPanel.css')
    );
    const scriptURI = webview.asWebviewUri(
      vscode.Uri.joinPath(extensionURI, 'media', 'environments', 'environmentsPanel.js')
    );

    const nonce = getNonce();

    return `<!DOCTYPE html>
      <html lang="en">

      <head>
        <meta charset="UTF-8">
        <meta http-equiv="Content-Security-Policy"
          content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link href="${styleURI}" rel="stylesheet">
        <title>Nightwatch Environments</title>
      </head>

      <body>
        <section>
          <article>
            <h1>Hello Worlds</h1>
          </article>

          <!-- <article>
            <label for="open-report">Open Report</label>
            <input type="checkbox" name="openReport" id="open-report">
          </article> -->

        </section>

        <script nonce="${nonce}" src="${scriptURI}"></script>
      </body>

      </html>
    `;
  }
}

function getNonce() {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
