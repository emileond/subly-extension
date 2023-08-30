import { useState, useEffect } from 'react'
import {
  useUser,
  useSupabaseClient,
  useSessionContext,
} from '@supabase/auth-helpers-react'
import useCurrentWorkspace from '../hooks/useCurrentWorkspace'
import useUserCategories from '../hooks/useUserCategories'
import useProjects from '../hooks/useProjects'
import useCurrentProject from '../hooks/useCurrentProject'
import useSubscriptionsData from '../hooks/useSubscriptionsData'
import useRecurringExpenses from '../hooks/useRecurringExpenses'
import usePaymentMethods from '../hooks/usePaymentMethods'
import { useToast } from '@chakra-ui/react'

const SetProjectsData = () => {
  // supabase helpers
  const user = useUser()
  const supabaseClient = useSupabaseClient()
  const { isLoading, session, error } = useSessionContext()

  // App contexts
  const [currentWorkspace, setCurrentWorkspace] = useCurrentWorkspace()
  const [userCategories, setUserCategories] = useUserCategories()
  const [projects, setProjects] = useProjects()
  const [currentProject, setCurrentProject] = useCurrentProject()
  // const [subscriptions, setSubscriptions] = useSubscriptionsData()
  // const [recurringExpenses, setRecurringExpenses] = useRecurringExpenses()
  const [paymentMethods, setPaymentMethods] = usePaymentMethods()

  // Toast
  const toast = useToast()

  // Component vars
  const [isFetching, setIsFetching] = useState(false)

  const getPaymentMethods = async () => {
    const { data: paymentMethodsData, error } = await supabaseClient
      .from('payment_methods')
      .select('*')
      .eq('workspace_id', currentWorkspace.id)

    if (paymentMethodsData) {
      setPaymentMethods(paymentMethodsData)
    }

    if (error) {
      console.error(error)
    }
  }

  // const getSubscriptions = async () => {
  //   const { data, error } = await supabaseClient
  //     .from('Subscriptions')
  //     .select('*')
  //     .eq('workspace_id', currentWorkspace?.id)

  //   if (data) {
  //     setSubscriptions(data)
  //   }
  // }

  const getProjects = async () => {
    const { data: projects, error } = await supabaseClient
      .from('projects')
      .select('*')
      .eq('workspace_id', currentWorkspace?.id)

    if (error) {
      console.error(error)
    }

    if (projects) {
      setProjects(projects)
      if (
        currentProject &&
        currentProject?.workspace_id !== currentWorkspace?.id
      ) {
        setCurrentProject(projects[0])
      }
    }
  }

  const getCategories = async () => {
    const { data, error } = await supabaseClient
      .from('workspaces')
      .select('categories')
      .eq('id', currentWorkspace?.id)
      .single()
    setUserCategories(data?.categories)
  }

  useEffect(() => {
    if (currentWorkspace) {
      setIsFetching(true)
      getProjects().then(() => {
        getPaymentMethods().then(() => {
          setIsFetching(false)
        })
      })
      // getSubscriptions().then(() => {
      // })
      // )
      getCategories()
    }
  }, [currentWorkspace])

  // useEffect(() => {
  //   if (subscriptions) {
  //     const filteredArr = subscriptions?.filter(sub => sub.is_recurring)

  //     setRecurringExpenses(filteredArr)
  //   }
  // }, [subscriptions])
}

export default SetProjectsData
