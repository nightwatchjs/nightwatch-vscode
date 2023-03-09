# Overview

The Nightwatch Extension for Visual Studio Code is a powerful tool that enables developers to write, run, and view test results in a single, integrated environment. With an easy installation process, user-friendly interface, and powerful features, this extension is the ideal solution for developers looking to streamline their testing workflow.

## Key Features

- [Easy Installation](#easy-installation): Nightwatch, the local Selenium server, and browser drivers are automatically installed, making the setup process a breeze.
- [Run and Debug your tests](#run-and-debug-your-tests): You can run single or multiple tests with an easy-to-use user interface that displays tests in a simple format.
- [View tests results](#view-tests-results): Viewing test output is simple with the ability to view individual and aggregate test results, as well as the output of the test execution in the VS Code terminal.
- [Quick Setting Panel](#quick-setting-panel): The quick settings panel gives you more control over test runs, such as running in headless mode, opening the report post-test runs, and controlling the number of parallels for your Nightwatch test runs.
- [Environments Panel](#environments-panel): The environments panel provides a quick way to select the environment (browsers) to run your tests.


<img width="1552" alt="Screenshot 2022-09-16 at 1 18 43 PM" src="https://user-images.githubusercontent.com/8705386/224007013-f91072d3-ce8f-409f-8eea-096bd087fe40.png">

## Requirements

This extension requires [Nightwatch JS][nightwatch] version v2.3.4 or higher.

## Installation

To install the Nightwatch Test Explorer extension, follow these steps:

1. Open VS Code.
2. Press `Ctrl+Shift+X` or `Cmd+Shift+X` to open the Extensions panel.
3. Type `nightwatch` into the search bar.
4. Click on the **Nightwatch Test Explorer** extension.
5. Click the **Install** button.

Alternatively, you can download the extension from the [Visual Studio Code Marketplace][vscode-marketplace-link].

## Usage

To use the Nightwatch Test Explorer extension, follow these steps:

1. Open a project that uses Nightwatch.
2. Open the Test Explorer by clicking on the Test View icon in the sidebar.
3. Run or debug a test by clicking the `Play` or `Debug` buttons next to the test.
4. View test results in the Test Explorer or the VS Code terminal.

## Easy Installation

Installing Nightwatch with the Nightwatch Extension is simple and straightforward. It takes care of all the setup and configuration for you, so you can focus on writing and running tests.

![installation](https://user-images.githubusercontent.com/8705386/190579688-0bb1b1fa-161e-4e10-a409-a18df2672f31.gif)

## Run and Debug your tests

Running and debugging tests is a breeze with the Nightwatch Extension. The user interface is intuitive and easy to use, and the powerful debugging features help you catch and fix issues quickly.

![Running test gif](https://user-images.githubusercontent.com/8705386/190579700-30e75b82-be29-4ba8-bdc6-2b669f7b8a8f.gif)


![Debug test gif](https://user-images.githubusercontent.com/8705386/190579636-5b68c60f-f2be-44ec-b4ab-2e6c13d5c748.gif)

## View tests results

Viewing test results is simple and efficient with the Nightwatch Extension. You can quickly view individual test results, aggregate test results, and output from test execution, all in one place.

![View test results gif](https://user-images.githubusercontent.com/8705386/190579714-d1a88218-372e-49d7-a8af-8d615ed23379.gif)

## Quick Setting Panel

The Quick Settings Panel gives you greater control over your test runs. You can run tests in headless mode, open reports post-test runs, and control the number of parallels for your Nightwatch test runs.

![Quick Setting Panel image](https://user-images.githubusercontent.com/8705386/223973479-bffce5e3-9dff-483e-8cbe-ec488ec9bf4a.png)

## Environments Panel

The Environments Panel makes it easy to test across multiple browsers and devices. You can quickly select the environment (browser) you want to run your tests in, and the Nightwatch Extension takes care of the rest. Learn more about [Nightwatch environments][nightwatch-environments].

![Environment Panel image](https://user-images.githubusercontent.com/8705386/223973930-911a2da0-dc4f-46d5-81eb-1606e622add2.png)

[nightwatch]: https://nightwatchjs.org/
[nightwatch-environments]: https://nightwatchjs.org/guide/concepts/test-environments.html
[vscode-marketplace-link]: https://marketplace.visualstudio.com/items?itemName=browserstackcom.nightwatch
