const merge = require('webpack-merge');
const common = require('./webpack.common.js');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const Visualizer = require('webpack-visualizer-plugin');


module.exports = merge(common, {
    output: {
        filename: '[name].js',
    },
    devtool: 'inline-source-map',
    devServer: {
        host: '0.0.0.0',
        contentBase: './dist',
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /node_modules/,
                enforce: 'pre',
                use: {
                    loader: 'jshint-loader',
                    options: {
                        esversion: 6,
                    }
                }
            },
        ]
    },
    plugins: [
        new Visualizer(),
        new HtmlWebpackPlugin({
            template: './src/index.html'
        }),
        new HtmlWebpackPlugin({
            filename: 'imprint.html',
            template: './src/imprint.html',
            inject: false
        }),
        new HtmlWebpackPlugin({
            filename: 'partials/help.html',
            template: './src/partials/help.html',
            inject: false
        }),
    ]
});
