import { useState, useEffect } from 'react'
import { useSupabaseClient } from '@supabase/auth-helpers-react'
// import useRecuringExpenses from '../hooks/useRecurringExpenses'
import useCurrentWorkspace from '../hooks/useCurrentWorkspace'
import {
  Box,
  Button,
  Text,
  VStack,
  Progress,
  useColorModeValue,
  HStack,
} from '@chakra-ui/react'
import { BiCrown, BiInfinite, BiTachometer } from 'react-icons/bi'

const AccountLimitCard = ({ isParentWide, bg }) => {
  const supabaseClient = useSupabaseClient()
  // const [recurringSubs, setRecurringSubs] = useRecuringExpenses()
  const [currentWorkspace, setCurrentWorkspace] = useCurrentWorkspace()
  const [PRO_LIMIT, setPRO_LIMIT] = useState(100)
  const FREE_LIMIT = 10
  const [isSubscribed, setIsSubscribed] = useState()
  const [subsCount, setSubsCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)

  // Color mode values
  const hoverBg = useColorModeValue({ bg: 'gray.50' }, { bg: 'whiteAlpha.100' })

  const updateSubsCount = async () => {
    setIsLoading(true)
    // setSubsCount(recurringSubs?.length)
    setIsLoading(false)
  }

  const getRecurringSubs = async () => {
    const { data, error } = await supabaseClient.rpc(
      'get_recurring_subscription_count_by_workspace',
      {
        p_workspace_id: currentWorkspace?.id,
      }
    )
    if (data) {
      setSubsCount(data)
    }
    if (error) {
      console.error(error)
    }
  }

  // Set new limit if workspace owner is ltd from current workspace
  useEffect(() => {
    if (currentWorkspace) {
      getRecurringSubs()
      setIsSubscribed(currentWorkspace?.is_subscribed)
    }
    if (isSubscribed) {
      if (currentWorkspace?.subs_limit) {
        setPRO_LIMIT(currentWorkspace?.subs_limit)
      }
      if (
        currentWorkspace?.plan === 'pro' ||
        currentWorkspace?.plan === 'team'
      ) {
        setPRO_LIMIT('unlimited')
      }
    }
  }, [currentWorkspace, isSubscribed])

  // useEffect(() => {
  //   if (recurringSubs) {
  //     updateSubsCount()
  //   }
  // }, [recurringSubs])

  return (
    <a
      href="https://web.subly.app/pro/my-pro"
      target="_blank"
      rel="noopener noreferrer"
    >
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        bg={bg ? 'white' : 'none'}
        boxShadow={
          bg
            ? 'rgba(0, 0, 0, 0.05) 0px 4px 6px -1px, rgba(0, 0, 0, 0.02) 0px 2px 4px -1px'
            : 'none'
        }
        borderRadius={12}
        py={4}
        // w="100%"
        cursor="pointer"
        _hover={hoverBg}
      >
        <VStack>
          <HStack align="center" pb={2}>
            <Text fontSize="sm" fontWeight="semibold">
              {subsCount} /{' '}
            </Text>
            <Text>
              {isSubscribed ? (
                PRO_LIMIT === 'unlimited' ? (
                  <BiInfinite fontSize="1.2rem" />
                ) : (
                  PRO_LIMIT
                )
              ) : (
                FREE_LIMIT
              )}
            </Text>
            {isParentWide && <Text fontSize="sm">subscriptions</Text>}
          </HStack>
          <Progress
            min={0}
            max={
              isSubscribed
                ? PRO_LIMIT === 'unlimited'
                  ? 800
                  : PRO_LIMIT
                : FREE_LIMIT
            }
            value={subsCount}
            colorScheme="purple"
            borderRadius={12}
            width={isParentWide ? '100%' : '50%'}
          >
            <Text>Subscriptions Added</Text>
          </Progress>
        </VStack>
      </Box>
    </a>
  )
}

export default AccountLimitCard
