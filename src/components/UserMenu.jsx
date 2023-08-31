/* globals chrome */
import { useRef } from 'react'
import { useSupabaseClient } from '@supabase/auth-helpers-react'
import useUserProfile from '../hooks/useUserProfile'
import useUserSettings from '../hooks/useUserSettings'
import useUserCategories from '../hooks/useUserCategories'
import useWorkspaces from '../hooks/useWorkspaces'
import useCurrentWorkspace from '../hooks/useCurrentWorkspace'
import useProjects from '../hooks/useProjects'
import useCurrentProject from '../hooks/useCurrentProject'
import usePaymentMethods from '../hooks/usePaymentMethods'
import {
  Box,
  Button,
  Divider,
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerOverlay,
  Flex,
  Heading,
  Icon,
  Image,
  Link,
  Stack,
  useDisclosure,
  VStack,
  Menu,
  MenuList,
  MenuDivider,
  MenuItem,
  HStack,
  Text,
  Badge,
  useColorModeValue,
  useToast,
} from '@chakra-ui/react'
import UserMenuBtn from './UserMenuBtn'
import {
  BiGift,
  BiCog,
  BiLogOut,
  BiPieChartAlt,
  BiInfoCircle,
  BiMessageAltDetail,
  BiCard,
  BiUser,
  BiReceipt,
  BiEnvelopeOpen,
  BiPowerOff,
} from 'react-icons/bi'
import AccountLimitCard from './AccountLimitCard'
import NavItem from './NavItem'
import Avatar from './Avatar'

const UserMenu = ({ user }) => {
  const supabaseClient = useSupabaseClient()
  const toast = useToast()
  const { isOpen, onOpen, onClose } = useDisclosure()
  const btnRef = useRef()

  const [userSettings, setUserSettings] = useUserSettings()
  const [userCategories, setUserCategories] = useUserCategories()
  const [workspaces, setWorkspaces] = useWorkspaces()
  const [currentWorkspace, setCurrentWorkspace] = useCurrentWorkspace()
  const [projects, setProjects] = useProjects()
  const [currentProject, setCurrentProject] = useCurrentProject()
  const [paymentMethods, setPaymentMethods] = usePaymentMethods()
  const [userProfile, setUserProfile] = useUserProfile()

  const secondaryText = useColorModeValue('blackAlpha.700', 'whiteAlpha.700')

  const handleSignOut = async () => {
    await supabaseClient.auth.signOut().then(() =>
      toast({
        title: 'Logged Out Successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      })
    )
    supabaseClient.removeAllChannels()
    setUserProfile(null)
    setUserSettings(null)
    setUserCategories(null)
    setWorkspaces(null)
    setCurrentWorkspace(null)
    setProjects(null)
    setCurrentProject(null)
    setPaymentMethods(null)
    chrome.storage.local.clear()
  }

  return (
    <>
      <Box as="button" onClick={onOpen}>
        <UserMenuBtn />
      </Box>
      {/* <Menu isLazy>
      <MenuList fontSize="14px">
        <AccountLimitCard isParentWide />
        <MenuDivider />
        <Text p={3} fontSize="sm" color={secondaryText}>
          {user?.email}
        </Text>
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
          onClick={handleSignOut}
          icon={<BiPowerOff fontSize="1.2rem" />}
          color="red.500"
        >
          Sign out
        </MenuItem>
      </MenuList>
    </Menu> */}
      <Drawer
        isOpen={isOpen}
        placement="right"
        onClose={onClose}
        finalFocusRef={btnRef}
      >
        <DrawerOverlay />
        <DrawerContent>
          <DrawerCloseButton />
          <DrawerHeader>
            <AccountLimitCard isParentWide />
          </DrawerHeader>
          <DrawerBody>
            <VStack mt={2} spacing={4} w="100%">
              <NavItem
                linkTo="https://web.subly.app/home"
                isNavExpanded
                icon={<BiCard fontSize={22} />}
                title="Subscriptions"
              />
              <NavItem
                linkTo="https://web.subly.app/reports"
                isNavExpanded
                icon={<BiPieChartAlt fontSize={22} />}
                title="Reports"
              />
              <NavItem
                linkTo="https://web.subly.app/settings"
                isNavExpanded
                icon={<BiCog fontSize={22} />}
                title="Settings"
              />
              <NavItem
                isNavExpanded
                icon={<BiMessageAltDetail fontSize={22} />}
                title="Rate the extension"
              />
            </VStack>
          </DrawerBody>
          <Divider />
          <DrawerFooter>
            <Stack w="100%">
              <Flex pl={3} py={3}>
                <Avatar size="sm" />
                <Flex justify="center" flexDir="column" ml={3} display={'flex'}>
                  <Text size="sm" color="gray.600">
                    {user?.email}
                  </Text>
                </Flex>
              </Flex>
              <NavItem
                onNewTab
                linkTo="https://web.subly.app/account"
                isNavExpanded
                icon={<BiInfoCircle fontSize={22} />}
                title="Account"
              />
              <NavItem
                isNavExpanded
                icon={<BiLogOut fontSize={22} />}
                title="Sign out"
                onClick={handleSignOut}
                color="red.600"
              />
            </Stack>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </>
  )
}

export default UserMenu
