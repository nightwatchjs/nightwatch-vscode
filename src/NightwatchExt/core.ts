import * as vsCodeTypes from "../types/vscodeTypes";
import { installNightwatch } from "./installer";

export class NightwatchExt {
  private vscodeContext: vsCodeTypes.ExtensionContext;

  constructor(vscodeContext: vsCodeTypes.ExtensionContext) {
    this.vscodeContext = vscodeContext;
  }

  public async installNightwatch(vscode: vsCodeTypes.VSCode) {
    installNightwatch(vscode);
  }

  // TODO: Add run test
}
