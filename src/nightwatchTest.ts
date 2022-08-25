export class NightwatchTest {
  readonly _runParallel: boolean = false;

  constructor(runParallel: boolean) {
    this._runParallel = runParallel;
  }

  private runTests() {
    return "running test";
  }
}
