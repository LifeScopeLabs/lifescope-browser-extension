const webpack = require('webpack');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const WebpackShellPlugin = require('webpack-shell-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const ChromeExtensionReloader = require('webpack-chrome-extension-reloader');
const { VueLoaderPlugin } = require('vue-loader');
const { version } = require('./package.json');

module.exports = function(env) {
  const config = {
    mode: process.env.NODE_ENV,
    context: __dirname + '/src',
    entry: {
      'background': './background.js',
      'popup/popup': './popup/popup.js',
      'options/options': './options/options.js',
      'site': './styles/site.scss',
    },
    output: {
      path: __dirname + '/dist/' + env.browser,
      filename: '[name].js',
    },
    resolve: {
      extensions: ['.js', '.vue'],
    },
    module: {
      rules: [
        {
          test: /\.gql$/,
            loaders: 'graphql-tag'
        },
        {
          test: /\.vue$/,
          loaders: 'vue-loader',
        },
        {
          test: /\.js$/,
          loader: 'babel-loader',
          exclude: /node_modules/,
        },
        {
          test: /\.css$/,
          use: [MiniCssExtractPlugin.loader, 'css-loader'],
        },
        {
          test: /\.scss$/,
          use: [MiniCssExtractPlugin.loader, 'css-loader', 'sass-loader'],
        },
        {
          test: /\.sass$/,
          use: [MiniCssExtractPlugin.loader, 'css-loader', 'sass-loader?indentedSyntax'],
        },
        {
          test: /\.(png|jpg|gif|svg|ico)$/,
          loader: 'file-loader',
          options: {
            name: '[name].[ext]?emitFile=false',
          },
        },
      ],
    },
    plugins: [
      new VueLoaderPlugin(),
      new MiniCssExtractPlugin({
        filename: '[name].css',
      }),
      new CopyWebpackPlugin([
        { from: 'icons', to: 'icons', ignore: ['icon.xcf'] },
        { from: 'popup/popup.html', to: 'popup/popup.html' },
        { from: 'options/options.html', to: 'options/options.html' },
        {
          from: 'manifest.json',
          to: 'manifest.json',
          transform: (content) => {
            const jsonContent = JSON.parse(content);
            jsonContent.version = version;

            if (env && env.browser) {
              if (env.browser === 'edge') {
                jsonContent.options_page = jsonContent.options_ui.page;

                delete jsonContent.options_ui;
              }

              if (env.browser === 'firefox') {
                jsonContent.applications = {
                  gecko: {
                    id: '{9e187a53-8d6f-4d44-9010-87309bc67b9e}'
                  }
                }
              }
            }

            if (config.mode === 'development') {
              jsonContent['content_security_policy'] = "script-src 'self' 'unsafe-eval'; object-src 'self'";
            }

            return JSON.stringify(jsonContent, null, 2);
          },
        },
      ]),
      new WebpackShellPlugin({
        onBuildEnd: ['node scripts/remove-evals.js ' + env.browser],
      }),
    ],
  };

  if (config.mode === 'production') {
    config.plugins = (config.plugins || []).concat([
      new webpack.DefinePlugin({
        'process.env': {
          NODE_ENV: '"production"',
        },
      }),
    ]);
  }

  if (process.env.HMR === 'true') {
    config.plugins = (config.plugins || []).concat([
      new ChromeExtensionReloader(),
    ]);
  }

  return config;
};
