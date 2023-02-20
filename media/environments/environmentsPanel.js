(function () {
  const vscode = acquireVsCodeApi();

  window.addEventListener('message', (event) => {
    const { method, params } = event.data;
    if (method === 'environments') {
      console.log('>>>>>>', params.environments);
    }
  });
})();
