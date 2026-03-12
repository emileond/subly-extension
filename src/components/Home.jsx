/* global chrome */

import { useUser, useSupabaseClient } from '@supabase/auth-helpers-react'
import LoginForm from './LoginForm'
import NewSubscription from './NewSub'
import { useEffect, useState } from 'react'
import { Container, Tab, TabList, TabPanel, TabPanels, Tabs } from '@chakra-ui/react'
import SetUserData from './SetUserData'
import Nav from './Nav'
import SetProjectsData from './SetProjectsData'
import AppsumoImport from './AppsumoImport'

export default function Home() {
  const user = useUser()
  const supabaseClient = useSupabaseClient()
  const [activeTab, setActiveTab] = useState(0)

  const setSessionData = async (accessToken, refreshToken) => {
    if (!accessToken || !refreshToken) {
      console.error('Tokens are missing')
      return
    }

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
    chrome?.storage?.local?.get(['sessionData'], function (result) {
      if (result.sessionData) {
        setSessionData(
          result.sessionData.access_token,
          result.sessionData.refresh_token
        )
      }
    })
  }, [])

  return (
    <>
      {user ? (
        <>
          <SetUserData />
          <SetProjectsData />
          <Nav user={user} />
          <Container m="0 auto" maxW="800px" minW="420px">
            <Tabs
              index={activeTab}
              onChange={setActiveTab}
              variant="enclosed"
              mt={3}
            >
              <TabList>
                <Tab>Add Subscription</Tab>
                <Tab>AppSumo Import</Tab>
              </TabList>
              <TabPanels>
                <TabPanel px={0} pt={4}>
                  <NewSubscription />
                </TabPanel>
                <TabPanel px={0} pt={4}>
                  <AppsumoImport />
                </TabPanel>
              </TabPanels>
            </Tabs>
          </Container>
        </>
      ) : (
        <Container m="0 auto" maxW="800px" minW="420px">
          <LoginForm />
        </Container>
      )}
    </>
  )
}
