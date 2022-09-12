import { ChildProcess, spawn } from 'child_process';
import { EventEmitter } from 'events';
import { existsSync, readFile } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import { Logging, LoggingFactory } from '../Logging/types';
import { createProcess } from './process';
import ProjectWorkspace from './projectWorkspace';
import { Options, OutputType, RunnerEvent } from './types';

export const runnerEvents: RunnerEvent[] = [
  'executableOutput',
  'executableStdErr',
  'processExit',
  'processClose',
  'terminalError',
];

const outputTypes = {
  unknown: 0,
  testResults: 1,
  noTest: 2,
};

export default class Runner extends EventEmitter {
  private logging: Logging;
  childProcess?: ChildProcess;
  workspace: ProjectWorkspace;
  options: Options;
  outputPath: string;
  _createProcess: (projectWorkspace: ProjectWorkspace, args: string[], logging: Logging) => ChildProcess;
  _exited: boolean;

  constructor(workspace: ProjectWorkspace, logger: LoggingFactory, options?: Options) {
    super();

    this._createProcess = createProcess;
    this.workspace = workspace;
    this.options = options || {};
    this.outputPath = path.join(
      tmpdir(),
      `nightwatch_runner_${this.workspace.outputFileSuffix || ''}_${Date.now()}.json`
    );
    this._exited = false;
    this.logging = logger.create('Runner');
  }

  getArgs(): string[] {
    if (this.options.args && this.options.args.replace) {
      return this.options.args.args;
    }

    const args = ['--report-filename', this.outputPath];
    this.logging('debug', `JSON output location: ${this.outputPath}`);
    if (this.options.env) {
      args.unshift(`-e`, this.options.env);
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
      // this._parseOutput(data, false, this.logging);
      this.emit('executableOutput', data.toString());
    });

    this.childProcess.stderr!.on('data', (data) => {
      // this._parseOutput(data, true, this.logging)
      this.emit('executableStdErr', data);
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
      case outputTypes.noTest:
      case outputTypes.unknown:
        this.emit('executableStdErr', data);
        break;
      case outputTypes.testResults:
        //TODO: implement executableJSON listener
        readFile(this.outputPath, 'utf-8', (error, _data) => {
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
    const str = data.toString('utf-8');

    const match = noTestRegex.test(str);

    if (match) {
      return outputTypes.noTest;
    }

    if (existsSync(this.outputPath)) {
      return outputTypes.testResults;
    }

    return outputTypes.unknown;
  }
}
