import { ChildProcess, spawn } from 'child_process';
import { EventEmitter } from 'events';
import { workspaceLogging } from '../Logging';
import { Logging, LoggingFactory } from '../Logging/types';
import { createProcess } from './process';
import ProjectWorkspace from './projectWorkspace';
import { Options, RunnerEvent } from './types';

export const runnerEvents: RunnerEvent[] = [
  'executableOutput',
  'executableStdErr',
  'processExit',
  'processClose',
  'terminalError',
];

export default class Runner extends EventEmitter {
  private logging: Logging;
  childProcess?: ChildProcess;
  workspace: ProjectWorkspace;
  options: Options;
  _createProcess: (projectWorkspace: ProjectWorkspace, args: string[], logging: Logging) => ChildProcess;
  _exited: boolean;

  constructor(workspace: ProjectWorkspace, logger: LoggingFactory, options?: Options) {
    super();

    this._createProcess = createProcess;
    this.workspace = workspace;
    this.options = options || {};
    this._exited = false;
    this.logging = logger.create('Runner');
  }

  getArgs(): string[] {
    const args = [];
    if (this.options.env) {
      args.push(`-e`, this.options.env);
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
      this.emit('executableOutput', data.toString());
    });

    this.childProcess.stderr!.on('data', (data) => {
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
}
