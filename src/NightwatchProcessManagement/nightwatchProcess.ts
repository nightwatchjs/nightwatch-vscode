import { Logging } from '../Logging';
import { NightwatchExtContext } from '../NightwatchExt';
import Runner, { runnerEvents } from '../NightwatchRunner/runner';
import { Options, RunnerEvent } from '../NightwatchRunner';
import { stringifyRequest } from './helpers';
import { NightwatchProcessInfo, NightwatchProcessRequest, RunnerTask, StopReason } from './types';
// TODO: remove this and pass the vscode
import * as vscode from 'vscode';
import { extensionId } from '../appGlobals';
import { join } from 'path';

let SEQ = 0;

export class NightwatchProcess implements NightwatchProcessInfo {
  public readonly id: string;
  public readonly request: NightwatchProcessRequest;
  private desc: string;
  private task?: RunnerTask;
  private _stopReason?: StopReason;
  private extContext: NightwatchExtContext;
  private logging: Logging;

  constructor(extContext: NightwatchExtContext, request: NightwatchProcessRequest) {
    this.id = `${request.type}-${SEQ++}`;
    this.request = request;
    this.desc = `id: ${this.id}, request: ${stringifyRequest(request)}`;
    this.extContext = extContext;
    this.logging = extContext.loggingFactory.create(`NightwatchProcess ${request.type}`);
  }

  public start(): Promise<void> {
    this._stopReason = undefined;
    return this.startRunner();
  }

  public stop(): Promise<void> {
    this._stopReason = 'on-demand';
    if (!this.task) {
      this.logging('debug', 'nothing to stop, no pending runner/promise');
      this.taskDone();
      return Promise.resolve();
    }

    this.task.runner.closeProcess();

    return this.task.promise;
  }

  private getReporterPath() {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    // TODO: replace "nightwatch-vscode.nightwatch" with extensionID
    const extensionPath = vscode.extensions.getExtension('nightwatch-vscode.nightwatch')!.extensionPath;
    return join(extensionPath, 'dist', 'reporter.js');
  }

  private async startRunner(): Promise<void> {
    if (this.task) {
      this.logging('warn', 'the Runner task has already started');
      return this.task.promise;
    }

    // TODO: Make environment dynamic, currently hardcoded to "chrome"
    const options: Options = {
      env: 'chrome',
      reporter: this.getReporterPath(),
      args: { args: [] },
    };

    switch (this.request.type) {
      case 'not-test':
        options.args = { args: this.request.args, replace: true };
        break;
      case 'by-file-test':
        options.args = {
          args: ['--testcase', this.request.testName, '--test', this.request.testFileName],
          replace: true,
        };
        break;
      case 'by-file':
        options.args = { args: [this.request.testFileName], replace: true };
      default:
        this.logging('error', `could not find valid request type ${this.request.type}`);
        break;
    }

    const runnerWorkspace = await this.extContext.createRunnerWorkspace();
    const runner = new Runner(runnerWorkspace, this.extContext.loggingFactory, options);

    this.registerListener(runner);

    let taskInfo: Omit<RunnerTask, 'promise'>;
    const promise = new Promise<void>((resolve, reject) => {
      taskInfo = { runner, resolve, reject };
    });

    this.task = { ...taskInfo!, promise };

    this.request.listener.onEvent(this, 'processStarting');
    runner.start();

    return promise;
  }

  public get stopReason(): StopReason | undefined {
    return this._stopReason;
  }

  private taskDone() {
    this.task = undefined;
  }

  private registerListener(runner: Runner) {
    runnerEvents.forEach((event) => {
      runner.on(event, (...args: unknown[]) => this.eventHandler(event, ...args));
    });
  }

  private eventHandler(event: RunnerEvent, ...args: unknown[]) {
    if (event === 'processClose' || event === 'processExit') {
      this.task?.resolve();
      this.task = undefined;
      this._stopReason = this._stopReason ?? 'process-end';
    }
    this.request.listener.onEvent(this, event, ...args);
  }

  toString(): string {
    return `NightwatchProcess: ${this.desc}\tStop Reason:${this.stopReason}`;
  }
}
