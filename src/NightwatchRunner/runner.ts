import { ChildProcess, spawn } from 'child_process';
import { EventEmitter } from 'events';
import { createProcess } from './process';
import ProjectWorkspace from './projectWorkspace';
import { Options } from './types';

export default class Runner extends EventEmitter {
  childProcess?: ChildProcess;
  workspace: ProjectWorkspace;
  options: Options;
  _createProcess: (projectWorkspace: ProjectWorkspace, args: string[]) => ChildProcess;
  _exited: boolean;

  constructor(workspace: ProjectWorkspace, options?: Options) {
    super();

    this._createProcess = createProcess;
    this.workspace = workspace;
    this.options = options || {};
    this._exited = false;
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
    this.childProcess = createProcess(this.workspace, args);

    this.childProcess.on('data', (data: Buffer) => {
      this.emit('executableOutput', data.toString());
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
      // TODO: Replace with common logger
      console.log(`process has not started or already exited`);
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
        console.warn(`failed to kill process group, this may leave some orphan process ${this.childProcess.pid}, error: ${error}`);
        this.childProcess.kill();
      }
    }
    delete this.childProcess;
  }
}
