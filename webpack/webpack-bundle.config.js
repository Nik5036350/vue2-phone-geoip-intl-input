
var webpack = require('webpack');
var combineLoaders = require('webpack-combine-loaders');
var ExtractTextPlugin = require('extract-text-webpack-plugin');
require('es6-promise').polyfill();

var npm = require("../package.json");

module.exports = {

  entry: __dirname + '/../src/index.js',

  output: {
    path: __dirname + '/../dist/',
    publicPath: '../dist/',
    filename: 'vue2-phone-geoip-input.js',
    libraryTarget: "umd",
    library: "Vue2PhoneGeoIpInput"
  },

  externals: {
    "vue": "Vue"
  },


  module: {

    loaders: [
      {
        test: /\.vue$/,
        loader: 'vue'
      },

      {
        test: /\.js$/,
        exclude: /(node_modules|bower_components)/,
        loader: 'babel',
        query: {
          presets: ["es2015"],
          plugins: ["transform-object-rest-spread","transform-vue-jsx"]
        }
      },

      {
        test: /\.(png|jpe?g|gif|svg)(\?.*)?$/,
        loader: 'url',
      },

      {
        test: /\.(woff2?|eot|ttf|otf)(\?.*)?$/,
        loader: 'url',
      },

      {
        test: /\.less$/,
        loaders: ['style','css','less-loader']
      },

      {
        test: /\.json$/,
        loader: 'json'
      },
    ]
  },

  plugins: [

    new webpack.BannerPlugin((
      [
        "Licensed Under MIT (http://opensource.org/licenses/MIT)",
        "\n",
        "\n",
        "vue2-phone-geoip-intl-input @ Version "+ npm.version,
        "\n"
      ])
      .join("")),

    new webpack.DefinePlugin({
      'process.env': {
        'NODE_ENV': '"production"'
      }
    }),

  ]

};
