module.exports = {
    devServer: {
      proxy: {
        '/': { // Assuming your calls are to "/api"
          target: 'http://localhost:5000', // Your backend server
          changeOrigin: true,
          pathRewrite: { '^/': '' },
        },
      },
    },
  };