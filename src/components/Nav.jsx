import { useColorModeValue, Text, HStack, Box, Image } from '@chakra-ui/react'
import UserMenu from './UserMenu'

export default function Nav() {
  const bg = useColorModeValue('gray.50', 'gray.900')

  return (
    <Box as="nav" pos="sticky" top={0} p={2} bg={bg} w="100%" zIndex={1}>
      <HStack spacing="4" align="center" justify="space-between" w="100%">
        <Image src="/icon-512.png" alt="Logo" boxSize="8" />
        <Text>Workspace</Text>
        <UserMenu />
      </HStack>
    </Box>
  )
}
