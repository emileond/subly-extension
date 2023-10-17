/*global chrome*/
import {
  Button,
  Flex,
  Heading,
  Link,
  Text,
  VStack,
  Image,
} from '@chakra-ui/react'

const LoginForm = ({ redirectTo, description }) => {
  // supabase login with apple
  const loginOnSubly = async () => {
    await chrome.runtime.sendMessage({
      action: 'navigateToLogin',
    })
  }

  return (
    <Flex
      maxW="lg"
      flexDir="column"
      justifyContent="center"
      mx="auto"
      py={12}
      px={6}
      textAlign={'center'}
    >
      <VStack spacing={10}>
        <VStack spacing={3}>
          <Image src="/icon-512.png" alt="Subly Logo" width="68px" />
          <Heading as="h1" size="md">
            Login to use Subly Chrome Extension
          </Heading>
          {description && <Text>{description}</Text>}
          <Text fontSize="sm">
            You need to log in to your Subly account to use this Chrome
            Extension.
          </Text>
        </VStack>
        <VStack spacing={3}>
          <Button
            id="submit-button"
            type="submit"
            background="#6F55FF"
            colorScheme="purple"
            color="white"
            _hover={{ background: '#5842D8' }}
            onClick={loginOnSubly}
          >
            Login
          </Button>
          <Text fontSize="xs">
            Don't have an account?{' '}
            <Link
              href="https://web.subly.app/signup"
              isExternal
              color="blue.600"
            >
              Signup
            </Link>
          </Text>
        </VStack>
      </VStack>
    </Flex>
  )
}

export default LoginForm
