const webpack = require('webpack');
const merge = require('webpack-merge');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const UglifyJSPlugin = require('uglifyjs-webpack-plugin');
const common = require('./webpack.common.js');
const shared = require('./webpack.shared.js');


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
                use: shared.babel_loader_conf
            }
        ]
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: './src/index.html',
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
