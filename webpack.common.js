const webpack = require('webpack');
const path = require('path');
const CleanWebpackPlugin = require('clean-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const FaviconsWebpackPlugin = require('favicons-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');


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
            'font-awesome-webpack!./src/config/font-awesome.config.js',
            'socket.io-client'
        ],
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
            }
        ]
    },
    plugins: [
        new CleanWebpackPlugin(['dist/*']),
        new CopyWebpackPlugin([{from: 'src/robots.txt'}]),
        new HtmlWebpackPlugin({
            template: 'src/index.html',
            inject: 'body',
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
            title: 'Battleship PvP',

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
