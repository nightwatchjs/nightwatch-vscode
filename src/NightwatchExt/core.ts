import { OutputChannel } from 'vscode';
import { Logging } from '../Logging/types';
import * as messaging from '../messaging';
import { NightwatchExtensionResourceSettings } from '../Settings/types';
import { NightwatchExtExplorerContext } from '../TestProvider/types';
import { TestResultProvider } from '../TestResults/testResultProvider';
import { SortedTestResults } from '../TestResults/types';
import * as vsCodeTypes from '../types/vscodeTypes';
import { prefixWorkspace } from './../helpers';
import { NightwatchTestProvider } from './../TestProvider/testProvider';
import { DebugConfigurationProvider } from './debugConfigurationProvider';
import { createNightwatchExtContext, getExtensionResourceSettings } from './helper';
import { installNightwatch } from './installer';
import { createProcessSession } from './processSession';
import {
  NightwatchExtContext,
  NightwatchExtSessionContext,
  NightwatchRunEvent,
  NightwatchSessionEvents,
  ProcessSession
} from './types';

let vscode: vsCodeTypes.VSCode;
export class NightwatchExt {
  testResultProvider: TestResultProvider;

  private extContext: NightwatchExtContext;
  private logging: Logging;
  private outputChannel: OutputChannel;
  public events: NightwatchSessionEvents;
  private processSession: ProcessSession;
  private dirtyFiles: Set<string> = new Set();

  private testProvider?: NightwatchTestProvider;

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

    this.testResultProvider = new TestResultProvider(
      vscode,
      this.events,
      getNightwatchExtensionSettings.debugMode ?? false
    );

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

  public deactivate(): void {
    this.stopSession();
    this.outputChannel.dispose();

    this.testResultProvider.dispose();
    this.testProvider?.dispose();

    this.events.onRunEvent.dispose();
    this.events.onTestSessionStarted.dispose();
    this.events.onTestSessionStopped.dispose();
  }

  public async stopSession(): Promise<void> {
    try {
      this.outputChannel.appendLine('Stopping Nightwatch Session');
      await this.processSession.stop();

      this.testProvider?.dispose();
      this.testProvider = undefined;

      this.events.onTestSessionStopped.fire();

      this.outputChannel.appendLine('Nightwatch Session Stopped');
    } catch (e) {
      const msg = prefixWorkspace(vscode, this.extContext, 'Failed to stop nightwatch session');
      this.logging('error', `${msg}:`, e);
      this.outputChannel.appendLine('Failed to stop nightwatch session');
      messaging.systemErrorMessage(vscode, '${msg}...');
    }
  }

  onDidChangeActiveTextEditor(editor: vsCodeTypes.TextEditor): void {
    // TODO: Add Update decorators function, and Diagnostics
    this.triggerUpdateActiveEditor(editor);
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
    // Todo: updateWithData to parse result and add diagnostic
    return createProcessSession({
      ...this.extContext,
      updateWithData: this.updateWithData.bind(this),
      onRunEvent: this.events.onRunEvent,
    });
  }

  public triggerUpdateActiveEditor(editor: vsCodeTypes.TextEditor): void {
    this.updateTestFileEditor(editor);
  }

  /**
   * refresh UI for the given document editor or all active editors in the workspace
   * @param document refresh UI for the specific document. if undefined, refresh all active editors in the workspace.
   */
  private refreshDocumentChange(document?: vsCodeTypes.TextDocument): void {
    for (const editor of vscode.window.visibleTextEditors) {
      if (
        (document && editor.document === document) ||
        vscode.workspace.getWorkspaceFolder(editor.document.uri) === this.extContext.workspace
      ) {
        this.triggerUpdateActiveEditor(editor);
      }
    }

    // this.updateStatusBar({
    //   stats: this.toSBStats(this.testResultProvider.getTestSuiteStats()),
    // });
  }

  private updateWithData(): void {
    this.refreshDocumentChange();
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
    return this.startSession();
  }

  public startSession() {
    this.testProvider?.dispose();
    this.testProvider = new NightwatchTestProvider(vscode, this.getExtExplorerContext());
  }

  private isTestFileEditor(editor: vsCodeTypes.TextEditor): boolean {
    // if (!this.isSupportedDocument(editor.document)) {
    //   return false;
    // }

    if (this.testResultProvider.isTestFile(editor.document.fileName) === 'no') {
      return false;
    }

    // if isTestFile returns unknown or true, treated it like a test file to give it best chance to display any test result if ever available
    return true;
  }

  private updateTestFileEditor(editor: vsCodeTypes.TextEditor): void {
    if (!this.isTestFileEditor(editor)) {
      return;
    }

    const filePath = editor.document.fileName;
    let sortedResults: SortedTestResults | undefined;
    try {
      sortedResults = this.testResultProvider.getSortedResults(filePath);
    } catch (e) {
      this.outputChannel.appendLine(`${filePath}: failed to parse test results: ${e}`);
      // assign an empty result so we can clear the outdated decorators/diagnostics etc
      sortedResults = {
        fail: [],
        skip: [],
        success: [],
        unknown: [],
      };
    }

    if (!sortedResults) {
      return;
    }

    // this.updateDecorators(sortedResults, editor);
    // updateCurrentDiagnostics(sortedResults.fail, this.failDiagnostics, editor);
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

        // this.setTestFiles(files);
        this.logging('debug', `found ${files?.length} testFiles`);
      },
    });
  }

  private setTestFiles(list: string[] | undefined): void {
    this.testResultProvider.updateTestFileList(list);
  }

  private getExtExplorerContext(): NightwatchExtExplorerContext {
    return {
      ...this.extContext,
      sessionEvents: this.events,
      session: this.processSession,
      testResolveProvider: this.testResultProvider,
      debugTests: this.debugTests,
    };
  }

  async runTests(): Promise<void> {
    await this.runAllTests();
  }

  async debugTests(): Promise<void> {
    await this.debugAllTests();
  }
}
