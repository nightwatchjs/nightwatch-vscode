import { extensionId } from '../appGlobals';
import { Logging } from '../Logging';
import * as vsCodeTypes from '../types/vscodeTypes';
import { WorkspaceRoot } from './testItemData';
import { NightwatchTestProviderContext } from './testProviderContext';
import { Debuggable, NightwatchExtExplorerContext, TestItemData } from './types';

let vscode: vsCodeTypes.VSCode;
const isDebuggable = (arg: any): arg is Debuggable => arg && typeof arg.getDebugInfo === 'function';

export class NightwatchTestProvider {
  private readonly controller: vsCodeTypes.TestController;
  private context: NightwatchTestProviderContext;
  private workspaceRoot: WorkspaceRoot;
  private log: Logging;

  constructor(_vscode: vsCodeTypes.VSCode, nightwatchContext: NightwatchExtExplorerContext) {
    this.log = nightwatchContext.loggingFactory.create('NightwatchTestProvider');
    const wsFolder = nightwatchContext.workspace;

    vscode = _vscode;
    this.controller = this.createController(wsFolder);

    this.context = new NightwatchTestProviderContext(
      nightwatchContext,
      this.controller,
      this.createProfiles(this.controller)
    );
    this.workspaceRoot = new WorkspaceRoot(this.context);
    console.log(this.workspaceRoot);
  }

  private createController = (wsFolder: vsCodeTypes.WorkspaceFolder): vsCodeTypes.TestController => {
    const controller = vscode.tests.createTestController(
      `${extensionId}:TestProvider:${wsFolder.name}`,
      `Nightwatch Test Provider (${wsFolder.name})`
    );

    controller.resolveHandler = this.discoverTest;
    return controller;
  };

  private createProfiles = (controller: vsCodeTypes.TestController): vsCodeTypes.TestRunProfile[] => {
    const runTag = new vscode.TestTag('run');
    const debugTag = new vscode.TestTag('debug');
    const profiles = [
      controller.createRunProfile('run', vscode.TestRunProfileKind.Run, this.runTests, true, runTag),
      controller.createRunProfile('debug', vscode.TestRunProfileKind.Debug, this.runTests, true, debugTag),
    ];
    return profiles;
  };

  private discoverTest = (item: vsCodeTypes.TestItem | undefined): void => {
    const theItem = item ?? this.workspaceRoot.item;
    if (!theItem.canResolveChildren) {
      return;
    }
    const run = this.context.createTestRun(new vscode.TestRunRequest([theItem]), `disoverTest: ${this.controller.id}`);
    try {
      const data = this.context.getData(theItem);
      if (data && data.discoverTest) {
        this.context.appendOutput(`resolving children for ${theItem.id}`, run, true);
        data.discoverTest(run);
      } else {
        this.context.appendOutput(`no data found for item ${theItem.id}`, run, true, 'red');
      }
    } catch (e) {
      this.log('error', `[NightwatchTestProvider]: discoverTest error for "${theItem.id}" : `, e);
      theItem.error = `discoverTest error: ${JSON.stringify(e)}`;
    } finally {
      run.end();
    }
  };

  private getAllItems = (): vsCodeTypes.TestItem[] => {
    const items: vsCodeTypes.TestItem[] = [];
    this.controller.items.forEach((item) => items.push(item));
    return items;
  };

  /**
   * invoke NightwatchExt debug function for the given data, handle unexpected exception and set item state accordingly.
   * should never throw or reject.
   */
  debugTest = async (tData: TestItemData, run: vsCodeTypes.TestRun): Promise<void> => {
    let error;
    if (isDebuggable(tData)) {
      try {
        const debugInfo = tData.getDebugInfo();
        this.context.appendOutput(`launching debugger for ${tData.item.id}`, run);
        if (debugInfo.testNamePattern) {
          await this.context.ext.debugTests(debugInfo.fileName, debugInfo.testNamePattern);
        } else {
          await this.context.ext.debugTests(debugInfo.fileName);
        }
        return;
      } catch (e) {
        error = `item ${tData.item.id} failed to debug: ${JSON.stringify(e)}`;
      }
    }
    error = error ?? `item ${tData.item.id} is not debuggable`;
    run.errored(tData.item, new vscode.TestMessage(error));
    this.context.appendOutput(`${error}`, run, true, 'red');
    return Promise.resolve();
  };

  runTests = async (request: vsCodeTypes.TestRunRequest, cancelToken: vsCodeTypes.CancellationToken): Promise<void> => {
    if (!request.profile) {
      this.log('error', 'not supporting runRequest without profile', request);
      return Promise.reject('cnot supporting runRequest without profile');
    }
    const run = this.context.createTestRun(request, this.controller.id);
    const tests = (request.include ?? this.getAllItems()).filter((t) => !request.exclude?.includes(t));

    const promises: Promise<void>[] = [];
    try {
      for (const test of tests) {
        const tData = this.context.getData(test);
        if (!tData || cancelToken.isCancellationRequested) {
          run.skipped(test);
          continue;
        }
        this.context.appendOutput(`executing profile: "${request.profile.label}" for ${test.id}...`, run);
        if (request.profile.kind === vscode.TestRunProfileKind.Debug) {
          await this.debugTest(tData, run);
        } else {
          promises.push(
            new Promise((resolve, reject) => {
              try {
                tData.scheduleTest(run, resolve);
              } catch (e) {
                const msg = `failed to schedule test for ${tData.item.id}: ${JSON.stringify(e)}`;
                this.log('error', msg, e);
                run.errored(test, new vscode.TestMessage(msg));
                reject(msg);
              }
            })
          );
        }
      }
    } catch (e) {
      const msg = `failed to execute profile "${request.profile.label}": ${JSON.stringify(e)}`;
      this.context.appendOutput(msg, run, true, 'red');
    }

    await Promise.allSettled(promises);
    run.end();
  };

  dispose(): void {
    this.workspaceRoot.dispose();
    this.controller.dispose();
  }
}
