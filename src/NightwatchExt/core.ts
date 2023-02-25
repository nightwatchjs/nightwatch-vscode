import { EnvironmentsPanel } from './../Panels/environmentsPanel';
import { QuickSettingPanel } from '../Panels/quickSettingPanel';
import { DebugTestIdentifier } from './../TestProvider/types';
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
  ProcessSession,
} from './types';
import { supportedLanguageIds } from '../appGlobals';
import { NightwatchProcessInfo } from '../NightwatchProcessManagement';
import { resetDiagnostics, updateCurrentDiagnostics, updateDiagnostics } from '../diagnostic';
import { Settings } from '../Settings';

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

  // The ability to show fails in the problems section
  private failDiagnostics: vsCodeTypes.DiagnosticCollection;
  public quickSettingPanel: QuickSettingPanel;
  public nightwatchSettings: Settings;
  public environmentsPanel: EnvironmentsPanel;

  constructor(
    private _vscode: vsCodeTypes.VSCode,
    private vscodeContext: vsCodeTypes.ExtensionContext,
    public workspaceFolder: vsCodeTypes.WorkspaceFolder,
    private debugConfigurationProvider: DebugConfigurationProvider,
    private context: vsCodeTypes.ExtensionContext
  ) {
    vscode = _vscode;
    this.vscodeContext = vscodeContext;
    const getNightwatchExtensionSettings = getExtensionResourceSettings(vscode, workspaceFolder.uri);
    this.nightwatchSettings = new Settings(this._vscode, workspaceFolder.uri);
    this.quickSettingPanel = new QuickSettingPanel(
      vscode,
      context.extensionUri,
      workspaceFolder.uri,
      this.nightwatchSettings
    );
    this.environmentsPanel = new EnvironmentsPanel(
      vscode,
      context.extensionUri,
      workspaceFolder.uri,
      this.context,
      this.nightwatchSettings
    );
    this.extContext = createNightwatchExtContext(
      vscode,
      workspaceFolder,
      getNightwatchExtensionSettings,
      this.nightwatchSettings
    );
    this.debugConfigurationProvider = debugConfigurationProvider;
    this.failDiagnostics = vscode.languages.createDiagnosticCollection(`Nightwatch (${workspaceFolder.name})`);
    this.logging = this.extContext.loggingFactory.create('NightwatchExt');
    this.outputChannel = vscode.window.createOutputChannel(`Nightwatch (${workspaceFolder.name})`);
    this.events = {
      onRunEvent: new vscode.EventEmitter<NightwatchRunEvent>(),
      onTestSessionStarted: new vscode.EventEmitter<NightwatchExtSessionContext>(),
      onTestSessionStopped: new vscode.EventEmitter<void>(),
    };
    this.setupRunEvents(this.events);
    this.processSession = this.createProcessSession();
    this.testResultProvider = new TestResultProvider(
      vscode,
      this.events,
      getNightwatchExtensionSettings.debugMode ?? false
    );

    // reset the Nightwatch diagnostics
    resetDiagnostics(this.failDiagnostics);
    this.quickSettingPanel.changeConfig();
  }

  public async installNightwatch() {
    installNightwatch(vscode);
  }

  public updateConfig<T>(configName: string, value: T) {
    this.nightwatchSettings.set<T>(configName, value);
  }

  public getConfig<T>(configName: string) {
    this.nightwatchSettings.json('quickSettings');
    return this.nightwatchSettings.get<T>(configName);
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

  public runAllTests(editor?: vsCodeTypes.TextEditor): void {
    if (!editor) {
      if (this.processSession.scheduleProcess({ type: 'all-tests' })) {
        this.dirtyFiles.clear();
        return;
      }
    } else {
      const name = editor.document.fileName;
      let pInfo;
      if (this.testResultProvider.isTestFile(name) === 'yes') {
        // run related tests from source file
        pInfo = this.processSession.scheduleProcess({
          type: 'by-file',
          testFileName: name,
        });
      } else {
        // note: use file-pattern instead of file-path to increase compatibility, such as for angular users.
        // However, we should keep an eye on performance, as matching by pattern could be slower than by explicit path.
        // If performance ever become an issue, we could consider optimization...
        pInfo = this.processSession.scheduleProcess({
          type: 'by-file-test',
          testFileName: name,
          testName: name,
        });
      }
      if (pInfo) {
        this.dirtyFiles.delete(name);
        return;
      }
    }
    this.logging('error', 'failed to schedule the run for', editor?.document.fileName);
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

  // TODO: replace any with NightwatchTotalResults
  private updateWithData(data: any, process: NightwatchProcessInfo): void {
    // TODO: process data to remove ANSI escape sequence characters from test results
    const statusList = this.testResultProvider.updateTestResults(data, process);
    updateDiagnostics(statusList, this.failDiagnostics);
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

  public triggerUpdateSettings(newSettings?: NightwatchExtensionResourceSettings): Promise<void> {
    const updatedSettings = newSettings ?? getExtensionResourceSettings(vscode, this.extContext.workspace.uri);

    this.extContext = createNightwatchExtContext(
      vscode,
      this.extContext.workspace,
      updatedSettings,
      this.nightwatchSettings
    );
    this.processSession = this.createProcessSession();
    this.updateTestFileList();
    return this.startSession();
  }

  public async startSession() {
    this.dirtyFiles.clear();
    await this.processSession.stop();
    this.processSession = this.createProcessSession();
    this.testProvider?.dispose();
    this.testProvider = new NightwatchTestProvider(vscode, this.getExtExplorerContext());
  }

  private isSupportedDocument(document: vsCodeTypes.TextDocument | undefined): boolean {
    if (!document) {
      return false;
    }

    return supportedLanguageIds.includes(document.languageId);
  }

  private isTestFileEditor(editor: vsCodeTypes.TextEditor): boolean {
    if (!this.isSupportedDocument(editor.document)) {
      return false;
    }

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

    updateCurrentDiagnostics(sortedResults.fail, this.failDiagnostics, editor);
  }

  public updateEnvironmentPanel() {
    this._vscode.workspace.findFiles('**/*nightwatch*.conf.{js,ts,cjs}', undefined, 1).then(async (res) => {
      const nwConfig = require(res[0].path);
      const workspaceState = this.context.workspaceState;
      workspaceState.update('nwConfig', nwConfig);
      this.environmentsPanel._addNwEnvironments();
    });
  }

  public updateTestFileList(): void {
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

  public debugTests = async (
    document: vsCodeTypes.TextDocument | string,
    ...ids: DebugTestIdentifier[]
  ): Promise<void> => {
    const idString = (id: DebugTestIdentifier): string => {
      return typeof id === 'string' ? id : id.title;
    };

    let testId: DebugTestIdentifier | undefined;
    switch (ids.length) {
      case 0:
        //no testId, will run all tests in the file
        break;
      case 1:
        testId = ids[0];
        break;
      default:
        this.logging('debug', `failed to parse debug test ID: ${ids}`);
        break;
    }

    this.debugConfigurationProvider.prepareTestRun(
      typeof document === 'string' ? document : document.fileName,
      testId ? idString(testId) : ''
    );

    const debugConfig = this.debugConfigurationProvider.provideDebugConfigurations(this.extContext.workspace).pop()!;
    vscode.debug.startDebugging(this.extContext.workspace, debugConfig);
  };

  //**  window events handling */

  onDidCreateFiles(_event: vsCodeTypes.FileCreateEvent): void {
    this.updateTestFileList();
  }

  onDidRenameFiles(_event: vsCodeTypes.FileRenameEvent): void {
    this.updateTestFileList();
  }

  onDidDeleteFiles(_event: vsCodeTypes.FileDeleteEvent): void {
    this.updateTestFileList();
  }

  onDidCloseTextDocument(document: vsCodeTypes.TextDocument): void {
    this.removeCachedTestResults(document);
  }

  removeCachedTestResults(document: vsCodeTypes.TextDocument, invalidateResult = false): void {
    if (!document || document.isUntitled) {
      return;
    }

    const filePath = document.fileName;
    if (invalidateResult) {
      this.testResultProvider.invalidateTestResults(filePath);
    } else {
      this.testResultProvider.removeCachedResults(filePath);
    }
  }

  /**
   * This event is fired with the document not dirty when:
   * - before the onDidSaveTextDocument event
   * - the document was changed by an external editor
   */
  onDidChangeTextDocument(event: vsCodeTypes.TextDocumentChangeEvent): void {
    if (event.document.isDirty) {
      return;
    }
    if (event.document.uri.scheme === 'git') {
      return;
    }

    // Ignore a clean file with a change:
    if (event.contentChanges.length > 0) {
      return;
    }

    // there is a bit redudant since didSave already handle the save changes
    // but not sure if there are other non-editor related change we are trying
    // to capture, so leave it be for now...
    this.refreshDocumentChange(event.document);
  }

  onWillSaveTextDocument(event: vsCodeTypes.TextDocumentWillSaveEvent): void {
    if (event.document.isDirty) {
      this.removeCachedTestResults(event.document, true);
    }
  }

  onDidSaveTextDocument(document: vsCodeTypes.TextDocument): void {
    this.handleOnSaveRun(document);
    this.refreshDocumentChange(document);
  }

  private handleOnSaveRun(document: vsCodeTypes.TextDocument): void {
    if (!this.isSupportedDocument(document)) {
      return;
    }
    const isTestFile = this.testResultProvider.isTestFile(document.fileName);
    if (isTestFile === 'no') {
      this.dirtyFiles.add(document.fileName);
    }
  }
}
