(function () {
  const vscode = acquireVsCodeApi();

  const environmentSection = document.getElementById('environment-section');

  window.addEventListener('message', (event) => {
    const { method, params } = event.data;
    if (method === 'add-environments') {
      environmentSection.replaceChildren('');
      const envList = params.environments;

      envList.forEach((environment) => {
        const articleElement = document.createElement('article');
        const labelElement = document.createElement('label');
        const inputElement = document.createElement('input');

        // Creating label element
        labelElement.setAttribute('for', environment);
        labelElement.textContent = environment;

        // creating input element
        inputElement.type = 'radio';
        inputElement.name = 'environment';
        inputElement.setAttribute('envName', environment);

        // adding label and input element inside article element
        articleElement.appendChild(labelElement);
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
