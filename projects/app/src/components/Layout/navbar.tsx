import React, { useMemo } from 'react';
import {
  Box,
  BoxProps,
  Flex,
  Link,
  LinkProps,
  Text,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Portal,
  useDisclosure,
  MenuDivider
} from '@chakra-ui/react';
import { useRouter } from 'next/router';
import { useUserStore } from '@/web/support/user/useUserStore';
import { useChatStore } from '@/web/core/chat/context/useChatStore';
import { useConfirm } from '@fastgpt/web/hooks/useConfirm'; // 导入 useConfirm
import { HUMAN_ICON } from '@fastgpt/global/common/system/constants';
import NextLink from 'next/link';
import Badge from '../Badge';
import Avatar from '@fastgpt/web/components/common/Avatar';
import MyIcon from '@fastgpt/web/components/common/Icon';
import { useTranslation } from 'next-i18next';
import { useSystemStore } from '@/web/common/system/useSystemStore';
import MyTooltip from '@fastgpt/web/components/common/MyTooltip';

export enum NavbarTypeEnum {
  normal = 'normal',
  small = 'small'
}

const itemStyles: BoxProps & LinkProps = {
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  px: 4,
  h: '40px',
  borderRadius: 'md'
};

const hoverStyle: LinkProps = {
  _hover: {
    bg: 'myGray.05',
    color: 'primary.600'
  }
};

const Navbar = ({ unread }: { unread: number }) => {
  const { t } = useTranslation();
  const router = useRouter();
  const { userInfo, setUserInfo } = useUserStore();
  const { gitStar, feConfigs } = useSystemStore();
  const { lastChatAppId } = useChatStore();

  const navbarList = useMemo(() => {
    const accountItem = {
      label: t('common:navbar.Account'),
      icon: 'support/user/userLight',
      activeIcon: 'support/user/userFill',
      link: '/account/info',
      activeLink: [
        '/account/bill',
        '/account/info',
        '/account/team',
        '/account/team copy',
        '/account/thirdParty',
        '/account/apikey',
        '/account/setting',
        '/account/inform',
        '/account/promotion',
        '/account/model'
      ]
    };
    return [
      {
        label: t('common:navbar.Chat'),
        icon: 'core/chat/chatLight',
        activeIcon: 'core/chat/chatFill',
        link: `/chat?appId=${lastChatAppId}`,
        activeLink: ['/chat']
      },
      {
        label: t('common:navbar.Studio'),
        icon: 'core/app/aiLight',
        activeIcon: 'core/app/aiFill',
        link: `/app/list`,
        activeLink: ['/app/list', '/app/detail']
      },
      {
        label: t('common:navbar.Datasets'),
        icon: 'core/dataset/datasetLight',
        activeIcon: 'core/dataset/datasetFill',
        link: `/dataset/list`,
        activeLink: ['/dataset/list', '/dataset/detail']
      },
      {
        label: t('common:navbar.Toolkit'),
        icon: 'phoneTabbar/tool',
        activeIcon: 'phoneTabbar/toolFill',
        link: `/toolkit`,
        activeLink: ['/toolkit']
      },
      accountItem
    ];
  }, [lastChatAppId, t]);

  const isSecondNavbarPage = useMemo(() => {
    return ['/toolkit'].includes(router.pathname);
  }, [router.pathname]);

  // 初始化确认对话框
  const { openConfirm, ConfirmModal } = useConfirm({
    content: t('account:confirm_logout') // 使用翻译键
  });

  const { isOpen, onOpen, onClose } = useDisclosure();

  return (
    <Flex
      flexDirection={'row'}
      alignItems={'center'}
      px={4}
      h={'60px'}
      w={'100%'}
      position={'fixed'}
      top={0}
      left={0}
      right={0}
      zIndex={10}
      userSelect={'none'}
      bg={isSecondNavbarPage ? 'myGray.50' : 'white'}
      boxShadow={'0 2px 4px rgba(0, 0, 0, 0.1)'}
    >
      {/* 左侧区域 - 宽度 20%，左对齐 */}
      <Flex width={'20%'} alignItems={'center'} justifyContent={'flex-start'}>
        <Box cursor={'pointer'} onClick={() => router.push('/account/info')} flexShrink={0}>
          <Text fontSize={'lg'} fontWeight={'bold'} color={'primary.500'}>
            AI智能体平台
          </Text>
        </Box>
      </Flex>

      {/* 中间区域 - 宽度 60%，居中对齐 */}
      <Flex width={'60%'} alignItems={'center'} justifyContent={'center'}>
        <Flex alignItems={'center'} justifyContent={'flex-start'}>
          {navbarList.slice(0, -1).map((item) => (
            <Box
              key={item.link}
              {...itemStyles}
              {...(item.activeLink.includes(router.pathname)
                ? {
                    bg: 'myGray.100',
                    boxShadow:
                      '0px 0px 1px 0px rgba(19, 51, 107, 0.08), 0px 2px 2px 0px rgba(19, 51, 107, 0.05)'
                  }
                : { bg: 'transparent', _hover: { bg: 'myGray.05' } })}
              {...(item.link !== router.asPath ? { onClick: () => router.push(item.link) } : {})}
            >
              <MyIcon
                name={
                  item.activeLink.includes(router.pathname)
                    ? (item.activeIcon as any)
                    : (item.icon as any)
                }
                color={item.activeLink.includes(router.pathname) ? 'primary.600' : 'myGray.400'}
                width={'18px'}
                height={'18px'}
                mr={2}
              />
              <Box
                fontSize={'12px'}
                color={item.activeLink.includes(router.pathname) ? 'primary.700' : 'myGray.500'}
              >
                {item.label}
              </Box>
            </Box>
          ))}
        </Flex>
      </Flex>

      {/* 右侧区域 - 宽度 20%，右对齐 */}
      <Flex width={'20%'} alignItems={'center'} justifyContent={'flex-end'}>
        <Flex alignItems={'center'}>
          {unread > 0 && (
            <Link
              as={NextLink}
              {...itemStyles}
              {...hoverStyle}
              prefetch
              href={`/account/inform`}
              color={'myGray.500'}
              h={'40px'}
              mr={2}
            >
              <Badge count={unread}>
                <MyIcon name={'support/user/informLight'} width={'20px'} height={'20px'} />
              </Badge>
            </Link>
          )}

          {feConfigs?.navbarItems
            ?.filter((item) => item.isActive)
            .map((item) => (
              <MyTooltip key={item.id} label={item.name} placement={'bottom'}>
                <Link
                  as={NextLink}
                  href={item.url}
                  target={'_blank'}
                  {...itemStyles}
                  {...hoverStyle}
                  color={'myGray.400'}
                  h={'40px'}
                  mr={2}
                >
                  <Avatar src={item.avatar} borderRadius={'md'} width={'24px'} height={'24px'} />
                </Link>
              </MyTooltip>
            ))}

          {/* 右侧的头像菜单 */}
          <Menu isOpen={isOpen} onOpen={onOpen} onClose={onClose}>
            <MenuButton
              as={Box}
              ml={4}
              border={'2px solid #fff'}
              borderRadius={'50%'}
              overflow={'hidden'}
              cursor={'pointer'}
              onMouseEnter={onOpen}
              onMouseLeave={onClose}
            >
              <Avatar
                w={'2rem'}
                h={'2rem'}
                src={userInfo?.avatar}
                borderRadius={'50%'}
                objectFit="cover"
                border={'2px solid #fff'}
              />
            </MenuButton>

            {/* === 关键修改：给 Portal 添加 zIndex === */}
            <Portal>
              {' '}
              {/* 使用一个非常大的 z-index 值，确保它在最上层 */}
              <MenuList zIndex={99} onMouseEnter={onOpen} onMouseLeave={onClose} borderRadius={0}>
                <MenuItem
                  onClick={() => {
                    router.push('/account/info');
                    onClose();
                  }}
                >
                  {t('common:navbar.System_Setting')}
                </MenuItem>
                <MenuDivider />
                <MenuItem
                  onClick={() => {
                    openConfirm(() => {
                      setUserInfo(null);
                      router.replace('/login');
                    })();
                    onClose();
                  }}
                >
                  {t('account:logout')}
                </MenuItem>
              </MenuList>
            </Portal>
            <ConfirmModal />
          </Menu>
        </Flex>
      </Flex>
    </Flex>
  );
};

export default Navbar;
