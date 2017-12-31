const webpack = require('webpack');
const merge = require('webpack-merge');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const UglifyJSPlugin = require('uglifyjs-webpack-plugin');
const common = require('./webpack.common.js');


const html_minify_options = {
    collapseWhitespace: true,
    minifyCSS: true,
    removeComments: true
};

module.exports = merge(common, {
    output: {
        filename: '[name].[chunkhash].js',
    },
    // devtool: 'source-map',
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /node_modules/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: [
                            ['@babel/preset-env', {
                                targets: {
                                    browsers: [
                                        'last 3 major versions', 'not ie > 0'
                                    ]
                                }
                            }]
                        ]
                    }
                }
            }
        ]
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: './src/index.html',
            minify: html_minify_options
        }),
        new HtmlWebpackPlugin({
            filename: 'partials/imprint.html',
            template: './src/partials/imprint.html',
            inject: false,
            minify: html_minify_options
        }),
        new HtmlWebpackPlugin({
            filename: 'partials/help.html',
            template: './src/partials/help.html',
            inject: false,
            minify: html_minify_options
        }),
        new UglifyJSPlugin({
            // sourceMap: true
        }),
        // tells some node libs that it's production time via env variable
        new webpack.DefinePlugin({
            'process.env': {
                'NODE_ENV': JSON.stringify('production')
            }
        })
    ]
});
