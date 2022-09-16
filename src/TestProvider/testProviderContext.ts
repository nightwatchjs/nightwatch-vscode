import * as vscode from 'vscode';
import * as vsCodeTypes from '../types/vscodeTypes';
import { NightwatchExtExplorerContext, OUTPUT_COLOR, TagIdType, TestItemData } from './types';

let showTerminal = true;
export const _resetShowTerminal = (): void => {
  showTerminal = true;
};

const COLORS = {
  ['red']: '\x1b[0;31m',
  ['green']: '\x1b[0;32m',
  ['yellow']: '\x1b[0;33m',
  ['end']: '\x1b[0m',
};

export class NightwatchTestProviderContext {
  private testItemData: WeakMap<vsCodeTypes.TestItem, TestItemData>;

  // TODO: add vscode as an arg in the constructor
  constructor(
    public readonly ext: NightwatchExtExplorerContext,
    private readonly controller: vsCodeTypes.TestController,
    private readonly profiles: vsCodeTypes.TestRunProfile[]
  ) {
    this.testItemData = new WeakMap();
  }

  createTestItem = (
    id: string,
    label: string,
    uri: vscode.Uri,
    data: TestItemData,
    parent?: vscode.TestItem,
    tagIds: TagIdType[] = ['run', 'debug']
  ): vscode.TestItem => {
    const testItem = this.controller.createTestItem(id, label, uri);
    this.testItemData.set(testItem, data);
    const collection = parent ? parent.children : this.controller.items;
    collection.add(testItem);
    tagIds?.forEach((tId) => {
      const tag = this.getTag(tId);
      if (tag) {
        testItem.tags = [...testItem.tags, tag];
      }
    });

    return testItem;
  };

  /**
   * get data associated with the item. All item used here should have some data associated with, otherwise
   * an exception will be thrown
   *
   * @returns casting for easy usage but does not guarentee type safety
   */
  getData = <T extends TestItemData>(item: vscode.TestItem): T | undefined => {
    // Note: casting for easy usage but does not guarentee type safety.
    return this.testItemData.get(item) as T | undefined;
  };

  /**
   * check if there is such child in the item, if exists returns the associated data
   *
   * @param item
   * @param childId id of the child item
   * @returns data of the child item, casting for easy usage but does not guarentee type safety.
   */
  getChildData = <T extends TestItemData = TestItemData>(item: vscode.TestItem, childId: string): T | undefined => {
    const cItem = item.children.get(childId);

    // Note: casting for easy usage but does not guarentee type safety.
    return cItem && (this.testItemData.get(cItem) as T);
  };

  createTestRun = (request: vsCodeTypes.TestRunRequest, name: string): vscode.TestRun => {
    return this.controller.createTestRun(request, name);
  };

  appendOutput = (msg: string, run: vsCodeTypes.TestRun, newLine = true, color?: OUTPUT_COLOR): void => {
    const converted = msg.replace(/\n/g, '\r\n');
    let text = newLine ? `[${this.ext.workspace.name}]: ${converted}` : converted;
    if (color) {
      text = `${COLORS[color]}${text}${COLORS['end']}`;
    }
    run.appendOutput(`${text}${newLine ? '\r\n' : ''}`);
    this.showTestExplorerTerminal();
  };

  /** show TestExplorer Terminal on first invocation only */
  showTestExplorerTerminal = (): void => {
    if (showTerminal && this.ext.settings.showTerminalOnLaunch !== false) {
      showTerminal = false;
      vscode.commands.executeCommand('testing.showMostRecentOutput');
    }
  };

  // tags
  getTag = (tagId: TagIdType): vscode.TestTag | undefined => this.profiles.find((p) => p.tag?.id === tagId)?.tag;
}
