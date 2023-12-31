/* global chrome */
import { Box, Container, Heading, VStack } from '@chakra-ui/react'
import { createClient } from '@supabase/supabase-js'
import { SessionContextProvider, useUser } from '@supabase/auth-helpers-react'
import { ChakraProvider } from '@chakra-ui/react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './components/Home'
import UserProfileContext from './context/userProfileContext'
import UserCategoriesContext from './context/userCategoriesContext'
import WorkspacesContext from './context/workspaceContext'
import { useState } from 'react'
import CurrentWorkspaceContext from './context/currentWorkspaceContext'
import ProjectsContext from './context/projectsContext'
import CurrentProjectContext from './context/currentProjectContext'
import PaymentMethodsContext from './context/paymentMethodsContext'
import TagsContext from './context/tagsContext'
import UserSettingsContext from './context/userSettingsContext'

const supabase = createClient(
  'https://olqusypvbnvlyxibpbcg.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlhdCI6MTY0MDMxNzk4MiwiZXhwIjoxOTU1ODkzOTgyfQ.vsXfdaXm17-hQrH5pz3xgvrYDb2DBKF_Z9UQujfTH0k'
)

function App() {
  const [userProfile, setUserProfile] = useState(null)
  const [userSettings, setUserSettings] = useState(null)
  const [userCategories, setUserCategories] = useState(null)
  const [workspaces, setWorkspaces] = useState(null)
  const [currentWorkspace, setCurrentWorkspace] = useState(null)
  const [projects, setProjects] = useState(null)
  const [currentProject, setCurrentProject] = useState(null)
  const [paymentMethods, setPaymentMethods] = useState(null)
  const [tags, setTags] = useState([])

  return (
    <SessionContextProvider supabaseClient={supabase}>
      <UserProfileContext.Provider value={[userProfile, setUserProfile]}>
        <UserSettingsContext.Provider value={[userSettings, setUserSettings]}>
          <UserCategoriesContext.Provider
            value={[userCategories, setUserCategories]}
          >
            <WorkspacesContext.Provider value={[workspaces, setWorkspaces]}>
              <CurrentWorkspaceContext.Provider
                value={[currentWorkspace, setCurrentWorkspace]}
              >
                <ProjectsContext.Provider value={[projects, setProjects]}>
                  <CurrentProjectContext.Provider
                    value={[currentProject, setCurrentProject]}
                  >
                    <PaymentMethodsContext.Provider
                      value={[paymentMethods, setPaymentMethods]}
                    >
                      <TagsContext.Provider value={[tags, setTags]}>
                        <ChakraProvider>
                          <BrowserRouter>
                            <Home />
                            {/* <Routes>
                                <Route path="/" element={<Home />}></Route>
                              </Routes> */}
                          </BrowserRouter>
                        </ChakraProvider>
                      </TagsContext.Provider>
                    </PaymentMethodsContext.Provider>
                  </CurrentProjectContext.Provider>
                </ProjectsContext.Provider>
              </CurrentWorkspaceContext.Provider>
            </WorkspacesContext.Provider>
          </UserCategoriesContext.Provider>
        </UserSettingsContext.Provider>
      </UserProfileContext.Provider>
    </SessionContextProvider>
  )
}

export default App
