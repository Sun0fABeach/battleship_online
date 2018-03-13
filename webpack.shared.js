module.exports = {
    babel_loader_conf: {
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
            ],
            plugins: ['@babel/plugin-proposal-object-rest-spread'],
            babelrc: false // .babelrc only there for mocha atm
        }
    }
}
