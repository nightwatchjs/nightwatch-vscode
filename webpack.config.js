//@ts-check

'use strict';

const path = require('path');

//@ts-check
/** @typedef {import('webpack').Configuration} WebpackConfig **/

/**@type {any} */
const externals = [
  { vscode: 'commonjs vscode' }, // the vscode-module is created on-the-fly and must be excluded.
  'fsevents', // extension will not need to do any 'watch' directly, no need for this library
  'typescript',
];

/** @type WebpackConfig */
const extensionConfig = {
  context: __dirname,
  target: 'node', // vscode extensions run in a Node.js-context 📖 -> https://webpack.js.org/configuration/node/
  mode: 'none', // this leaves the source code as close as possible to the original (when packaging we set this to 'production')
  entry: {
    extension: './src/extension.ts',
    reporter: './src/reporter.ts',
  }, // the entry point of this extension, 📖 -> https://webpack.js.org/configuration/entry-context/
  output: {
    // the bundle is stored in the 'dist' folder (check package.json), 📖 -> https://webpack.js.org/configuration/output/
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
    libraryTarget: 'commonjs2',
  },
  externals,
  resolve: {
    // support reading TypeScript and JavaScript files, 📖 -> https://github.com/TypeStrong/ts-loader
    extensions: ['.ts', '.js'],
    alias: {
      '@jest/transform': false,
      './InlineSnapshots': false,
      'babel-preset-current-node-syntax': false,
    },
  },
  module: {
    parser: {
      javascript: {
        commonjsMagicComments: true,
      },
    },
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'ts-loader',
          },
        ],
      },
      {
        loader: 'vscode-nls-dev/lib/webpack-loader',
        options: {
          base: __dirname,
        },
      },
    ],
  },
  devtool: 'nosources-source-map',
  infrastructureLogging: {
    level: 'log', // enables logging required for problem matchers
  },
};
module.exports = [extensionConfig];
