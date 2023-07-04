import {
  useUser,
  useSupabaseClient,
  useSessionContext,
} from '@supabase/auth-helpers-react'
import { useState, useEffect } from 'react'
import useUserProfile from '../hooks/useUserProfile'
import useUserSettings from '../hooks/useUserSettings'
import useWorkspaces from '../hooks/useWorkspaces'
import useCurrentWorkspace from '../hooks/useCurrentWorkspace'
import useUserCategories from '../hooks/useUserCategories'
import {
  VStack,
  CircularProgress,
  Text,
  useColorModeValue,
} from '@chakra-ui/react'

const SetUserData = () => {
  // supabase helpers
  const user = useUser()
  const { isLoading, session, error } = useSessionContext()
  const supabaseClient = useSupabaseClient()

  // App contexts
  const [userProfile, setUserProfile] = useUserProfile()
  const [userSettings, setUserSettings] = useUserSettings()
  const [workspaces, setWorkspaces] = useWorkspaces()
  const [currentWorkspace, setCurrentWorkspace] = useCurrentWorkspace()
  const [userCategories, setUserCategories] = useUserCategories()

  // render progress
  const [isFetching, setIsFetching] = useState(false)

  // Color mode values
  const bg = useColorModeValue('white', 'gray.800')

  const getUserProfile = async () => {
    setIsFetching(true)
    try {
      const timeStart = Date.now()
      const { data, error } = await supabaseClient
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (error) {
        console.error(error)
        return
      }

      const timeEnd = Date.now()
      console.log(`profile fetched in ${timeEnd - timeStart}ms`, data)
      setUserProfile(data)
      setUserSettings(data.settings)
    } catch (error) {
      console.error(error)
    }
    setIsFetching(false)
  }

  const getWorkspace = async () => {
    setIsFetching(true)
    try {
      const timeStart = Date.now()

      const { data: wsAccess, error: wsAccessErr } = await supabaseClient
        .from('workspace_members')
        .select('workspace_id, role')
        .eq('user_id', user.id)

      if (wsAccessErr) {
        console.error(wsAccessErr)
        return
      }

      if (wsAccess) {
        const { data: wsList, error } = await supabaseClient
          .from('workspaces')
          .select('*')
          .in(
            'id',
            wsAccess?.map((ws) => ws?.workspace_id)
          )

        if (error) {
          console.error(error)
          return
        }

        // if the wsList has an object with a role of member, setCurrentWorkspace to that workspace
        if (wsList) {
          const timeEnd = Date.now()
          console.log(`workspaces fetched in ${timeEnd - timeStart}ms`, wsList)
          setWorkspaces(wsList)
          const memberWorkspace = wsList.find(
            (workspace) => workspace.user_id !== user?.id
          )

          if (memberWorkspace) {
            setCurrentWorkspace(memberWorkspace)
            if (userCategories === null) {
              setUserCategories(memberWorkspace?.categories)
            }
          } else {
            // if no memberWorkspace, check if there is a workspace with a role of owner
            const ownerWorkspace = wsList.find(
              (workspace) => workspace.user_id === user?.id
            )

            if (ownerWorkspace) {
              setCurrentWorkspace(ownerWorkspace)
              if (userCategories === null) {
                setUserCategories(ownerWorkspace?.categories)
              }
            }
          }
        }
      }
    } catch (error) {
      console.error(error)
    }
  }

  useEffect(() => {
    if (user && !userProfile && !isLoading) {
      setIsFetching(true)
      console.log('Fetching user profile and workspace...')
      getUserProfile()
        .then(() => getWorkspace())
        .then(() => setIsFetching(false))
        .catch((error) => console.error(error))
    }
  }, [user, userProfile, isLoading])

  if (isFetching) {
    return (
      <VStack
        pos="fixed"
        top={0}
        left={0}
        zIndex={10}
        bg={bg}
        w="100%"
        h="100vh"
        justify="center"
      >
        <CircularProgress isIndeterminate color="blue.500" size="60px" />
        <Text>Loading...</Text>
      </VStack>
    )
  } else return null
}

export default SetUserData
