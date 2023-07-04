import {
  useUser,
  useSupabaseClient,
  useSession,
} from '@supabase/auth-helpers-react'
import { Heading } from '@chakra-ui/react'
import LoginForm from './LoginForm'
import { useColorModeValue, Box, Text } from '@chakra-ui/react'
import { useEffect, useState } from 'react'
import NewSubscription from './NewSub'
import SetUserData from './SetUserData'

export default function Home() {
  const user = useUser()
  const session = useSession()

  const [newSubscriptionRenderCount, setNewSubscriptionRenderCount] =
    useState(0)
  const [userReady, setUserReady] = useState(false)

  useEffect(() => {
    if (user) {
      setUserReady(true)
    }
  }, [user])

  useEffect(() => {
    setNewSubscriptionRenderCount((prevCount) => prevCount + 1)
  }, [user])

  if (userReady) {
    return (
      <>
        {console.log(
          `<NewSubscription /> rendered ${newSubscriptionRenderCount} times`
        )}
        <NewSubscription />
        <SetUserData />
      </>
    )
  } else {
    return (
      <LoginForm redirectTo="/subs" description="Sign in to your account" />
    )
  }
}
