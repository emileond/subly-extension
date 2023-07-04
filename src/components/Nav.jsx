import { Link } from 'react-router-dom'
import { useColorModeValue, Text, HStack, Box } from '@chakra-ui/react'

export default function Nav() {
  return (
    <Box as="nav" pos="sticky">
      <HStack spacing="4" alignItems="center">
        <Text fontSize="lg" fontWeight="bold">
          <Link to="/">Subly</Link>
        </Text>
      </HStack>
    </Box>
  )
}
