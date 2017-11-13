const webpack = require('webpack');
const merge = require('webpack-merge');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const UglifyJSPlugin = require('uglifyjs-webpack-plugin');
const common = require('./webpack.common.js');


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
            minify: {
                collapseWhitespace: true,
                minifyCSS: true,
                removeComments: true
            }
        }),
        new HtmlWebpackPlugin({
            filename: 'imprint.html',
            template: './src/imprint.html',
            inject: false,
            minify: {
                collapseWhitespace: true,
                minifyCSS: true,
                removeComments: true
            }
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
