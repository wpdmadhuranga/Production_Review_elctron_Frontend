const rules = require('./webpack.rules');
const webpack = require('webpack');
const dotenv = require('dotenv');

dotenv.config();

rules.push({
  test: /\.css$/,
  use: [
    { loader: 'style-loader' },
    { loader: 'css-loader', options: { importLoaders: 1 } },
    { loader: 'postcss-loader' },
  ],
});

const imageRule = {
  test: /\.(png|jpe?g|gif|svg)$/i,
  type: 'asset/resource',
  generator: {
    filename: 'assets/[name][ext]',
  },
};

module.exports = {
  // Put your normal webpack config below here
  module: {
    rules: [imageRule, ...rules],
  },
  resolve: {
    extensions: ['.js', '.ts', '.tsx', '.jsx', '.json'],
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.env.API_BASE_URL': JSON.stringify(process.env.API_BASE_URL || 'https://localhost:7274'),
    }),
  ],
};
