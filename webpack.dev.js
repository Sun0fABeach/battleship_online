const merge = require('webpack-merge');
const common = require('./webpack.common.js');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const Visualizer = require('webpack-visualizer-plugin');


module.exports = merge(common, {
    mode: 'development',
    output: {
        filename: '[name].js',
    },
    devtool: 'inline-source-map',
    devServer: {
        host: '0.0.0.0',
        contentBase: './dist',
        proxy: [{
            context: ['/_help', '/_imprint', '/help', '/imprint'],
            target: 'http://localhost:8000'
        }]
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
        })
    ]
});
