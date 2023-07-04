import {
  useUser,
  useSupabaseClient,
  useSession,
} from '@supabase/auth-helpers-react'
import LoginForm from './LoginForm'
import NewSubscription from './NewSub'
import SetUserData from './SetUserData'
import { useEffect, useState } from 'react'

export default function Home() {
  const user = useUser()
  const session = useSession()
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    if (user) {
      setIsReady(true)
    }
  }, [user])

  if (isReady) {
    return (
      <>
        <NewSubscription />
      </>
    )
  } else {
    return (
      <LoginForm redirectTo="/subs" description="Sign in to your account" />
    )
  }
}
