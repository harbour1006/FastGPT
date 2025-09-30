// C:\FastGPT\gitHubCode2\FastGPT\projects\app\src\components\core\chat\ChatContainer\ChatBox\components\Empty.tsx

import { useMarkdown } from '@/web/common/hooks/useMarkdown';
import { Box } from '@chakra-ui/react';
import React from 'react';
import dynamic from 'next/dynamic';

const Markdown = dynamic(() => import('@/components/Markdown'), { ssr: false });

const Empty = () => {
  const { data: versionIntro } = useMarkdown({ url: '/versionIntro.md' });

  return (
    <Box
      display="flex"
      flexDirection="column-reverse"
      justifyContent="flex-start" // 垂直居中
      alignItems="center" // 水平居中
      height="100%" // 确保盒子占满高度
      textAlign="center"
    >
      <Markdown source={versionIntro} />
    </Box>
  );
};

export default React.memo(Empty);
