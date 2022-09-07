import { OutputChannel } from 'vscode';
import { Logging } from '../Logging/types';
import * as messaging from '../messaging';
import { NightwatchExtensionResourceSettings } from '../Settings/types';
import * as vsCodeTypes from '../types/vscodeTypes';
import { prefixWorkspace } from './../helpers';
import { DebugConfigurationProvider } from './debugConfigurationProvider';
import { createNightwatchExtContext, getExtensionResourceSettings } from './helper';
import { installNightwatch } from './installer';
import { createProcessSession } from './processSession';
import {
  NightwatchExtContext,
  NightwatchExtSessionContext,
  NightwatchRunEvent,
  NightwatchSessionEvents,
  ProcessSession,
} from './types';

let vscode: vsCodeTypes.VSCode;
export class NightwatchExt {
  private extContext: NightwatchExtContext;
  private logging: Logging;
  private outputChannel: OutputChannel;
  public events: NightwatchSessionEvents;
  private processSession: ProcessSession;
  private dirtyFiles: Set<string> = new Set();

  constructor(
    private _vscode: vsCodeTypes.VSCode,
    private vscodeContext: vsCodeTypes.ExtensionContext,
    private workspaceFolder: vsCodeTypes.WorkspaceFolder,
    private debugConfigurationProvider: DebugConfigurationProvider
  ) {
    vscode = _vscode;
    this.vscodeContext = vscodeContext;
    const getNightwatchExtensionSettings = getExtensionResourceSettings(vscode, workspaceFolder.uri);
    this.extContext = createNightwatchExtContext(vscode, workspaceFolder, getNightwatchExtensionSettings);
    this.logging = this.extContext.loggingFactory.create('NightwatchExt');
    this.outputChannel = vscode.window.createOutputChannel(`Nightwatch (${workspaceFolder.name})`);
    this.events = {
      onRunEvent: new vscode.EventEmitter<NightwatchRunEvent>(),
      onTestSessionStarted: new vscode.EventEmitter<NightwatchExtSessionContext>(),
      onTestSessionStopped: new vscode.EventEmitter<void>(),
    };
    this.setupRunEvents(this.events);
    this.processSession = this.createProcessSession();
    this.debugConfigurationProvider = debugConfigurationProvider;

    this.updateTestFileList();
  }

  public async installNightwatch() {
    installNightwatch(vscode);
  }

  public activate(): void {
    if (
      vscode.window.activeTextEditor?.document.uri &&
      vscode.workspace.getWorkspaceFolder(vscode.window.activeTextEditor.document.uri) === this.extContext.workspace
    ) {
      this.onDidChangeActiveTextEditor(vscode.window.activeTextEditor);
    }
  }

  onDidChangeActiveTextEditor(editor: vsCodeTypes.TextEditor): void {
    // TODO: Add Update decorators function, and Diagnostics
    console.log('Editor', editor);
  }

  public runAllTests(): void {
    if (this.processSession.scheduleProcess({ type: 'all-tests' })) {
      this.dirtyFiles.clear();
      return;
    }
  }

  public debugAllTests(): void {
    const debugConfig = this.debugConfigurationProvider.provideDebugConfigurations(this.extContext.workspace).pop()!;
    vscode.debug.startDebugging(this.extContext.workspace, debugConfig);
  }

  private createProcessSession(): ProcessSession {
    return createProcessSession({
      ...this.extContext,
      onRunEvent: this.events.onRunEvent,
    });
  }

  private setupRunEvents(events: NightwatchSessionEvents): void {
    events.onRunEvent.event((event: NightwatchRunEvent) => {
      switch (event.type) {
        case 'scheduled':
          this.outputChannel.appendLine(`${event.process.id} is scheduled`);
          break;
        case 'data':
          if (event.newLine) {
            this.outputChannel.appendLine(event.text);
          } else {
            this.outputChannel.append(event.text);
          }
          if (event.isError) {
            this.outputChannel.show();
          }
          break;
        case 'start':
          this.outputChannel.clear();
          break;
        case 'end':
          break;
        case 'exit':
          if (event.error) {
            const msg = `${event.error}\n see troubleshooting: TROUBLESHOOTING URL HERE`;
            this.outputChannel.appendLine(msg);
            this.outputChannel.show();
          }
          break;
      }
    });
  }

  public triggerUpdateSettings(newSettings?: NightwatchExtensionResourceSettings): void {
    const updatedSettings = newSettings ?? getExtensionResourceSettings(vscode, this.extContext.workspace.uri);

    this.extContext = createNightwatchExtContext(vscode, this.extContext.workspace, updatedSettings);
    this.processSession = this.createProcessSession();
    this.updateTestFileList();
  }

  private updateTestFileList(): void {
    this.processSession.scheduleProcess({
      type: 'list-test-files',
      onResult: (files, error) => {
        if (error) {
          const msg = prefixWorkspace(
            vscode,
            this.extContext,
            'Failed to obtain test file list, something went wrong 🫣'
          );
          this.logging('error', msg, error);
          //fire this warning message could risk reporting error multiple times for the given workspace folder
          //therefore garding the warning message with the debugMode
          if (this.extContext.settings.debugMode) {
            messaging.systemWarningMessage(vscode, msg);
          }
        }

        this.setTestFiles(files);
        this.logging('debug', `found ${files?.length} testFiles`);
      },
    });
  }
  }

  async runTests(): Promise<void> {
    await this.runAllTests();
  }

  async debugTests(): Promise<void> {
    await this.debugAllTests();
  }
}
