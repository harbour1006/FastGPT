// C:\FastGPT\gitHubCode2\FastGPT\projects\app\src\components\core\chat\ChatContainer\ChatBox\components\Empty.tsx

import { useMarkdown } from '@/web/common/hooks/useMarkdown';
import { Box } from '@chakra-ui/react';
import React from 'react';
import dynamic from 'next/dynamic';

const Markdown = dynamic(() => import('@/components/Markdown'), { ssr: false });

// Empty 组件现在接受一个 renderChatInputArea 的函数作为 prop
interface EmptyProps {
  renderChatInputArea: () => React.ReactNode; // 这是一个返回 React 节点的函数
}

const Empty: React.FC<EmptyProps> = ({ renderChatInputArea }) => {
  const { data: versionIntro } = useMarkdown({ url: '/versionIntro.md' });

  return (
    <Box
      pt={6} // 顶部内边距
      w={'85%'} // 宽度
      maxW={'600px'} // 最大宽度
      m={'auto'} // 水平居中
      display={'flex'} // Flex 布局
      flexDirection={'column'} // 垂直方向排列
      // ==== 关键修改点 ====
      alignItems={'center'} // 使子元素在水平方向上居中
      justifyContent={'center'} // 使子元素在垂直方向上居中
      minH={'calc(100vh - 150px)'}
      // ==== 关键修改点结束 ====
    >
      <Box
        overflowY="auto" // 允许内容溢出时滚动
        pb={4} // 底部内边距，作为与输入框的间距
        textAlign={'center'} // 让 Markdown 内部的文本内容也居中
      >
        <Markdown source={versionIntro} />
      </Box>

      {/* 输入框容器：这里会渲染传入的 ChatInput 组件 */}
      <Box
        p={2} // 内边距
        bg="white" // 背景色
        borderColor="gray.200" // 边框颜色
        mt={0} // 顶部外边距，用于与 Markdown 内容分隔
        width="700%"
        maxW="1000px"
      >
        {renderChatInputArea()} {/* 调用传入的函数来渲染 ChatInput */}
      </Box>
    </Box>
  );
};

export default React.memo(Empty);
