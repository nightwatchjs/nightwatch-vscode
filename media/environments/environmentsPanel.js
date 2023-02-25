(function () {
  const vscode = acquireVsCodeApi();

  const environmentSection = document.getElementById('environment-section');

  window.addEventListener('message', (event) => {
    const { method, params } = event.data;
    if (method === 'add-environments') {
      environmentSection.innerHTML = '';
      const envList = params.environments;

      envList.forEach((environment) => {
        const articleElement = document.createElement('article');
        const labelelement = document.createElement('label');
        labelelement.setAttribute('for', environment);
        labelelement.textContent = environment;

        const inputElement = document.createElement('input');
        inputElement.type = 'radio';
        inputElement.name = 'environment';
        inputElement.setAttribute('envName', environment);

        articleElement.appendChild(labelelement);
        articleElement.appendChild(inputElement);
        environmentSection.appendChild(articleElement);
      });

      for (const input of document.querySelectorAll('input[type=radio]')) {
        input.addEventListener('change', (event) => {
          const environmentName = event.target.getAttribute('envName');
          vscode.postMessage({
            method: 'environment-select',
            params: { environment: environmentName, state: event.target.checked },
          });
        });
      }
    }
    if (method === 'update-selected-environments') {
      for (const input of document.querySelectorAll('input[type=radio]')) {
        const envName = input.getAttribute('envName');
        if (params.environments.includes(envName)) {
          input.checked = true;
        }
      }
    }
  });
})();
