import { exit } from 'process';

/* Init system
 */
export async function register() {
  try {
    if (process.env.NEXT_RUNTIME === 'nodejs') {
      // 基础系统初始化
      const [
        { connectMongo },
        { systemStartCb },
        { initGlobalVariables, getInitConfig, initSystemPluginGroups, initAppTemplateTypes },
        { initVectorStore },
        { initRootUser },
        // { getSystemPluginCb },
        {},
        { startMongoWatch },
        { startCron },
        { startTrainingQueue }
      ] = await Promise.all([
        import('@fastgpt/service/common/mongo/init'),
        import('@fastgpt/service/common/system/tools'),
        import('@/service/common/system'),
        import('@fastgpt/service/common/vectorStore/controller'),
        import('@/service/mongo'),
        import('@/service/core/app/plugin'),
        import('@/service/common/system/volumnMongoWatch'),
        import('@/service/common/system/cron'),
        import('@/service/core/dataset/training/utils')
      ]);

      // 执行初始化流程
      systemStartCb();
      initGlobalVariables();

      // **Add console.log statements here**
      console.log('instrumentation.ts: NEXT_RUNTIME', process.env.NEXT_RUNTIME);
      console.log('instrumentation.ts: MongoDB connection starting...');

      // Connect to MongoDB
      await connectMongo();

      // **Add console.log statements here**
      console.log('instrumentation.ts: MongoDB connected');
      console.log('instrumentation.ts: PostgreSQL connection starting...');

      //init system config；init vector database；init root user
      await Promise.all([getInitConfig(), initVectorStore(), initRootUser()]);

      // **Add console.log statements here**
      console.log('instrumentation.ts: PostgreSQL connected and init complete');

      initSystemPluginGroups();
      initAppTemplateTypes();
      // getSystemPluginCb();
      startMongoWatch();
      startCron();
      startTrainingQueue(true);

      console.log('instrumentation.ts: Init system success');
    }
  } catch (error) {
    console.log('instrumentation.ts: Init system error', error);
    exit(1);
  }
}
