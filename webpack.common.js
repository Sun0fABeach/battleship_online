const webpack = require('webpack');
const path = require('path');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const FaviconsWebpackPlugin = require('favicons-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const shared = require('./webpack.shared.js');


module.exports = {
    entry: {
        app: './src/index.js'
    },
    // prevent jquery from being bundled twice
    resolve: {
        alias: {
            'jquery': __dirname + '/node_modules/jquery/',
        },
    },
    output: {
        path: path.resolve(__dirname, 'dist')
    },
    module: {
        rules: [
            {
                test: /node_modules\/bootstrap\/js\/src\/.*\.js$/,
                use: shared.babel_loader_conf
            },
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
                test: /\.(ttf|eot|svg|woff(2)?)(\?v=[0-9]\.[0-9]\.[0-9])?$/,
                loader: 'file-loader',
                options: {
                    outputPath: 'assets/fonts/'
                }
            },
            {
                test: /\.(png|jpg|gif)$/,
                loader: 'url-loader',
                options: {
                    outputPath: 'assets/',
                    limit: 10000
                }
            }
        ]
    },
    optimization: {
        splitChunks: {
            cacheGroups: {
                vendor: {
                    test: /[\\/](node_modules)|(src[\\/](custom_vendor|config))[\\/]/,
                    name: 'vendors',
                    chunks: 'all'
                },
                commons: {
                    name: 'commons',
                    chunks: 'initial',
                    minChunks: 2
                }
            }
        }
    },
    plugins: [
        new CleanWebpackPlugin(),
        new CopyWebpackPlugin([{from: 'robots.txt'}]),

        new webpack.ProvidePlugin({
            $: 'jquery',
            jQuery: 'jquery',
            'window.jQuery': 'jquery',
            'window.$': 'jquery',
            Popper: ['popper.js', 'default'],
        }),

        // see https://github.com/haydenbleasel/favicons#usage
        new FaviconsWebpackPlugin({
            logo: './src/assets/crosshair1.jpg',
            // The prefix for all image files (might be a folder or a name)
            prefix: 'assets/icons-[hash]/',
            // Emit all stats of the generated icons
            emitStats: false,
            // The name of the json containing all favicon information
            statsFilename: 'iconstats-[hash].json',
            // Generate a cache file with control hashes and
            // don't rebuild the favicons until those hashes change
            persistentCache: true,
            // Inject the html into the html-webpack-plugin
            inject: true,
            // favicon background color
            background: '#fff',
            // favicon app title
            title: 'Battleship Online',

            // which icons should be generated
            icons: {
                android: true,
                appleIcon: true,
                appleStartup: true,
                firefox: true,
                windows: true,
                favicons: true,
                coast: false,
                opengraph: false,
                twitter: false,
                yandex: false,
            }
        })
    ],
};
