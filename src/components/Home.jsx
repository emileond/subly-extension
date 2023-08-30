/* global chrome */

import {
  useUser,
  useSupabaseClient,
  useSession,
} from '@supabase/auth-helpers-react'
import LoginForm from './LoginForm'
import NewSubscription from './NewSub'
import { useEffect, useState } from 'react'
import { Text, Container } from '@chakra-ui/react'
import SetProjectsData from './SetProjectsData'

export default function Home() {
  const user = useUser()
  const session = useSession()
  const [isReady, setIsReady] = useState(false)
  const supabaseClient = useSupabaseClient()

  const setSessionData = async (accessToken, refreshToken) => {
    if (!accessToken || !refreshToken) {
      console.error('Tokens are missing')
      return
    }

    console.log('setting session data')
    console.log(accessToken)
    console.log(refreshToken)

    const { data, error } = await supabaseClient.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    })
    if (error) {
      console.error(error)
    }
    if (data) {
      console.log(data)
    }
  }

  useEffect(() => {
    // Get gAuth tokens from chrome storage
    chrome?.storage?.local?.get(
      ['gauthAccessToken', 'gauthRefreshToken'],
      function (items) {
        const gauthAccessToken = items.gauthAccessToken
        const gauthRefreshToken = items.gauthRefreshToken

        if (gauthAccessToken && gauthRefreshToken) {
          console.log('gauth tokens found')
          setSessionData(gauthAccessToken, gauthRefreshToken)
        }
      }
    )
  }, [])

  useEffect(() => {
    if (user) {
      setIsReady(true)
    }
  }, [user])

  if (isReady) {
    return (
      <Container m="0 auto" maxW="800px" minW="380px">
        <NewSubscription />
      </Container>
    )
  } else {
    return (
      <Container m="0 auto" maxW="800px" minW="380px">
        <LoginForm redirectTo="/subs" description="Sign in to your account" />
      </Container>
    )
  }
}
