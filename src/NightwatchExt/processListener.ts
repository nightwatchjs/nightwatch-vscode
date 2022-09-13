import JSON5 from 'json5';
import * as vscode from 'vscode';
import { Logging } from '../Logging';
import { NightwatchProcess } from '../NightwatchProcessManagement';
import { NightwatchProcessEvent } from '../nightwatchProcessManagement';
import * as vsCodeTypes from '../types/vscodeTypes';
import { cleanAnsi } from './helper';
import { ListenerSession, ListTestFilesCallback, NightwatchRunEvent } from './types';

export class AbstractProcessListener {
  protected session: ListenerSession;
  protected readonly logging: Logging;
  public onRunEvent: vsCodeTypes.EventEmitter<NightwatchRunEvent>;

  constructor(session: ListenerSession) {
    this.session = session;
    this.logging = session.context.loggingFactory.create(this.name);
    this.onRunEvent = session.context.onRunEvent;
  }

  protected get name() {
    return 'AbstractProcessListener';
  }

  onEvent(nightwatchProcess: NightwatchProcess, event: NightwatchProcessEvent, ...args: unknown[]): void {
    switch (event) {
      case 'executableOutput': {
        const str = args[0] as string;
        this.onExecutableOutput(nightwatchProcess, cleanAnsi(str), str);
        break;
      }

      case 'executableStdErr': {
        const data = (args[0] as Buffer).toString();
        this.onExecutableStdErr(nightwatchProcess, cleanAnsi(data), data);
        break;
      }

      case 'processExit': {
        const [code, signal] = args as [number | null, string | null];
        this.onProcessExit(nightwatchProcess, code ?? undefined, signal ?? undefined);
        break;
      }

      case 'processStarting': {
        this.onProcessStarting(nightwatchProcess);
        break;
      }

      case 'processClose': {
        const [code, signal] = args as [number | null, string | null];
        this.onProcessClose(nightwatchProcess, code ?? undefined, signal ?? undefined);
        break;
      }

      case 'terminalError': {
        const str = args[0] as string;
        this.onTerminalError(nightwatchProcess, cleanAnsi(str), str);
        break;
      }

      default:
        this.logging('warn', `received unexpected event "${event}" for process:`, nightwatchProcess.request);
    }
  }

  // TODO: remove _raw if not used
  protected onExecutableOutput(process: NightwatchProcess, data: string, _raw: string): void {
    this.logging('debug', `${process.request.type} onExecutableOutput:`, data);
  }

  protected onExecutableStdErr(process: NightwatchProcess, data: string, _raw: string): void {
    this.logging('debug', `${process.request.type} onExecutableStdErr:`, data);
  }

  protected onProcessExit(process: NightwatchProcess, code?: number, signal?: string): void {
    // code = 1 is general error, usually mean the command emit error, which should already handled by other event processing, for example when Nightwatch has failed tests.
    // However, error beyond 1, usually means some error outside of the command it is trying to execute, so reporting here for debugging purpose
    // see shell error code: https://www.linuxjournal.com/article/10844
    if (this.isProcessError(code)) {
      const error = `${process.request.type} onProcessExit: process exit with code=${code}, signal=${signal}`;
      this.logging('warn', `${error} :`, process.toString());
    }
  }

  protected onProcessClose(_process: NightwatchProcess, _code?: number, _signal?: string): void {
    process.exitCode = _code;
  }

  protected onProcessStarting(process: NightwatchProcess): void {
    this.session.context.onRunEvent.fire({ type: 'start', process });
    this.logging('debug', `${process.request.type} onProcessStarting`);
  }

  protected onTerminalError(process: NightwatchProcess, data: string, _raw: string): void {
    this.logging('error', `${process.request.type} onTerminalError:`, data);
  }

  protected isProcessError(code?: number): boolean {
    // code = 1 is general error, usually mean the command emit error, which should already handled by other event processing, for example when nightwatch has failed tests.
    // However, error beyond 1, usually means some error outside of the command it is trying to execute, so reporting here for debugging purpose
    // see shell error code: https://www.linuxjournal.com/article/10844
    return code !== null && code !== undefined && code > 1;
  }
}

export class RunTestListener extends AbstractProcessListener {
  protected get name(): string {
    return 'RunTestListener';
  }

  protected onExecutableStdErr(process: NightwatchProcess, message: string, raw: string): void {
    if (message.length <= 0) {
      return;
    }

    this.onRunEvent.fire({ type: 'data', process, text: message, raw });
  }

  protected onExecutableOutput(process: NightwatchProcess, output: string, raw: string): void {
    if (!(output.length <= 0)) {
      this.onRunEvent.fire({ type: 'data', process, text: output, raw });
    }
  }

  protected onTerminalError(process: NightwatchProcess, data: string, raw: string): void {
    this.onRunEvent.fire({ type: 'data', process, text: data, raw, newLine: true, isError: true });
  }

  protected onProcessExit(_process: NightwatchProcess): void {
    //override parent method so we will fire run event only when process closed
  }

  protected onProcessClose(process: NightwatchProcess): void {
    super.onProcessClose(process);
    // const error = `Nightwatch process "${process.request.type}" ended unexpectedly`;
    this.onRunEvent.fire({ type: 'exit', process });
  }
}

export class ListTestFileListener extends AbstractProcessListener {
  protected get name(): string {
    return 'ListTestFileListener';
  }

  private buffer = '';
  private error: string | undefined;
  private onResult: ListTestFilesCallback;

  constructor(session: ListenerSession, onResult: ListTestFilesCallback) {
    super(session);
    this.onResult = onResult;
  }

  protected onExecutableOutput(_process: NightwatchProcess, data: string): void {
    this.buffer += data;
  }

  protected onProcessClose(process: NightwatchProcess): void {
    super.onProcessClose(process);

    if (this.error) {
      return this.onResult(undefined, this.error);
    }

    try {
      // TODO: Handle empty string
      const testFileList: string[] = JSON5.parse(this.buffer.toString());
      if (!testFileList || testFileList.length === 0) {
        // no test file is probably all right
        this.logging('debug', 'no test file is found');
        return this.onResult([]);
      }
      const uriFiles = testFileList.reduce((totalFiles, file) => {
        // convert to uri style filePath to match vscode document names
        return totalFiles.concat(vscode.Uri.file(file).fsPath);
      }, [] as string[]);

      this.logging('debug', `got ${uriFiles.length} test files`);
      return this.onResult(uriFiles);
    } catch (e) {
      this.logging('warn', 'failed to parse result:', this.buffer, 'error=', e);
      this.onResult(undefined, e);
    }
  }

  protected onProcessExit(process: NightwatchProcess, code?: number, signal?: string): void {
    // Note: will not fire 'exit' event, as the output is reported via the onResult() callback
    super.onProcessExit(process, code, signal);
    if (super.isProcessError(code)) {
      this.error = `${process.request.type} onProcessExit: process exit with code=${code}, signal=${signal}`;
    }
  }
}
