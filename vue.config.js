const { defineConfig } = require('@vue/cli-service')
module.exports = defineConfig({
  outputDir: "./dist",
  transpileDependencies: true,
  configureWebpack: {
    devtool: 'source-map'
  }
})