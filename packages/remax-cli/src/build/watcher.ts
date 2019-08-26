import fs from 'fs';
import chokidar from 'chokidar';
import { RollupOptions, watch, RollupWatcher } from 'rollup';
import { output } from './utils/output';

let isBundleRunning = false;
let isFirstRunWatcher = true;

const rollupWatchFiles = ['src/**', 'app.js'];
// 配置重新build的路径
const extraFiles = ['src/app.config.js'];

let extraFilesWatcher: RollupWatcher;

let watcher: RollupWatcher;
export default function runWather(rollupOptions: RollupOptions) {
  if (isBundleRunning) {
    return;
  }

  isBundleRunning = true;

  watcher = watch([
    {
      ...rollupOptions,
      watch: {
        chokidar: {
          usePolling: true,
        },
        include: rollupWatchFiles,
      },
    },
  ]);

  const watchEventHandle = (event: any) => {
    switch (event.code) {
      case 'START':
        output('🚚 编译...', 'blue');
        break;
      case 'END':
        isBundleRunning = false;
        output('💡 完成', 'green');
        break;
      case 'ERROR':
      case 'FATAL':
        isBundleRunning = false;
        const { error } = event;
        const name = error.code === 'PLUGIN_ERROR' ? error.plugin : error.code;
        output(`\n🚨 [${name}]: ${error.message}`, 'red');
        throw error;
      default:
        break;
    }
  };

  watcher.on('event', watchEventHandle);

  if (isFirstRunWatcher) {
    isFirstRunWatcher = false;
    console.log('\x1b[34m%s\x1b[0m', '🚀 启动 watch');
  }

  const close = (err?: Error) => {
    if (watcher) watcher.close();
    if (extraFilesWatcher) extraFilesWatcher.close();

    process.removeListener('uncaughtException', close);

    if (err) {
      process.exit(1);
      console.error(err);
    }
  };

  process.on('uncaughtException', close);
  // 监听额外的文件
  extraFilesWatcher = chokidar.watch(extraFiles);

  extraFilesWatcher
    .on('add', () => {
      if (isFirstRunWatcher || isBundleRunning) return;
      runWather(rollupOptions);
    })
    .on('unlink', () => {
      if (isFirstRunWatcher || isBundleRunning) return;
      runWather(rollupOptions);
    })
    .on('change', () => runWather(rollupOptions));
}
