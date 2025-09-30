import { FastGPTProUrl } from '@fastgpt/service/common/system/constants';
import { isProduction } from '@fastgpt/global/common/system/constants';
import { cloneDeep } from 'lodash';
import { getCommunityCb, getCommunityPlugins } from '@fastgpt/plugins/register';
import { GET, POST } from '@fastgpt/service/common/api/plusRequest';
import { SystemPluginTemplateItemType } from '@fastgpt/global/core/workflow/type';
import { addLog } from '@fastgpt/service/common/system/log';
import { SystemPluginResponseType } from '@fastgpt/plugins/type';

/* Get plugins */
const getCommercialPlugins = () => {
  return GET<SystemPluginTemplateItemType[]>('/core/app/plugin/getSystemPlugins');
};

export const getSystemPlugins = async (refresh = false) => {
  if (isProduction && global.systemPlugins && global.systemPlugins.length > 0 && !refresh)
    return cloneDeep(global.systemPlugins);

  try {
    if (!global.systemPlugins) {
      global.systemPlugins = [];
    }

    global.systemPlugins = FastGPTProUrl
      ? // ? await getCommercialPlugins()
        await getCommunityPlugins()
      : await getCommunityPlugins();

    addLog.info(`Load system plugin successfully: ${global.systemPlugins.length}`);

    return cloneDeep(global.systemPlugins);
  } catch (error) {
    //@ts-ignore
    global.systemPlugins = undefined;
    return Promise.reject(error);
  }
};

/* Get plugin callback */
const getCommercialCb = async () => {
  const plugins = await getSystemPlugins();
  const result = plugins.map((plugin) => {
    const name = plugin.id.split('-')[1];

    return {
      name,
      cb: (e: any) =>
        POST<Record<string, any>>('/core/app/plugin/run', {
          pluginName: name,
          data: e
        })
    };
  });

  return result.reduce<Record<string, (e: any) => SystemPluginResponseType>>(
    (acc, { name, cb }) => {
      acc[name] = cb;
      return acc;
    },
    {}
  );
};

// 在 src/service/core/app/plugin.ts 中添加调试信息

export const getSystemPluginCb = async (refresh = false) => {
  console.log('getSystemPluginCb called, FastGPTProUrl:', FastGPTProUrl);
  console.log('isProduction:', isProduction);

  if (
    isProduction &&
    global.systemPluginCb &&
    Object.keys(global.systemPluginCb).length > 0 &&
    !refresh
  ) {
    console.log('Using cached plugin callbacks');
    return global.systemPluginCb;
  }

  try {
    global.systemPluginCb = {};
    await getSystemPlugins(refresh);

    console.log('Loaded system plugins:', global.systemPlugins?.length);

    // 强制使用社区版插件模式，注释掉商业版逻辑
    // if (FastGPTProUrl) {
    //   console.log('Using commercial plugin callbacks');
    //   global.systemPluginCb = await getCommercialCb();
    // } else {
    console.log('Using community plugin callbacks (forced)');
    global.systemPluginCb = await getCommunityCb();
    // }

    console.log('Available plugin callbacks:', Object.keys(global.systemPluginCb));

    return global.systemPluginCb;
  } catch (error) {
    console.error('Error loading plugin callbacks:', error);
    return Promise.reject(error);
  }
};
