const { i18n } = require('./next-i18next.config');
const path = require('path');
const fs = require('fs');

const isDev = process.env.NODE_ENV === 'development';

/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath: process.env.NEXT_PUBLIC_BASE_URL,
  i18n,
  output: 'standalone',
  reactStrictMode: isDev ? false : true,
  compress: true,
  webpack(config, { isServer, nextRuntime }) {
    Object.assign(config.resolve.alias, {
      '@mongodb-js/zstd': false,
      '@aws-sdk/credential-providers': false,
      snappy: false,
      aws4: false,
      'mongodb-client-encryption': false,
      kerberos: false,
      'supports-color': false,
      'bson-ext': false,
      'pg-native': false
    });
    config.module = {
      ...config.module,
      rules: config.module.rules.concat([
        {
          test: /\.svg$/i,
          issuer: /\.[jt]sx?$/,
          use: ['@svgr/webpack']
        },
        {
          test: /\.node$/,
          use: [{ loader: 'nextjs-node-loader' }]
        }
      ]),
      exprContextCritical: false,
      unknownContextCritical: false
    };

    if (!config.externals) {
      config.externals = [];
    }

    if (isServer) {
      if (nextRuntime === 'nodejs') {
        const oldEntry = config.entry;
        config = {
          ...config,
          async entry(...args) {
            const entries = await oldEntry(...args);
            return {
              ...entries,
              ...getWorkerConfig(),
              'worker/systemPluginRun': path.resolve(
                process.cwd(),
                '../../packages/plugins/runtime/worker.ts'
              )
            };
          }
        };
      }
    } else {
      config.resolve = {
        ...config.resolve,
        fallback: {
          ...config.resolve.fallback,
          fs: false
        }
      };
    }

    config.experiments = {
      asyncWebAssembly: true,
      layers: true
    };

    return config;
  },
  transpilePackages: ['@fastgpt/*', 'ahooks'],
  experimental: {
    // 优化 Server Components 的构建和运行，避免不必要的客户端打包。
    outputFileTracingRoot: path.join(__dirname, '../../'),
    instrumentationHook: true,
    serverComponentsExternalPackages: [
      'mongoose',
      'pg',
      '@node-rs/jieba',
      '@zilliz/milvus2-sdk-node'
    ],
    outputFileTracingRoot: path.join(__dirname, '../../'),
    instrumentationHook: true,
    outputFileTracingIncludes: {
      // 匹配所有构建输出
      './**/*': [
        // 1. 解决 /app/package.json 缺失问题：将根目录的 package.json 包含
        '../../package.json',

        // 2. 解决 /packages/service/core/ai/config/provider 目录缺失问题
        '../../packages/service/core/ai/config/provider/**/*',

        // 3. 包含 data 目录
        './data/**/*'
      ],
    },
  }
};

module.exports = nextConfig;

function getWorkerConfig() {
  const result = fs.readdirSync(path.resolve(__dirname, '../../packages/service/worker'));

  // 获取所有的目录名
  const folderList = result.filter((item) => {
    return fs
      .statSync(path.resolve(__dirname, '../../packages/service/worker', item))
      .isDirectory();
  });

  const workerConfig = folderList.reduce((acc, item) => {
    acc[`worker/${item}`] = path.resolve(
      process.cwd(),
      `../../packages/service/worker/${item}/index.ts`
    );
    return acc;
  }, {});
  return workerConfig;
}
