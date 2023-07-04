import { useEffect, useState } from 'react'
import {
  useUser,
  useSupabaseClient,
  useSession,
} from '@supabase/auth-helpers-react'
import { useForm } from 'react-hook-form'
import {
  Alert,
  AlertDescription,
  AlertIcon,
  AlertTitle,
  Box,
  Button,
  Divider,
  Flex,
  FormControl,
  FormLabel,
  FormErrorMessage,
  Heading,
  IconButton,
  Input,
  InputGroup,
  InputRightElement,
  Text,
  Tooltip,
  Stack,
  VStack,
  HStack,
  useColorModeValue,
  Image,
} from '@chakra-ui/react'
import { BiShow, BiHide } from 'react-icons/bi'
import { FaApple } from 'react-icons/fa'
import googleIcon from '../assets/ic-google.svg'

const LoginForm = ({ redirectTo, description }) => {
  // Color mode values
  const bg = useColorModeValue('white', 'gray.800')
  const inputBorder = useColorModeValue('gray.200', 'gray.600')
  const tertiaryText = useColorModeValue('blackAlpha.600', 'whiteAlpha.600')
  const buttonHover = useColorModeValue('gray.100', 'blackAlpha.500')

  // Supabase helpers
  const user = useUser()
  const session = useSession()
  const supabaseClient = useSupabaseClient()

  useEffect(() => {
    if (user) {
      console.log('user', user)
      console.log('session', session)
    }
  }, [user, session])

  // supabase login with email and password
  const loginWithEmailAndPassword = async (email, password) => {
    const { user, error } = await supabaseClient.auth.signInWithPassword({
      email: email,
      password: password,
    })
    if (error) {
      console.error(error)
      setAuthErr(error)
    }
  }

  // supabase login with google
  const loginWithGoogle = async () => {
    const { user, error } = await supabaseClient.auth.signInWithOAuth({
      provider: 'google',
    })
    if (error) {
      setAuthErr(error)
    }
    if (user) {
      console.log(user)
    }
  }

  // supabase login with apple
  const loginWithApple = async () => {
    const { user, error } = await supabaseClient.auth.signInWithOAuth({
      provider: 'apple',
    })
    if (error) {
      setAuthErr(error)
    }
  }

  // Email + Password Functionality
  const [show, setShow] = useState(false)
  const toggleShowPassword = () => setShow(!show)
  const [isLoading, setIsLoading] = useState(false)
  const [authErr, setAuthErr] = useState(null)

  // Email & Pwd using react-hook=form
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm()
  async function onSubmit(data) {
    setIsLoading(true)
    if (data.passwordA) {
      return null
    }
    loginWithEmailAndPassword(data.email, data.pwd).then(() =>
      setIsLoading(false)
    )
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
      <VStack spacing={4}>
        <VStack spacing={1}>
          <Heading as="h1" size="lg" mb={3}>
            Welcome to Subly
          </Heading>
          {description && <Text>{description}</Text>}
          <Text fontSize="lg">
            Don't have an account?{' '}
            <Button as="a" href="/signup" colorScheme="blue" variant="link">
              Signup
            </Button>
          </Text>
        </VStack>
        <Stack w="100%" spacing={3}>
          <Button
            colorScheme={'gray'}
            bg={bg}
            border="1px solid"
            borderColor="gray.200"
            size="lg"
            onClick={loginWithGoogle}
            _hover={{ bg: buttonHover }}
          >
            <Image src={googleIcon} boxSize="24px" />
            <Text ml={2}>Sign in with Google</Text>
          </Button>
          <Button
            colorScheme="gray"
            bg={bg}
            border="1px solid"
            borderColor="gray.200"
            size="lg"
            onClick={loginWithApple}
            _hover={{ bg: buttonHover }}
            leftIcon={<FaApple fontSize={28} />}
          >
            <Text>Sign in with Apple</Text>
          </Button>
        </Stack>
        <Stack w="100%">
          <HStack w="100%">
            <Divider />
            <Text color={tertiaryText} w="100%">
              Or login with email
            </Text>
            <Divider />
          </HStack>
        </Stack>
        {authErr ? (
          <Alert status="error" borderRadius={8} textAlign="start">
            <AlertIcon />
            <Box flex="1">
              <AlertTitle>Login Error</AlertTitle>
              <AlertDescription>{authErr.message}</AlertDescription>
            </Box>
          </Alert>
        ) : null}
        <VStack
          as="form"
          w="100%"
          spacing={2}
          onSubmit={handleSubmit(onSubmit)}
        >
          <FormControl
            //  id="email"
            isInvalid={errors.email}
          >
            <FormLabel htmlFor="email">Email</FormLabel>
            <Input
              id="email"
              {...register('email', {
                required: 'Email is required',
              })}
              variant="filled"
              type="email"
              placeholder="Enter your email"
              borderColor={inputBorder}
            />
            <FormErrorMessage>
              {errors.email && errors.email.message}
            </FormErrorMessage>
          </FormControl>
          <Input
            id="passwordA"
            {...register('passwordA')}
            type="text"
            name="passwordA"
            display="none"
            tabIndex="-1"
            autoComplete="off"
          />
          <FormControl
            // id="password"
            isInvalid={errors.pwd}
          >
            <FormLabel htmlFor="pwd">Password</FormLabel>
            <InputGroup>
              <Input
                id="pwd"
                // name="pwd"
                {...register('pwd', {
                  required: 'Password is required',
                  minLength: {
                    value: 6,
                    message: 'Password should be at least 6 characters',
                  },
                })}
                borderColor={inputBorder}
                variant="filled"
                // onChange={handleEmailAndPwdInput}
                type={show ? 'text' : 'password'}
                // name="user_pwd"
                placeholder="Enter password"
              />
              <InputRightElement>
                <Tooltip label={show ? 'Hide password' : 'Show password'}>
                  <IconButton
                    onClick={toggleShowPassword}
                    color="gray.600"
                    variant="ghost"
                    fontSize={24}
                    icon={show ? <BiHide /> : <BiShow />}
                    _hover={{ color: 'gray.800', bg: 'gray.200' }}
                  ></IconButton>
                </Tooltip>
              </InputRightElement>
            </InputGroup>
            <FormErrorMessage>
              {errors.pwd && errors.pwd.message}
            </FormErrorMessage>
          </FormControl>
          <Stack w="100%">
            <Button
              id="submit-button"
              isLoading={isLoading}
              type="submit"
              // disabled={email && password ? false : true}
              background="#6F55FF"
              colorScheme="purple"
              color="white"
              _hover={{ background: '#5842D8' }}
              size="lg"
              // onClick={() => handleLoginClick('email&pwd')}
            >
              Login
            </Button>
          </Stack>
        </VStack>
        <Text
          color="blue.500"
          fontSize="sm"
          cursor="pointer"
          _hover={{ textDecor: 'underline' }}
        >
          Forgot your password?
        </Text>
      </VStack>
    </Flex>
  )
}

export default LoginForm
