import { useColorModeValue, Text, HStack, Box, Image } from '@chakra-ui/react'
import UserMenu from './UserMenu'
import WorkspaceSwitcher from './WorkspaceSwitcher'

export default function Nav({ user }) {
  const bg = useColorModeValue('gray.100', 'gray.900')

  return (
    <Box as="nav" pos="sticky" top={0} p={2} bg={bg} w="100%" zIndex={2}>
      <HStack spacing="4" align="center" justify="space-between" w="100%">
        <Image src="/h-logo_tiny.png" alt="Logo" w="90px" />
        <WorkspaceSwitcher isNavExpanded />
        <UserMenu user={user} />
      </HStack>
    </Box>
  )
}
