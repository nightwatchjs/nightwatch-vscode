(function () {
  const vscode = acquireVsCodeApi();

  // Get all elements
  const headlessElm = document.getElementById('headless-mode');
  const parallelsElm = document.getElementById('parallels');
  const parallelsElInput = document.querySelector('input[type=number]');
  const openReportElm = document.getElementById('open-report');

  for (const input of document.querySelectorAll('input[type=checkbox]')) {
    input.addEventListener('change', (event) => {
      const commandName = event.target.getAttribute('name');
      vscode.postMessage({ method: 'toggle', params: { command: commandName } });
    });
  }

  parallelsElInput.addEventListener('change', (event) => {
    const commandName = event.target.getAttribute('name');
    vscode.postMessage({ method: 'change', params: { command: commandName, value: event.target.value } });
  });

  window.addEventListener('message', (event) => {
    const { method, params } = event.data;

    if (method === 'settings') {
      const { headlessMode, parallels, openReport } = params.settings;
      headlessElm.checked = headlessMode;
      parallelsElm.value = parallels;
      openReportElm.checked = openReport;
    }
  });
})();
