import useUserProfile from '../hooks/useUserProfile'
import {
  Menu,
  MenuList,
  MenuDivider,
  MenuItem,
  HStack,
  Text,
  Badge,
  useColorModeValue,
} from '@chakra-ui/react'
import UserMenuBtn from './UserMenuBtn'
import {
  BiGift,
  BiUser,
  BiReceipt,
  BiEnvelopeOpen,
  BiPowerOff,
} from 'react-icons/bi'

const UserMenu = ({ user }) => {
  const [userProfile] = useUserProfile()
  const secondaryText = useColorModeValue('blackAlpha.700', 'whiteAlpha.700')

  return (
    <Menu>
      <UserMenuBtn menu />
      <MenuList maxW="280px" fontSize="14px">
        <HStack py={2} px={3} justify="space-between" w="100%">
          <Text color={secondaryText} noOfLines={2}>
            {user?.email}
          </Text>
          {userProfile?.plan === 'pro' ||
          userProfile?.plan === 'ltd' ||
          userProfile?.plan === 'ltd-plus' ||
          userProfile?.plan === 'ltd-full' ? (
            <Badge variant="subtle" colorScheme="orange" fontSize="0.8rem">
              PRO
            </Badge>
          ) : null}
        </HStack>
        <MenuDivider />
        <a
          href="https://web.subly.app/account"
          target="_blank"
          rel="noopener noreferrer"
        >
          <MenuItem icon={<BiUser fontSize="1.2rem" />}>Subscriptions</MenuItem>
        </a>
        <a
          href="https://web.subly.app/account"
          target="_blank"
          rel="noopener noreferrer"
        >
          <MenuItem icon={<BiUser fontSize="1.2rem" />}>Account</MenuItem>
        </a>
        <a
          href="https://web.subly.app/account"
          target="_blank"
          rel="noopener noreferrer"
        >
          <MenuItem
            //   onClick={() =>
            //     // router.push({ pathname: '/account', query: { tab: 2 } })
            //   }
            icon={<BiEnvelopeOpen fontSize="1.2rem" />}
          >
            Settings
          </MenuItem>
        </a>
        <a
          href="https://web.subly.app/account"
          target="_blank"
          rel="noopener noreferrer"
        >
          <MenuItem
            //   onClick={() =>
            //     // router.push({ pathname: '/account', query: { tab: 2 } })
            //   }
            icon={<BiEnvelopeOpen fontSize="1.2rem" />}
          >
            Rate the extension
          </MenuItem>
        </a>
        <MenuDivider />
        <MenuItem
          //   onClick={handleSignOut}
          icon={<BiPowerOff fontSize="1.2rem" />}
          color="red.500"
        >
          Sign out
        </MenuItem>
      </MenuList>
    </Menu>
  )
}

export default UserMenu
