import JSON5 from 'json5';
import * as vscode from 'vscode';
import { Logging } from '../Logging';
import { systemErrorMessage, MessageAction } from '../messaging';
import { NightwatchProcess } from '../NightwatchProcessManagement';
import { NightwatchProcessEvent } from '../NightwatchProcessManagement';
import * as vsCodeTypes from '../types/vscodeTypes';
import { cleanAnsi, getUniqueTestsList } from './helper';
import { ListenerSession, ListTestFilesCallback, NightwatchRunEvent } from './types';

const POSSIBLE_DRIVER_ERR_REGEX = /([a-zA-z]+)driver cannot be found/im;

export class AbstractProcessListener {
  protected session: ListenerSession;
  protected readonly logging: Logging;
  public onRunEvent: vsCodeTypes.EventEmitter<NightwatchRunEvent>;
  // flag indicating driver not found
  protected driverNotFound: boolean;
  protected driverName: string;

  constructor(session: ListenerSession) {
    this.session = session;
    this.logging = session.context.loggingFactory.create(this.name);
    this.onRunEvent = session.context.onRunEvent;
    this.driverNotFound = false;
    this.driverName = '';
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

      case 'executableJSON': {
        // TODO: replace any with NightwatchTotalResults
        this.onExecutableJSON(nightwatchProcess, args[0] as any);
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

  // TODO: replace any with NightwatchTotalResults
  protected onExecutableJSON(process: NightwatchProcess, data: any): void {
    this.logging('debug', `${process.request.type} onExecutableJSON:`, data);
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
    // no default behavior...
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
    return code != null && code > 1;
  }
}

export class RunTestListener extends AbstractProcessListener {
  protected get name(): string {
    return 'RunTestListener';
  }

  private setupDriverInstallationAction(driver: string): MessageAction {
    const [workspaceFolder] = vscode.workspace.workspaceFolders || [];

    return {
      title: 'Install Driver',
      action: (): void => {
        const terminal = vscode.window.createTerminal({
          name: 'Install Driver',
          cwd: workspaceFolder.uri.fsPath,
          env: process.env,
        });

        terminal.show();
        terminal.sendText(`npm i -D ${driver}`);
      },
    };
  }

  //=== event handlers ===
  protected onExecutableStdErr(process: NightwatchProcess, message: string, raw: string): void {
    if (message.length <= 0) {
      return;
    }
    if (POSSIBLE_DRIVER_ERR_REGEX.test(message)) {
      this.driverNotFound = true;

      const match = POSSIBLE_DRIVER_ERR_REGEX.exec(message);
      if (match) {
        this.driverName = match[1];
      }
    }

    this.onRunEvent.fire({ type: 'data', process, text: message, raw });
  }

  protected onExecutableOutput(process: NightwatchProcess, output: string, raw: string): void {
    if (!(output.length <= 0)) {
      this.onRunEvent.fire({ type: 'data', process, text: output, raw });
    }
  }

  // TODO: replace any with NightwatchTotalResults
  protected onExecutableJSON(process: NightwatchProcess, data: any): void {
    this.session.context.updateWithData(data, process);
  }

  protected onTerminalError(process: NightwatchProcess, data: string, raw: string): void {
    this.onRunEvent.fire({ type: 'data', process, text: data, raw, newLine: true, isError: true });
  }

  protected onProcessExit(_process: NightwatchProcess): void {
    //override parent method so we will fire run event only when process closed
  }

  protected onProcessClose(process: NightwatchProcess): void {
    super.onProcessClose(process);

    if (this.driverNotFound) {
      this.driverName.length > 1
        ? systemErrorMessage(
            vscode,
            `${this.driverName}Driver cannot be found in the current project.`,
            this.setupDriverInstallationAction(`${this.driverName.toLowerCase()}driver`)
          )
        : systemErrorMessage(vscode, `${this.driverName}Driver cannot be found in the current project.`);
    }

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
      const testFileList: string[] = getUniqueTestsList(JSON.parse(this.buffer.toString()));
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
