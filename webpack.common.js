const webpack = require('webpack');
const path = require('path');
const CleanWebpackPlugin = require('clean-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');


module.exports = {
    entry: {
        app: './src/index.js',
        vendor: [
            'webpack-jquery-ui/draggable',
            'webpack-jquery-ui/droppable',
            'webpack-jquery-ui/shake-effect',
            './src/vendor/jquery.ui.touch-punch.js',
            './node_modules/bootstrap/scss/bootstrap.scss',
            'bootstrap',
        ],
    },
    output: {
        path: path.resolve(__dirname, 'dist')
    },
    module: {
        rules: [
            {
                test: /\.css$/,
                use: [
                    'style-loader',
                    'css-loader',
                ]
            },
            {
                test: /\.scss$/,
                use: [
                    'style-loader',
                    'css-loader',
                    {
                        loader: 'postcss-loader',
                        options: {
                            plugins: () => [require('autoprefixer')]
                        }
                    },
                    'sass-loader',
                ]
            },
            {
                test: /\.(png|svg|jpg|gif)$/,
                use: {
                    loader: 'file-loader',
                    options: {
                        outputPath: 'assets/'
                    }
                },
            }
        ]
    },
    plugins: [
        new CleanWebpackPlugin(['dist/*']),
        new HtmlWebpackPlugin({
            template: 'src/index.html',
            inject: 'body',
            // favicon: 'assets/favicon.png'
            // minify: {collapseWhitespace: true}
        }),
        // ensures vendor bundle hash doesn't change when app content changes
        // (to avoid unnecessary cache busting)
        new webpack.HashedModuleIdsPlugin(),

        new webpack.optimize.CommonsChunkPlugin({
            name: 'vendor'
        }),
        // common chunks + webpack runtime
        new webpack.optimize.CommonsChunkPlugin({
            name: 'common'
        }),

        new webpack.ProvidePlugin({
            $: 'jquery',
            jQuery: 'jquery',
            'window.jQuery': 'jquery',
            'window.$': 'jquery',
            Popper: ['popper.js', 'default'],
        }),
    ],
};
