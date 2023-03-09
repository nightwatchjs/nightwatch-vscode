(function () {
  const vscode = acquireVsCodeApi();

  const environmentSection = document.getElementById('environment-section');

  function createLabelElement(environment) {
    const labelElement = document.createElement('label');
    labelElement.setAttribute('for', environment);
    labelElement.textContent = environment;
    return labelElement;
  }

  function createInputElement(environment) {
    const inputElement = document.createElement('input');
    inputElement.type = 'radio';
    inputElement.name = 'environment';
    inputElement.setAttribute('envName', environment);
    return inputElement;
  }

  function createArticleElement(labelElement, inputElement) {
    const articleElement = document.createElement('article');
    articleElement.appendChild(labelElement);
    articleElement.appendChild(inputElement);
    return articleElement;
  }

  window.addEventListener('message', (event) => {
    const { method, params } = event.data;
    if (method === 'add-environments') {
      environmentSection.replaceChildren('');
      const envList = params.environments;

      const articleElements = envList.map((environment) => {
        const labelElement = createLabelElement(environment);
        const inputElement = createInputElement(environment);
        const articleElement = createArticleElement(labelElement, inputElement);

        return articleElement;
      });

      environmentSection.replaceChildren(...articleElements);

      for (const input of document.querySelectorAll('input[type=radio]')) {
        input.addEventListener('change', (event) => {
          const environmentName = event.target.getAttribute('envName');
          vscode.postMessage({
            method: 'environment-select',
            params: {
              environment: environmentName,
              state: event.target.checked,
            },
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
