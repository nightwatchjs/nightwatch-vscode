(function () {
  const vscode = acquireVsCodeApi();

  // Get all elements
  const headlessElement = document.getElementById('headless-mode');
  const parallelsElement = document.getElementById('parallels');
  const parallelsInputElement = document.querySelector('input[type=number]');
  const openReportElement = document.getElementById('open-report');

  for (const input of document.querySelectorAll('input[type=checkbox]')) {
    input.addEventListener('change', (event) => {
      const commandName = event.target.getAttribute('name');
      vscode.postMessage({ method: 'toggle', params: { command: commandName } });
    });
  }

  parallelsInputElement.addEventListener('change', (event) => {
    const commandName = event.target.getAttribute('name');
    vscode.postMessage({ method: 'change', params: { command: commandName, value: event.target.value } });
  });

  window.addEventListener('message', (event) => {
    const { method, params } = event.data;

    if (method === 'settings') {
      const { headlessMode, parallels, openReport } = params.settings;
      headlessElement.checked = headlessMode;
      parallelsElement.value = parallels;
      openReportElement.checked = openReport;
    }
  });
})();
