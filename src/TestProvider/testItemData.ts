import { ItBlock } from 'jest-editor-support';
import path from 'path';
import * as vscode from 'vscode';
import { extensionId } from '../appGlobals';
import { Logging } from '../Logging';
import { NightwatchExtRequestType, NightwatchRunEvent } from '../NightwatchExt';
import { NightwatchProcessInfo } from '../NightwatchProcessManagement';
import { TestAssertionStatus } from '../NightwatchRunner';
import {
  ContainerNode,
  DataNode,
  ROOT_NODE_NAME,
} from '../TestResults/matchNode';
import { TestSuitChangeEvent } from '../TestResults/testResultEvents';
import { ItemNodeType, TestSuiteResult } from '../TestResults/types';
import * as vsCodeTypes from '../types/vscodeTypes';
import { NightwatchTestProviderContext } from './testProviderContext';
import {
  Debuggable,
  ItemDataNodeType,
  NightwatchRunnable,
  TestItemData,
  TestItemRun,
  TestItemRunRequest,
  WithUri,
} from './types';

const deepItemState = (
  item: vsCodeTypes.TestItem,
  setState: (item: vsCodeTypes.TestItem) => void,
): void => {
  setState(item);
  item.children.forEach((child) => deepItemState(child, setState));
};

const isDataNode = (arg: ItemNodeType): arg is ItemDataNodeType =>
  (arg as any).data != null;
const isAssertDataNode = (
  arg: ItemNodeType,
): arg is DataNode<TestAssertionStatus> =>
  isDataNode(arg) && (arg.data as any).fullName;

const isTestItemRunRequest = (arg: any): arg is TestItemRunRequest =>
  arg.itemRun?.item && arg.itemRun?.run && arg.itemRun?.end;

abstract class TestItemDataBase
  implements TestItemData, NightwatchRunnable, WithUri
{
  item!: vsCodeTypes.TestItem;
  log: Logging;

  // TODO: add vscode in the constructor as an arg
  constructor(public context: NightwatchTestProviderContext, name: string) {
    this.log = context.ext.loggingFactory.create(name);
  }

  get uri(): vsCodeTypes.Uri {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return this.item.uri!;
  }

  scheduleTest(run: vsCodeTypes.TestRun, end: () => void): void {
    const nightwatchRequest = this.getNightwatchRunRequest();
    const itemRun: TestItemRun = { item: this.item, run, end };
    deepItemState(this.item, run.enqueued);

    const process = this.context.ext.session.scheduleProcess({
      ...nightwatchRequest,
      itemRun,
    });
    if (!process) {
      const msg = `failed to schedule test for ${this.item.id}`;
      run.errored(this.item, new vscode.TestMessage(msg));
      this.context.appendOutput(msg, run, true, 'red');
      end();
    }
  }

  abstract getNightwatchRunRequest(): NightwatchExtRequestType;
}

export class FolderData extends TestItemDataBase {
  static makeUri = (
    parent: vscode.TestItem,
    folderName: string,
  ): vscode.Uri => {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return vscode.Uri.joinPath(parent.uri!, folderName);
  };

  constructor(
    readonly context: NightwatchTestProviderContext,
    readonly name: string,
    parent: vscode.TestItem,
  ) {
    super(context, 'FolderData');
    this.item = this.createTestItem(name, parent);
  }

  private createTestItem(name: string, parent: vscode.TestItem) {
    const uri = FolderData.makeUri(parent, name);
    const item = this.context.createTestItem(
      uri.fsPath,
      name,
      uri,
      this,
      parent,
      ['run'],
    );

    item.canResolveChildren = false;
    return item;
  }

  getNightwatchRunRequest(): NightwatchExtRequestType {
    return {
      type: 'by-file',
      testFileName: this.uri.fsPath,
    };
  }
}

abstract class TestResultData extends TestItemDataBase {
  constructor(readonly context: NightwatchTestProviderContext, name: string) {
    super(context, name);
  }

  makeTestId(
    fileUri: vscode.Uri,
    target?: ItemNodeType,
    extra?: string,
  ): string {
    const parts = [fileUri.fsPath];
    if (target && target.name !== ROOT_NODE_NAME) {
      parts.push(target.fullName);
    }
    if (extra) {
      parts.push(extra);
    }
    return parts.join('#');
  }

  updateItemState(
    run: vscode.TestRun,
    result?: TestSuiteResult | TestAssertionStatus,
    errorLocation?: vscode.Location,
  ): void {
    if (!result) {
      return;
    }
    const status = result.status;
    switch (status) {
      case 'KnownSuccess':
        run.passed(this.item);
        break;
      case 'KnownSkip':
        run.skipped(this.item);
        break;
      case 'KnownFail': {
        const message = new vscode.TestMessage(result.message);
        if (errorLocation) {
          message.location = errorLocation;
        }

        run.failed(this.item, message);
        break;
      }
    }
  }

  isSameId(id1: string, id2: string): boolean {
    if (id1 === id2) {
      return true;
    }
    // truncate the last "extra-id" added for duplicate test names before comparing
    const truncateExtra = (id: string): string =>
      id.replace(/(.*)(#[0-9]+$)/, '$1');
    return truncateExtra(id1) === truncateExtra(id2);
  }

  syncChildNodes(node: ItemNodeType): void {
    const testId = this.makeTestId(this.uri, node);
    if (!this.isSameId(testId, this.item.id)) {
      this.item.error = 'invalid node';
      return;
    }
    this.item.error = undefined;

    if (!isDataNode(node)) {
      const idMap = [...node.childContainers, ...node.childData]
        .flatMap((n) => n.getAll() as ItemDataNodeType[])
        .reduce((map, node) => {
          const id = this.makeTestId(this.uri, node);
          map.set(id, map.get(id)?.concat(node) ?? [node]);
          return map;
        }, new Map<string, ItemDataNodeType[]>());

      const newItems: vscode.TestItem[] = [];
      idMap.forEach((nodes, id) => {
        if (nodes.length > 1) {
          // duplicate names found, append index to make a unique id: re-create the item with new id
          nodes.forEach((n, idx) => {
            newItems.push(
              new TestData(this.context, this.uri, n, this.item, `${idx}`).item,
            );
          });
          return;
        }
        let cItem = this.item.children.get(id);
        if (cItem) {
          this.context.getData<TestData>(cItem)?.updateNode(nodes[0]);
        } else {
          cItem = new TestData(this.context, this.uri, nodes[0], this.item)
            .item;
        }
        newItems.push(cItem);
      });
      this.item.children.replace(newItems);
    } else {
      this.item.children.replace([]);
    }
  }

  createLocation(uri: vscode.Uri, zeroBasedLine = 0): vscode.Location {
    return new vscode.Location(
      uri,
      new vscode.Range(
        new vscode.Position(zeroBasedLine, 0),
        new vscode.Position(zeroBasedLine, 0),
      ),
    );
  }
}

export class TestDocumentRoot extends TestResultData {
  constructor(
    readonly context: NightwatchTestProviderContext,
    fileUri: vscode.Uri,
    parent: vscode.TestItem,
  ) {
    super(context, 'TestDocumentRoot');
    this.item = this.createTestItem(fileUri, parent);
  }

  private createTestItem(
    fileUri: vscode.Uri,
    parent: vscode.TestItem,
  ): vscode.TestItem {
    const item = this.context.createTestItem(
      this.makeTestId(fileUri),
      path.basename(fileUri.fsPath),
      fileUri,
      this,
      parent,
    );

    item.canResolveChildren = true;
    return item;
  }

  discoverTest = (
    run?: vscode.TestRun,
    parsedRoot?: ContainerNode<ItBlock>,
  ): void => {
    this.createChildItems(parsedRoot);
    if (run) {
      this.updateResultState(run);
    }
  };

  private createChildItems = (parsedRoot?: ContainerNode<ItBlock>): void => {
    try {
      const container =
        parsedRoot ??
        this.context.ext.testResolveProvider.getTestSuiteResult(this.item.id)
          ?.assertionContainer;
      if (!container) {
        this.item.children.replace([]);
      } else {
        this.syncChildNodes(container);
      }
    } catch (e) {
      this.log(
        'error',
        `[TestDocumentRoot] "${this.item.id}" createChildItems failed:`,
        e,
      );
    } finally {
      this.item.canResolveChildren = false;
    }
  };

  public updateResultState(run: vscode.TestRun): void {
    const suiteResult = this.context.ext.testResolveProvider.getTestSuiteResult(
      this.item.id,
    );
    this.updateItemState(run, suiteResult);

    this.item.children.forEach((childItem) =>
      this.context.getData<TestData>(childItem)?.updateResultState(run),
    );
  }

  getNightwatchRunRequest = (): NightwatchExtRequestType => {
    return {
      type: 'by-file',
      testFileName: this.uri.fsPath,
    };
  };

  getDebugInfo(): ReturnType<Debuggable['getDebugInfo']> {
    return { fileName: this.uri.fsPath };
  }

  public onTestMatched = (): void => {
    this.item.children.forEach((childItem) =>
      this.context.getData<TestData>(childItem)?.onTestMatched(),
    );
  };
}

export class WorkspaceRoot extends TestItemDataBase implements Debuggable {
  private testDocuments: Map<string, TestDocumentRoot>;
  private listeners: vsCodeTypes.Disposable[];
  private cachedRun: Map<string, TestItemRun>;

  constructor(context: NightwatchTestProviderContext) {
    super(context, 'WorkspaceRoot');
    this.item = this.createTestItem();
    this.testDocuments = new Map();
    this.listeners = [];
    this.cachedRun = new Map();

    this.registerEvents();
  }

  createTestItem(): vsCodeTypes.TestItem {
    const item = this.context.createTestItem(
      `${extensionId}:${this.context.ext.workspace.name}`,
      this.context.ext.workspace.name,
      this.context.ext.workspace.uri,
      this,
      undefined,
      ['run'],
    );

    item.canResolveChildren = true;
    return item;
  }

  // TODO: transform was here, add it back incase if it causes problem
  getNightwatchRunRequest(): NightwatchExtRequestType {
    return { type: 'all-tests' };
  }

  getDebugInfo(): ReturnType<Debuggable['getDebugInfo']> {
    return { fileName: this.uri.fsPath };
  }

  discoverTest(run: vscode.TestRun): void {
    const testList = this.context.ext.testResolveProvider.getTestList();
    // only trigger update when testList is not empty because it's possible test-list is not available yet,
    // in such case we should just wait for the testListUpdated event to trigger the update
    if (testList.length > 0) {
      this.onTestListUpdated(testList, run);
    } else {
      run.end();
      this.item.canResolveChildren = false;
    }
  }

  // test result event handling
  private registerEvents = (): void => {
    this.listeners = [
      this.context.ext.testResolveProvider.events.testListUpdated.event(
        this.onTestListUpdated,
      ),
      this.context.ext.testResolveProvider.events.testSuiteChanged.event(
        this.onTestSuiteChanged,
      ),
      this.context.ext.sessionEvents.onRunEvent.event(this.onRunEvent),
    ];
  };
  private unregisterEvents = (): void => {
    this.listeners.forEach((l) => l.dispose());
    this.listeners.length = 0;
  };

  private createRun = (
    name?: string,
    item?: vscode.TestItem,
  ): vscode.TestRun => {
    const target = item ?? this.item;
    return this.context.createTestRun(
      new vscode.TestRunRequest([target]),
      name ?? target.id,
    );
  };

  private addFolder = (
    parent: FolderData | undefined,
    folderName: string,
  ): FolderData => {
    const p = parent ?? this;
    const uri = FolderData.makeUri(p.item, folderName);
    return (
      this.context.getChildData<FolderData>(p.item, uri.fsPath) ??
      new FolderData(this.context, folderName, p.item)
    );
  };
  private addPath = (absoluteFileName: string): FolderData | undefined => {
    const relativePath = path.relative(
      this.context.ext.workspace.uri.fsPath,
      absoluteFileName,
    );
    const folders = relativePath.split(path.sep).slice(0, -1);

    return folders.reduce(this.addFolder, undefined);
  };
  /**
   * create a test item hierarchy for the given the test file based on its reltive path. If the file is not
   * a test file, exception will be thrown.
   */
  private addTestFile = (
    absoluteFileName: string,
    onTestDocument: (doc: TestDocumentRoot) => void,
  ): TestDocumentRoot => {
    const parent = this.addPath(absoluteFileName) ?? this;
    let docRoot = this.context.getChildData<TestDocumentRoot>(
      parent.item,
      absoluteFileName,
    );
    if (!docRoot) {
      docRoot = this.testDocuments.get(absoluteFileName);
      if (docRoot) {
        parent.item.children.add(docRoot.item);
      } else {
        docRoot = new TestDocumentRoot(
          this.context,
          vscode.Uri.file(absoluteFileName),
          parent.item,
        );
      }
    }
    this.testDocuments.set(absoluteFileName, docRoot);

    onTestDocument(docRoot);

    return docRoot;
  };

  /**
   * When test list updated, rebuild the whole testItem tree for all the test files (DocumentRoot).
   * But will reuse the existing test document from cache (testDocuments) to preserve info
   * such as parsed result that could be stored before test list update
   */
  private onTestListUpdated = (
    absoluteFileNames: string[] | undefined,
    run?: vscode.TestRun,
  ): void => {
    this.item.children.replace([]);
    const testRoots: TestDocumentRoot[] = [];

    const aRun = run ?? this.createRun();
    try {
      absoluteFileNames?.forEach((f) =>
        this.addTestFile(f, (testRoot) => {
          testRoot.updateResultState(aRun);
          testRoots.push(testRoot);
        }),
      );
      //sync testDocuments
      this.testDocuments.clear();
      testRoots.forEach((t) => this.testDocuments.set(t.item.id, t));
    } catch (e) {
      this.log(
        'error',
        `[WorkspaceRoot] "${this.item.id}" onTestListUpdated failed:`,
        e,
      );
    } finally {
      aRun.end();
    }
    this.item.canResolveChildren = false;
  };

  /**
   * invoked when external test result changed, this could be caused by the watch-mode or on-demand test run, includes vscode's runTest.
   * We will try to find the run based on the event's id, if found, means a vscode runTest initiated such run, will use that run to
   * ask all touched DocumentRoot to refresh both the test items and their states.
   *
   * @param event
   */
  private onTestSuiteChanged = (event: TestSuitChangeEvent): void => {
    switch (event.type) {
      case 'assertions-updated': {
        const itemRun = this.getItemRun(event.process);
        const run = itemRun?.run ?? this.createRun(event.process.id);

        this.context.appendOutput(
          `update status from run "${event.process.id}": ${event.files.length} files`,
          run,
        );
        try {
          event.files.forEach((f) =>
            this.addTestFile(f, (testRoot) => testRoot.discoverTest(run)),
          );
        } catch (e) {
          this.log(
            'error',
            `"${this.item.id}" onTestSuiteChanged: assertions-updated failed:`,
            e,
          );
        } finally {
          (itemRun ?? run).end();
        }
        break;
      }
      case 'result-matched': {
        this.addTestFile(event.file, (testRoot) => testRoot.onTestMatched());
        break;
      }
      case 'test-parsed': {
        this.addTestFile(event.file, (testRoot) =>
          testRoot.discoverTest(undefined, event.testContainer),
        );
      }
    }
  };

  /** get test item from nightwatch process. If running tests from source file, will return undefined */
  private getItemFromProcess = (
    process: NightwatchProcessInfo,
  ): vscode.TestItem | undefined => {
    let fileName;
    switch (process.request.type) {
      case 'all-tests':
        return this.item;
      case 'by-file':
        fileName = process.request.testFileName;
        break;
      default:
        throw new Error(
          `unsupported external process type ${process.request.type}`,
        );
    }

    return this.testDocuments.get(fileName)?.item;
  };

  private createTestItemRun = (event: NightwatchRunEvent): TestItemRun => {
    const item = this.getItemFromProcess(event.process) ?? this.item;
    const run = this.createRun(`${event.type}:${event.process.id}`, item);
    const end = () => {
      this.cachedRun.delete(event.process.id);
      run.end();
    };
    const itemRun: TestItemRun = { item, run, end };
    this.cachedRun.set(event.process.id, itemRun);
    return itemRun;
  };

  private getItemRun = (
    process: NightwatchProcessInfo,
  ): TestItemRun | undefined =>
    isTestItemRunRequest(process.request)
      ? process.request.itemRun
      : this.cachedRun.get(process.id);

  private onRunEvent = (event: NightwatchRunEvent) => {
    if (event.process.request.type === 'not-test') {
      return;
    }

    let itemRun = this.getItemRun(event.process);

    try {
      switch (event.type) {
        case 'scheduled': {
          if (!itemRun) {
            itemRun = this.createTestItemRun(event);
            const text = `Scheduled test run "${event.process.id}" for "${itemRun.item.id}"`;
            this.context.appendOutput(text, itemRun.run);
            deepItemState(itemRun.item, itemRun.run.enqueued);
          }

          break;
        }
        case 'data': {
          itemRun = itemRun ?? this.createTestItemRun(event);
          const text = event.raw ?? event.text;
          const color = event.isError ? 'red' : undefined;
          this.context.appendOutput(
            text,
            itemRun.run,
            event.newLine ?? false,
            color,
          );
          break;
        }
        case 'start': {
          itemRun = itemRun ?? this.createTestItemRun(event);
          deepItemState(itemRun.item, itemRun.run.started);
          break;
        }
        case 'end': {
          itemRun?.end();
          break;
        }
        case 'exit': {
          if (event.error) {
            if (!itemRun || itemRun.run.token.isCancellationRequested) {
              itemRun = this.createTestItemRun(event);
            }
            this.context.appendOutput(event.error, itemRun.run, true, 'red');
            itemRun.run.errored(
              itemRun.item,
              new vscode.TestMessage(event.error),
            );
          }
          itemRun?.end();
          break;
        }
      }
    } catch (err) {
      this.log('error', `<onRunEvent> ${event.type} failed:`, err);
    }
  };

  dispose(): void {
    this.unregisterEvents();
    this.cachedRun.forEach((run) => run.end());
  }
}

export class TestData extends TestResultData implements Debuggable {
  constructor(
    readonly context: NightwatchTestProviderContext,
    fileUri: vscode.Uri,
    private node: ItemNodeType,
    parent: vscode.TestItem,
    extraId?: string,
  ) {
    super(context, 'TestData');
    this.item = this.createTestItem(fileUri, parent, extraId);
    this.updateNode(node);
  }

  private createTestItem(
    fileUri: vscode.Uri,
    parent: vscode.TestItem,
    extraId?: string,
  ) {
    const item = this.context.createTestItem(
      this.makeTestId(fileUri, this.node, extraId),
      this.node.name,
      fileUri,
      this,
      parent,
    );

    item.canResolveChildren = false;
    return item;
  }

  getNightwatchRunRequest(): NightwatchExtRequestType {
    // TODO: remove describeBlock condition. It's added as nightwatch can't run describe at the moment
    if (this.node.describeBlock) {
      return {
        type: 'by-file',
        testFileName: this.uri.fsPath,
      };
    } else {
      return {
        type: 'by-file-test',
        testFileName: this.uri.fsPath,
        testName: this.node.name,
      };
    }
  }

  getDebugInfo(): ReturnType<Debuggable['getDebugInfo']> {
    return { fileName: this.uri.fsPath, testNamePattern: this.node.name };
  }

  private updateItemRange(): void {
    if (this.node.attrs.range) {
      const pos = [
        this.node.attrs.range.start.line,
        this.node.attrs.range.start.column,
        this.node.attrs.range.end.line,
        this.node.attrs.range.end.column,
      ];
      if (pos.every((n) => n >= 0)) {
        this.item.range = new vscode.Range(pos[0], pos[1], pos[2], pos[3]);
        return;
      }
    }
    this.item.range = undefined;
  }

  updateNode(node: ItemNodeType): void {
    this.node = node;
    this.updateItemRange();
    this.syncChildNodes(node);
  }

  public onTestMatched(): void {
    // assertion might have picked up source block location
    this.updateItemRange();
    this.item.children.forEach((childItem) =>
      this.context.getData<TestData>(childItem)?.onTestMatched(),
    );
  }

  public updateResultState(run: vscode.TestRun): void {
    if (this.node && isAssertDataNode(this.node)) {
      const assertion = this.node.data;
      const errorLine =
        assertion.line != null
          ? this.createLocation(this.uri, assertion.line - 1)
          : undefined;
      this.updateItemState(run, assertion, errorLine);
    }
    this.item.children.forEach((childItem) =>
      this.context.getData<TestData>(childItem)?.updateResultState(run),
    );
  }
}
