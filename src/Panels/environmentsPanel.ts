import { WebviewViewResolveContext } from 'vscode';
import { extensionName } from '../appGlobals';
import { Settings } from '../Settings';
import * as vsCodeTypes from '../types/vscodeTypes';
import { getNonce } from './utils';

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
    this._addNwEnvironments();

    webviewView.webview.onDidReceiveMessage((data) => {
      if (data.method === 'environment-select' && data.params.state) {
        this._settings.set<string>(`quickSettings.environments`, data.params.environment);
      }
    });
    this._vscode.workspace.onDidChangeConfiguration((_event) => {
      this.updateNwEnvironments();
    });
    this.updateNwEnvironments();
  }

  public updateNwEnvironments() {  
    return this._view?.webview.postMessage({
      method: 'update-selected-environments',
      params: { environments: this._settings.json('quickSettings').environments },
    });
  }

  public _addNwEnvironments() {
    return this._view?.webview.postMessage({
      method: 'add-environments',
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
        <section id="environment-section"></section>

        <script nonce="${nonce}" src="${scriptURI}"></script>
      </body>

      </html>
    `;
  }
}
