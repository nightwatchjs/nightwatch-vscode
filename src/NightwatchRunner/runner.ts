import { ChildProcess, spawn } from 'child_process';
import { EventEmitter } from 'events';
import { readFile } from 'fs';
import { tmpdir } from 'os';
import path, { join } from 'path';
import { Logging, LoggingFactory } from '../Logging/types';
import { NightwatchExtensionResourceSettings, Settings } from '../Settings';
import { createProcess } from './process';
import ProjectWorkspace from './projectWorkspace';
import { Options, OutputType, RunnerEvent } from './types';

export const runnerEvents: RunnerEvent[] = [
  'executableOutput',
  'executableStdErr',
  'executableJSON',
  'processExit',
  'processClose',
  'terminalError',
];

const outputTypes = {
  unknown: 0,
  testResults: 1,
  noTests: 2,
};

export default class Runner extends EventEmitter {
  private logging: Logging;
  childProcess?: ChildProcess;
  workspace: ProjectWorkspace;
  options: Options;
  outputPath: string;
  _createProcess: (projectWorkspace: ProjectWorkspace, args: string[], logging: Logging) => ChildProcess;
  _exited: boolean;
  private _settings: NightwatchExtensionResourceSettings;
  private _nightwatchSettings: Settings;

  constructor(
    workspace: ProjectWorkspace,
    logger: LoggingFactory,
    settings: NightwatchExtensionResourceSettings,
    nightwatchSettings: Settings,
    options?: Options
  ) {
    super();

    this._createProcess = createProcess;
    this.workspace = workspace;
    this.options = options || { reporter: options!.reporter };
    this.outputPath = path.join(tmpdir(), `nightwatch_runner_${this.workspace.outputFileSuffix || ''}_${Date.now()}`);
    this._exited = false;
    this.logging = logger.create('Runner');
    this._settings = settings;
    this._nightwatchSettings = nightwatchSettings;
  }

  getArgs(): string[] {
    const args = ['--reporter', this.options.reporter, '--output', this.outputPath];
    const headlessMode = this._nightwatchSettings.get<boolean>(`quickSettings.headlessMode`);
    const openReport = this._nightwatchSettings.get<boolean>(`quickSettings.openReport`);
    const environment = this._nightwatchSettings.get<string>(`quickSettings.environments`);
    const parallels = this._nightwatchSettings.get<number>(`quickSettings.parallels`);

    this.logging('debug', `JSON output location: ${this.outputPath}`);

    if (headlessMode) {
      args.push('--headless');
    }

    if (openReport) {
      args.push('--open');
    }

    if (environment.length > 0) {
      args.push('--env', environment);
    }

    args.push('--parallel', parallels.toString());

    if (this.options.args) {
      if (this.options.args.replace) {
        return this.options.args.args;
      }
      return [...this.options.args.args, ...args];
    }

    return args;
  }

  start() {
    if (this.childProcess) {
      return;
    }

    const args = this.getArgs();
    this.childProcess = this._createProcess(this.workspace, args, this.logging);

    // TODO: Fix stout/stderr can be null, if childProcess failed to spawn
    this.childProcess.stdout!.on('data', (data: Buffer) => {
      this._parseOutput(data, false, this.logging);
      // this.emit('executableOutput', data.toString());
    });

    this.childProcess.stderr!.on('data', (data) => {
      this._parseOutput(data, true, this.logging);
      // this.emit('executableStdErr', data);
    });

    this.childProcess.on('exit', (code: number | null, signal: string | null) => {
      this._exited = true;

      this.emit('processExit', code, signal);
    });

    this.childProcess.on('error', (error: Error) => {
      this.emit('terminalError', `Process failed: ${error.message}`);
    });

    this.childProcess.on('close', (code: number | null, signal: string | null) => {
      this.emit('processClose', code, signal);
    });
  }

  closeProcess() {
    if (!this.childProcess || this._exited) {
      this.logging('debug', 'process has not started or already exited');
      return;
    }

    if (process.platform === 'win32') {
      // exit process on windows
      spawn('taskkill', ['/pid', `${this.childProcess.pid}`, '/T', '/F']);
    } else {
      try {
        // kill all the process with the same PGID, i.e.
        // as a detached process, it is the same as the PID of the leader process.
        process.kill(-this.childProcess.pid!);
      } catch (error) {
        this.logging(
          'warn',
          `failed to kill process group, this may leave some orphan process ${this.childProcess.pid}, error: ${error}`
        );
        this.childProcess.kill();
      }
    }
    delete this.childProcess;
  }

  _parseOutput(data: Buffer, isStdErr: boolean, logging: Logging): void {
    const outputType = this.findOutputType(data);
    switch (outputType) {
      case outputTypes.noTests:
        this.emit('executableStdErr', data);
        break;
      case outputTypes.testResults:
        //TODO: implement executableJSON listener
        const jsonReport = join(this.outputPath, 'report.json');
        readFile(jsonReport, 'utf-8', (error, _data) => {
          if (error) {
            const message = `JSON report not found at ${this.outputPath}`;
            this.emit('terminalError', message);
          } else {
            this.emit('executableJSON', JSON.parse(_data));
          }
        });
        break;
      default:
        // no special action needed, just report the output by its source
        if (isStdErr) {
          this.emit('executableStdErr', data);
        } else {
          this.emit('executableOutput', data.toString());
        }
        break;
    }
  }

  findOutputType(data: Buffer): OutputType {
    const noTestRegex = /No test source specified, please check "src_folders" config/;
    const testResultsRegex = /Wrote [a-zA-Z]+ report file to:/;

    const checks = [
      { regex: testResultsRegex, messageType: outputTypes.testResults },
      { regex: noTestRegex, messageType: outputTypes.noTests },
    ];

    const str = data.toString('utf8');
    const match = checks.find(({ regex }) => regex.test(str));
    return match ? match.messageType : outputTypes.unknown;
  }
}
