export type {
  CancellationToken,
  ConfigurationChangeEvent,
  DebugConfiguration,
  DebugConfigurationProvider,
  DiagnosticCollection,
  Disposable,
  Event,
  EventEmitter,
  ExtensionContext,
  FileCreateEvent,
  FileDeleteEvent,
  FileRenameEvent,
  QuickPick,
  QuickPickItem,
  TestController,
  TestItem,
  TestRun,
  TestRunProfile,
  TestRunRequest,
  TextDocument,
  TextDocumentChangeEvent,
  TextDocumentWillSaveEvent,
  TextEditor,
  Uri,
  Webview,
  WebviewView,
  WebviewViewProvider,
  WorkspaceConfiguration,
  WorkspaceFolder,
  WorkspaceFoldersChangeEvent,
} from 'vscode';

export type VSCode = typeof import('vscode');
