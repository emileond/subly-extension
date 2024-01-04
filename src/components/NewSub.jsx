/* global chrome */
import { useEffect, useState } from 'react'
import { useSupabaseClient } from '@supabase/auth-helpers-react'
import useUserProfile from '../hooks/useUserProfile'
import useUserSettings from '../hooks/useUserSettings'
import useUserCategories from '../hooks/useUserCategories'
import useCurrentWorkspace from '../hooks/useCurrentWorkspace'
import useProjects from '../hooks/useProjects'
import useCurrentProject from '../hooks/useCurrentProject'
import usePaymentMethods from '../hooks/usePaymentMethods'
import useTags from '../hooks/useTags'
import { useForm, Controller } from 'react-hook-form'
import { CreatableSelect } from 'chakra-react-select'
import dayjs from 'dayjs'
import {
  Alert,
  AlertIcon,
  AlertDescription,
  Avatar,
  Box,
  Button,
  Center,
  Card,
  FormControl,
  FormLabel,
  FormErrorMessage,
  FormHelperText,
  Heading,
  HStack,
  Icon,
  InputGroup,
  InputLeftAddon,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalCloseButton,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Popover,
  PopoverArrow,
  PopoverBody,
  PopoverCloseButton,
  PopoverContent,
  PopoverHeader,
  PopoverTrigger,
  Select,
  SimpleGrid,
  Text,
  VStack,
  useToast,
  useColorModeValue,
  Divider,
  Stack,
  useDisclosure,
  Accordion,
  AccordionButton,
  AccordionItem,
  AccordionIcon,
  AccordionPanel,
  NumberInput,
  NumberInputField,
  NumberIncrementStepper,
  NumberDecrementStepper,
  NumberInputStepper,
  CircularProgress,
} from '@chakra-ui/react'
import { BiBell, BiReceipt, BiMoney } from 'react-icons/bi'
import CardPreview from '../components/CardPreview'
import { isValidUrl } from '../utils/isValidUrl'
import { colorContrast } from '../utils/colorContrast'
import CurrenciesList from '../components/CurrenciesList'
import { getAbbreviation } from '../utils/getAbbreviation'
import SubsIconUpload from '../components/SubsIconUpload'
import NewTagForm from '../components/NewTagForm'
import SetProjectsData from './SetProjectsData'
import getLogo from '../utils/getLogo'
import SetUserData from './SetUserData'
import PageHeader from './PageHeader'
import RemindersCard from './RemindersCard'

export default function NewSubscription() {
  const supabaseClient = useSupabaseClient()

  const [isLoading, setIsLoading] = useState(false)
  const [userProfile] = useUserProfile()
  const [userSettings, setUserSettings] = useUserSettings()
  const [userCategories, setUserCategories] = useUserCategories()
  const [currentWorkspace, setCurrentWorkspace] = useCurrentWorkspace()
  const [projects, setProjects] = useProjects()
  const [currentProject, setCurrentProject] = useCurrentProject()
  const [paymentMethods, setPaymentMethods] = usePaymentMethods()
  const [tags, setTags] = useTags()
  const toast = useToast()

  const [remindersData, setRemindersData] = useState([])
  const [remindersError, setRemindersError] = useState(false)

  const handleRemindersData = (data) => {
    setRemindersData(data)
  }

  const [newTag, setNewTag] = useState(null)

  const {
    isOpen: isCurrencyModalOpen,
    onOpen: onCurrencyModalOpen,
    onClose: onCurrencyModalClose,
  } = useDisclosure()

  const {
    isOpen: isNewTagModalOpen,
    onOpen: onNewTagModalOpen,
    onClose: onNewTagModalClose,
  } = useDisclosure()

  const initialState = {
    name: '',
    category: 'Other',
    logo: '/empty-states/light/17.svg',
    cost: '',
    billingPeriod: `1 month`,
    billing_freq: 1,
    billing_range: 'month',
    nextPaymentDate: null,
    isActive: true,
    cardColor: 'white',
    currency: currentWorkspace?.currency,
    website: '',
    notes: null,
    isEmailReminderActive: false,
    is_recurring: 'recurring',
    project_id: currentProject?.id,
  }

  const [sub, setSub] = useState(null)
  const [customIcon, setCustomIcon] = useState(null)

  // Color mode values
  const bg = useColorModeValue('white', 'gray.800')
  const modalBg = useColorModeValue('gray.50', 'gray.800')
  const secondaryHeading = useColorModeValue('blackAlpha.800', 'whiteAlpha.800')
  const inputBorder = useColorModeValue('gray.200', 'gray.600')
  const inputVariant = useColorModeValue('filled', 'outline')
  const secondaryText = useColorModeValue('blackAlpha.700', 'whiteAlpha.700')
  const tertiaryText = useColorModeValue('blackAlpha.600', 'whiteAlpha.600')
  const buttonBg = useColorModeValue('blackAlpha.800', 'whiteAlpha.200')
  const buttonHover = useColorModeValue('blackAlpha.900', 'whiteAlpha.300')

  const {
    register,
    handleSubmit,
    watch,
    reset,
    setValue,
    control,
    formState: { errors },
  } = useForm({
    defaultValues: initialState,
  })

  // form input watch
  const isRecurring = watch('is_recurring') === 'recurring'
  const enteredName = watch('name')
  const enteredCategory = watch('category')
  const enteredWebsite = watch('website')
  const enteredCost = watch('cost')
  const enteredFreq = watch('billing_freq')
  const enteredRange = watch('billing_range')
  const enteredNextPaymentDate = watch('nextPaymentDate')
  const enteredEndDate = watch('end_date')
  const enteredRenewalDate = watch('renewal_date')
  const enteredRefundDate = watch('refund_deadline')
  const selectedProject = watch('project_id')

  const updateDefaultCurrency = (currency) => {
    setSubscriptionCurrency(currency)
    onCurrencyModalClose()
  }

  const fetchTags = async () => {
    const { data, error } = await supabaseClient
      .from('tags')
      .select('*')
      .eq('workspace_id', currentWorkspace?.id)
      .order('name', { ascending: true })

    if (error) {
      toast({
        title: 'Error fetching tags',
        description: error.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      })
    }

    setTags(data)
  }

  const [subscriptionCurrency, setSubscriptionCurrency] = useState(
    currentWorkspace?.currency
  )

  const onSubmit = async (data) => {
    // Check if any reminders are invalid
    const hasInvalidReminders = remindersData.some(
      (reminder) => reminder.isInvalid
    )

    if (hasInvalidReminders) {
      setRemindersError(true)
      return // Return early to prevent submission
    }

    const newSub = {
      user_id: currentWorkspace?.user_id,
      isActive: true,
      logo: subLogo,
      name: data.name,
      category: data.category,
      cardColor: color,
      website: data.website?.replace(/(^\w+:|^)\/\//, ''),
      project_id: parseInt(data.project_id),
      cost: data.cost,
      currency: subscriptionCurrency,
      is_recurring: isRecurring,
      billingPeriod: isRecurring
        ? `${data.billing_freq} ${data.billing_range}`
        : 'One time',
      billing_freq: isRecurring ? parseInt(data.billing_freq) : null,
      billing_range: isRecurring ? data.billing_range : null,
      nextPaymentDate: data.nextPaymentDate
        ? dayjs(data.nextPaymentDate).toISOString()
        : null,
      initialPaymentDate:
        isRecurring && data.initialPaymentDate
          ? dayjs(data.initialPaymentDate).toISOString()
          : !isRecurring && data.paid_on_date
          ? dayjs(data.paid_on_date).toISOString()
          : null,
      end_date: data.end_date ? dayjs(data.end_date).toISOString() : null,
      renewal_date: data.renewal_date
        ? dayjs(data.renewal_date).toISOString()
        : null,
      refund_deadline: data.refund_deadline
        ? dayjs(data.refund_deadline).toISOString()
        : null,
      notes: data.notes,
      payment_method_id: data.payment_method_id
        ? parseInt(data.payment_method_id)
        : null,
      user_email: currentWorkspace?.user_email,
      workspace_id: currentWorkspace?.id,
      tags: data?.tags ? data?.tags?.map((tag) => tag?.value) : null,
    }

    // insert the subscription into the database
    insertSub(newSub)
  }

  const insertSub = async (newSub) => {
    setIsLoading(true)

    const { data: subData, error: subError } = await supabaseClient
      .from('Subscriptions')
      .insert(newSub)
      .select()

    if (subData) {
      toast({
        title: 'Subscription added',
        status: 'success',
        duration: 3000,
        isClosable: true,
      })

      try {
        const reminders = await saveReminders(subData[0].id, remindersData)
        // Once the sub and reminders are saved, fetch all subs again
        // const { data: allSubsData } = await supabaseClient
        //   .from('Subscriptions')
        //   .select('*')
        //   .eq('workspace_id', currentWorkspace?.id)

        // if (allSubsData) {
        setIsLoading(false)
        // }
      } catch (error) {
        setIsLoading(false)
        toast({
          title: 'An error occurred, try again',
          status: 'error',
          duration: 3000,
          isClosable: true,
        })
        console.error(error)
      }
    }
  }

  const saveReminders = async (sub_id, reminders) => {
    const validReminders = reminders
      .filter((reminder) => reminder.reminderDate && !reminder.isInvalid)
      .map((reminder) => ({
        subscription_id: sub_id,
        workspace_id: currentWorkspace?.id,
        reminder_date: reminder.reminderDate,
        reminder_type: reminder.reminder_type,
        reminder_offset: reminder.reminder_offset,
        status: 'pending',
      }))

    if (validReminders.length > 0) {
      const { data, error } = await supabaseClient
        .from('reminders')
        .insert(validReminders)

      if (error) {
        toast({
          title: 'Error saving reminders',
          description: error.message,
          status: 'error',
          duration: 5000,
          isClosable: true,
        })
        throw error
      }
      return data
    }
    return []
  }

  // save new category
  const saveNewCategory = async (newCategoryName) => {
    try {
      const updatedCategories = [...userCategories, newCategoryName].sort() // Sort the categories alphabetically

      // Call the Supabase API to update the categories array in the workspace
      const { data, error } = await supabaseClient
        .from('workspaces')
        .update({ categories: updatedCategories })
        .eq('id', currentWorkspace.id)

      if (error) {
        console.error(error)
        return null
      }

      // Show a success toast
      toast({
        title: 'Category saved',
        status: 'info',
        duration: 2000,
        isClosable: true,
      })

      return updatedCategories // Return the sorted categories array
    } catch (error) {
      console.error(error)
      toast({
        title: 'An error occurred, try again',
        status: 'error',
        duration: 3000,
        isClosable: true,
      })
      return null
    }
  }

  const [color, setColor] = useState(sub?.cardColor)

  const colors = [
    'white',
    'red',
    'gray',
    'green',
    'blue',
    'yellow',
    'orange',
    'purple',
    'pink',
  ]

  const colorsHex = {
    white: '#fff',
    gray: '#212529',
    red: '#8c164e',
    green: '#30BA4A',
    blue: '#2b47ec',
    purple: '#6a3093',
    pink: '#B92981',
    orange: '#F08A4B',
    yellow: '#F3CA40',
  }

  const [subLogo, setSubLogo] = useState(sub?.logo)

  // if errors object has any errors, display toast
  const onError = () => {
    toast({
      title: 'Please fill all the required fields',
      status: 'error',
      duration: 3000,
      isClosable: true,
    })
  }

  // watch for changes in the website input to set the logo
  const [debounceTimer, setDebounceTimer] = useState(null)

  useEffect(() => {
    // Clear the previous timer if it exists
    if (debounceTimer) {
      clearTimeout(debounceTimer)
    }

    const fetchLogo = async () => {
      if (enteredWebsite && !customIcon) {
        const url = enteredWebsite?.replace(/(^\w+:|^)\/\//, '')

        if (isValidUrl(`https://${url}`)) {
          const logoUrl = new URL(`https://${url}`).hostname
          const logo = await getLogo(logoUrl)
          setSubLogo(logo)
        }
      }
    }

    if (customIcon) {
      setSubLogo(customIcon)
    } else if (!enteredWebsite && !customIcon) {
      setSubLogo('/empty-states/light/17.svg')
    } else {
      // Set a new timer
      const timer = setTimeout(() => {
        fetchLogo()
      }, 300) // 300ms delay

      setDebounceTimer(timer)
    }

    // Cleanup on unmount or if the effect re-runs
    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer)
      }
    }
  }, [customIcon, enteredWebsite])

  // remove http:// or https:// from website input
  useEffect(() => {
    if (enteredWebsite?.startsWith('http://')) {
      setValue('website', enteredWebsite?.replace('http://', ''))
    } else if (enteredWebsite?.startsWith('https://')) {
      setValue('website', enteredWebsite?.replace('https://', ''))
    }
  }, [enteredWebsite, setValue])

  useEffect(() => {
    if (currentWorkspace) {
      fetchTags()
      setSubscriptionCurrency(currentWorkspace?.currency)
    }
  }, [currentWorkspace])

  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      const currentTab = tabs[0]
      const url = new URL(currentTab.url)

      if (url.protocol === 'http:' || url.protocol === 'https:') {
        const urlParts = url.hostname.split('.')

        let domainName = ''

        if (urlParts.length === 2) {
          domainName = urlParts[0]
        } else if (urlParts.length === 3) {
          domainName = urlParts[1]
        } else if (urlParts.length > 3) {
          domainName = urlParts[urlParts.length - 2]
        }

        setValue(
          'name',
          domainName.charAt(0).toUpperCase() + domainName.slice(1)
        )
        setValue('website', url.hostname.replace('www.', ''))
      }
    })
  }, [setValue])

  // Listen to project selection and set currentProject to it
  useEffect(() => {
    if (selectedProject) {
      const findProject = projects?.find(
        (project) => project?.id === parseInt(selectedProject)
      )
      setCurrentProject(findProject)
    }
  }, [selectedProject])

  return (
    <>
      <SetUserData />
      <SetProjectsData />
      {currentWorkspace ? (
        <VStack justifyContent="start" maxW="fit-content" margin="auto">
          <PageHeader
            heading="New subscription"
            primaryAction={handleSubmit(onSubmit, onError)}
            primaryCTA="Add subscription"
            isLoading={isLoading}
          />
          {(Object.keys(errors).length > 0 || remindersError) && (
            <Alert status="error" borderRadius={5}>
              <AlertIcon />
              <AlertDescription>
                There are errors in the form, please fix them and try again
              </AlertDescription>
            </Alert>
          )}
          <Stack
            direction={['column', 'column', 'row-reverse', 'row-reverse']}
            alignItems={['center', 'center', 'start', 'start']}
            justifyContent="center"
            spacing={6}
            pb="6vh"
            overflowX="hidden"
          >
            <Box w="100%">
              <Heading size="xs" color={tertiaryText} mb={1}>
                Card preview
              </Heading>
              <CardPreview
                title={enteredName}
                cardColor={color}
                subscriptionCost={enteredCost}
                subscriptionLogo={subLogo}
                subscriptionCategory={enteredCategory}
                subscriptionBillingPeriod={
                  isRecurring
                    ? `${enteredFreq} ${getAbbreviation(enteredRange)}`
                    : 'One time'
                }
                subscriptionCurrency={subscriptionCurrency}
              />
            </Box>
            <VStack
              as="form"
              onSubmit={handleSubmit(onSubmit, onError)}
              maxW="xl"
              spacing={6}
            >
              <Card variant="outline" p={[4, 4, 6]} w="100%">
                <VStack align="start" spacing={6}>
                  <HStack>
                    <Icon
                      as={BiReceipt}
                      color={secondaryHeading}
                      fontSize="1.4rem"
                    />
                    <Heading as="h2" size="md" color={secondaryHeading}>
                      General
                    </Heading>
                  </HStack>
                  <HStack w="100%" spacing={4} align="start">
                    <FormControl isInvalid={errors.name}>
                      <FormLabel color={secondaryText}>
                        Name{' '}
                        <Text display="inline-block" color="red.500">
                          *
                        </Text>
                      </FormLabel>
                      <Input
                        id="name"
                        autoComplete="off"
                        {...register('name', {
                          minLength: {
                            value: 2,
                            message: 'Name must be at least 2 characters',
                          },
                          maxLength: {
                            value: 60,
                            message: 'Name must be less than 60 characters',
                          },
                          required: 'Name is required',
                          pattern: {
                            value:
                              /^[a-zA-Z0-9 \-. \s/!@#$&*'+()\u00C0-\u1FFF\u2800-\uFFFD]+$/,
                            message: 'Some special characters are not allowed',
                          },
                        })}
                        placeholder="Name"
                        variant={inputVariant}
                      />
                      <FormErrorMessage>
                        {errors.name && errors.name.message}
                      </FormErrorMessage>
                    </FormControl>
                    <Controller
                      name="category"
                      control={control}
                      render={({ field }) => {
                        // Determine the selected option
                        const selectedOption = userCategories?.find(
                          (option) => option.value === field.value
                        )

                        return (
                          <FormControl>
                            <FormLabel color={secondaryText}>
                              Category
                            </FormLabel>
                            <CreatableSelect
                              isClearable
                              value={selectedOption}
                              onChange={async (newValue) => {
                                if (newValue && newValue.__isNew__) {
                                  // Call the function to save the new category to Supabase
                                  const updatedCategories =
                                    await saveNewCategory(newValue.value)

                                  if (updatedCategories) {
                                    // Update the context with the sorted categories array
                                    setUserCategories(updatedCategories)

                                    // Update the form state with the newly created category's value
                                    field.onChange(newValue.value)
                                  }
                                } else {
                                  // Update the form state with the selected value
                                  field.onChange(newValue ? newValue.value : '')
                                }
                              }}
                              options={userCategories?.map((value) => ({
                                value: value,
                                label: value,
                              }))}
                            />
                            <FormHelperText>
                              Manage categories in settings
                            </FormHelperText>
                          </FormControl>
                        )
                      }}
                    />
                  </HStack>
                  <HStack w="100%" spacing={4} align="start">
                    <FormControl>
                      <FormLabel color={secondaryText}>Website</FormLabel>
                      <InputGroup>
                        <InputLeftAddon
                          children="https://"
                          bg={inputBorder}
                          color={secondaryText}
                        />
                        <Input
                          variant={inputVariant}
                          name="website"
                          placeholder="netflix.com"
                          textTransform="lowercase"
                          {...register('website')}
                        />
                      </InputGroup>
                    </FormControl>
                    <FormControl isInvalid={errors.project_id}>
                      <FormLabel color={secondaryText}>
                        Project{' '}
                        <Text display="inline-block" color="red.500">
                          *
                        </Text>
                      </FormLabel>
                      <Select
                        id="project"
                        {...register('project_id', {
                          required: 'Project is required',
                        })}
                        variant="filled"
                        placeholder="Select a project"
                      >
                        {projects?.map((project) => (
                          <option
                            key={project.id}
                            value={project.id}
                            name="project"
                          >
                            {project.name}
                          </option>
                        ))}
                      </Select>
                      <FormErrorMessage>
                        {errors.project_id && errors.project_id.message}
                      </FormErrorMessage>
                    </FormControl>
                  </HStack>
                  <HStack w="100%" spacing={4} align="start">
                    <VStack w="100%" align="start">
                      <Text
                        as="label"
                        display="block"
                        fontWeight="500"
                        fontSize="md"
                        color={secondaryText}
                        mb={2}
                      >
                        Custom Icon
                      </Text>
                      <SubsIconUpload setCustomIcon={setCustomIcon} />
                      <Text fontSize="sm" color="gray.600">
                        Icon from website is used by default
                      </Text>
                    </VStack>
                    <FormControl>
                      <FormLabel color={secondaryText}>Color</FormLabel>
                      <Popover variant="picker" isLazy>
                        <PopoverTrigger>
                          <Button
                            aria-label={color}
                            background={
                              colors.includes(color) ? `${color}.500` : color
                            }
                            height="32px"
                            width="32px"
                            padding={0}
                            minWidth="unset"
                            borderRadius={3}
                            border="2px solid"
                            borderColor="gray.400"
                          />
                        </PopoverTrigger>
                        <PopoverContent width="170px">
                          <PopoverArrow bg={color} />
                          <PopoverCloseButton color="white" />
                          <PopoverHeader
                            height="100px"
                            backgroundColor={
                              colors.includes(color) ? `${color}.500` : color
                            }
                            borderTopLeftRadius={5}
                            borderTopRightRadius={5}
                            color={
                              colors.includes(color)
                                ? colorContrast(colorsHex[color], 'y')
                                : colorContrast(color, 'y')
                            }
                          >
                            <Center height="100%">{color}</Center>
                          </PopoverHeader>
                          <PopoverBody height="140px">
                            <SimpleGrid columns={5} spacing={2}>
                              {colors.map((c) => (
                                <Button
                                  key={c}
                                  aria-label={c}
                                  background={`${c}.500`}
                                  height="22px"
                                  width="22px"
                                  padding={0}
                                  minWidth="unset"
                                  borderRadius={3}
                                  border="1.6px solid"
                                  borderColor={inputBorder}
                                  _hover={{ background: `${c}.700` }}
                                  onClick={() => {
                                    setColor(c)
                                  }}
                                ></Button>
                              ))}
                            </SimpleGrid>
                            <FormControl>
                              <Input
                                maxLength={7}
                                borderRadius={3}
                                marginTop={3}
                                placeholder="#EAEAEA"
                                size="sm"
                                value={color}
                                onChange={(e) => {
                                  setColor(e.target.value)
                                }}
                              />
                              <FormHelperText color={tertiaryText}>
                                Include '#'
                              </FormHelperText>
                            </FormControl>
                          </PopoverBody>
                        </PopoverContent>
                      </Popover>
                    </FormControl>
                  </HStack>
                  <Controller
                    name="tags"
                    control={control}
                    render={({
                      field: { onChange, value, name },
                      fieldState: { error },
                    }) => (
                      <FormControl isInvalid={error}>
                        <FormLabel>Tags</FormLabel>
                        <CreatableSelect
                          isMulti
                          name={name}
                          value={value}
                          onChange={onChange}
                          placeholder="Select or create tags"
                          options={tags?.map((tag) => ({
                            value: tag?.id,
                            label: tag?.name,
                          }))}
                          // display a modal to create a new tag onCreateOption
                          onCreateOption={(tag) => {
                            setNewTag(tag)
                            onNewTagModalOpen()
                          }}
                        />
                        <FormHelperText pb={2}>
                          Manage tags in settings
                        </FormHelperText>
                      </FormControl>
                    )}
                  />
                </VStack>
              </Card>
              <Card variant="outline" p={[4, 4, 6]} w="100%">
                <VStack align="start" spacing={6}>
                  <HStack>
                    <Icon
                      as={BiMoney}
                      color={secondaryHeading}
                      fontSize="1.4rem"
                    />
                    <Heading as="h2" size="md" color={secondaryHeading}>
                      Billing
                    </Heading>
                  </HStack>
                  <HStack w="100%" spacing={4}>
                    <FormControl isInvalid={errors.cost}>
                      <FormLabel color={secondaryText}>
                        Cost{' '}
                        <Text display="inline-block" color="red.500">
                          *
                        </Text>
                      </FormLabel>
                      <HStack>
                        <InputGroup>
                          <InputLeftAddon
                            children={subscriptionCurrency?.symbol}
                            bg={inputBorder}
                            color={secondaryText}
                          />
                          <Input
                            id="cost"
                            isInvalid={errors.cost}
                            {...register('cost', {
                              required: 'Cost is required',
                            })}
                            variant={inputVariant}
                            inputMode="decimal"
                            type="number"
                            placeholder="1.99"
                            step="0.01"
                          ></Input>
                        </InputGroup>
                        <Button
                          onClick={onCurrencyModalOpen}
                          pl={5}
                          pr={2}
                          variant="outline"
                        >
                          <Avatar
                            src={`/flags/${subscriptionCurrency?.cc.toLocaleLowerCase()}.svg`}
                            size="2xs"
                            mr={2}
                          />
                          <Text
                            fontSize="sm"
                            mr={4}
                          >{`${subscriptionCurrency?.cc}`}</Text>
                        </Button>
                      </HStack>
                      <FormErrorMessage>
                        {errors.cost && errors.cost.message}
                      </FormErrorMessage>
                    </FormControl>
                    <FormControl isInvalid={errors.is_recurring}>
                      <FormLabel color={secondaryText}>
                        Expense Type
                        <Text display="inline-block" color="red.500">
                          *
                        </Text>
                      </FormLabel>
                      <Select
                        id="is_recurring"
                        {...register('is_recurring', {
                          required: 'Expense type is required',
                        })}
                        variant={inputVariant}
                        placeholder="Select expense type"
                      >
                        <option value="recurring" name="is_recurring">
                          Recurring
                        </option>
                        <option value="one time" name="is_recurring">
                          One time
                        </option>
                      </Select>
                      <FormErrorMessage>
                        {errors.is_recurring && errors.is_recurring.message}
                      </FormErrorMessage>
                    </FormControl>
                  </HStack>
                  {paymentMethods?.length > 0 && (
                    <FormControl isInvalid={errors.payment_method_id}>
                      <FormLabel color={secondaryText}>
                        Payment Method{' '}
                      </FormLabel>
                      <Select
                        id="payment_method_id"
                        {...register('payment_method_id')}
                        variant="filled"
                        placeholder="Select a Payment Method"
                      >
                        {paymentMethods?.map((item) => (
                          <option
                            key={item.id}
                            value={item.id}
                            name="Payment Method"
                          >
                            {item.name}
                          </option>
                        ))}
                      </Select>
                      <FormErrorMessage>
                        {errors.payment_method_id &&
                          errors.payment_method_id.message}
                      </FormErrorMessage>
                      <FormHelperText>
                        Edit Payment Methods in settings
                      </FormHelperText>
                    </FormControl>
                  )}
                  <Divider />
                  {isRecurring && (
                    <Stack direction={['column', 'row']} w="100%" spacing={4}>
                      <FormControl isInvalid={errors?.billing_freq}>
                        <FormLabel color={secondaryText}>Every</FormLabel>
                        <HStack>
                          <NumberInput>
                            <NumberInputField
                              id="billing_freq"
                              variant={inputVariant}
                              {...register('billing_freq', {
                                min: {
                                  value: 1,
                                  message: 'Min value is 1',
                                },
                                max: {
                                  value: 500,
                                  message: 'Max value is 500',
                                },
                                shouldUnregister: true,
                                required: 'Billing frequency is required',
                              })}
                            />
                            <NumberInputStepper>
                              <NumberIncrementStepper />
                              <NumberDecrementStepper />
                            </NumberInputStepper>
                          </NumberInput>
                          <Select
                            minW="120px"
                            variant={inputVariant}
                            {...register('billing_range', {
                              shouldUnregister: true,
                            })}
                          >
                            <option value="day">
                              {enteredFreq > 1 ? 'Days' : 'Day'}
                            </option>
                            <option value="week">
                              {enteredFreq > 1 ? 'Weeks' : 'Week'}
                            </option>
                            <option value="month">
                              {enteredFreq > 1 ? 'Months' : 'Month'}
                            </option>
                            <option value="year">
                              {enteredFreq > 1 ? 'Years' : 'Year'}
                            </option>
                          </Select>
                        </HStack>
                        <FormErrorMessage>
                          {errors.billing_freq && errors.billing_freq.message}
                        </FormErrorMessage>
                      </FormControl>
                      <FormControl>
                        <FormLabel color={secondaryText}>
                          Next Payment
                        </FormLabel>
                        <InputGroup>
                          <Input
                            id="nextPaymentDate"
                            variant={inputVariant}
                            type="date"
                            min={dayjs().format('YYYY-MM-DD')}
                            {...register('nextPaymentDate', {
                              shouldUnregister: true,
                            })}
                          />
                        </InputGroup>
                      </FormControl>
                    </Stack>
                  )}
                  {isRecurring && (
                    <Accordion
                      allowToggle
                      w="100%"
                      borderBottomColor="transparent"
                    >
                      <AccordionItem>
                        <AccordionButton>
                          <HStack w="100%" justify="center">
                            <Text color="blue.600">Advanced Options</Text>
                            <AccordionIcon color="blue.600" />
                          </HStack>
                        </AccordionButton>
                        <AccordionPanel px={0}>
                          <HStack align="start" spacing={4} w="100%">
                            <FormControl isInvalid={errors.initialPaymentDate}>
                              <FormLabel color={secondaryText}>
                                First Payment
                              </FormLabel>
                              <InputGroup>
                                <Input
                                  id="initialPaymentDate"
                                  variant={inputVariant}
                                  type="date"
                                  name="initialPaymentDate"
                                  {...register('initialPaymentDate', {
                                    shouldUnregister: true,
                                  })}
                                />
                              </InputGroup>
                              <FormErrorMessage>
                                {errors.initialPaymentDate &&
                                  errors.initialPaymentDate.message}
                              </FormErrorMessage>
                            </FormControl>
                            <FormControl isInvalid={errors.initialPaymentDate}>
                              <FormLabel color={secondaryText}>
                                End Date
                              </FormLabel>
                              <InputGroup>
                                <Input
                                  id="end_date"
                                  variant={inputVariant}
                                  type="date"
                                  name="end_date"
                                  {...register('end_date', {
                                    shouldUnregister: true,
                                  })}
                                />
                              </InputGroup>
                              <FormHelperText>
                                Subscription will be automatically moved to
                                inactive on the chosen date
                              </FormHelperText>
                              <FormErrorMessage>
                                {errors.end_date && errors.end_date.message}
                              </FormErrorMessage>
                            </FormControl>
                          </HStack>
                          <HStack align="start" spacing={4} w="100%">
                            <FormControl isInvalid={errors.renewal_date}>
                              <FormLabel color={secondaryText}>
                                Renewal Date
                              </FormLabel>
                              <InputGroup>
                                <Input
                                  id="renewal_date"
                                  variant={inputVariant}
                                  type="date"
                                  name="renewal_date"
                                  {...register('renewal_date', {
                                    shouldUnregister: true,
                                  })}
                                />
                              </InputGroup>
                              <FormHelperText>
                                Enter a renewal date when the service contract
                                is renewed on different date than the payment
                                dates, i.e. insurance policies.
                              </FormHelperText>
                              <FormErrorMessage>
                                {errors.renewal_date &&
                                  errors.renewal_date.message}
                              </FormErrorMessage>
                            </FormControl>
                          </HStack>
                        </AccordionPanel>
                      </AccordionItem>
                    </Accordion>
                  )}
                  <HStack w="100%" spacing={4}>
                    {!isRecurring && (
                      <>
                        <FormControl isInvalid={errors.paid_on_date}>
                          <FormLabel color={secondaryText}>
                            Paid on{' '}
                            <Text display="inline-block" color="red.500">
                              *
                            </Text>
                          </FormLabel>
                          <InputGroup>
                            <Input
                              id="paid_on_date"
                              variant={inputVariant}
                              type="date"
                              name="paid_on_date"
                              {...register('paid_on_date', {
                                shouldUnregister: true,
                                required: 'Payment Date is required',
                              })}
                            />
                          </InputGroup>
                          <FormErrorMessage>
                            {errors.paid_on_date && errors.paid_on_date.message}
                          </FormErrorMessage>
                        </FormControl>
                        <FormControl>
                          <FormLabel color={secondaryText}>
                            Refund Deadline
                          </FormLabel>
                          <InputGroup>
                            <Input
                              id="refund_deadline"
                              variant={inputVariant}
                              type="date"
                              min={dayjs().format('YYYY-MM-DD')}
                              name="refund_deadline"
                              {...register('refund_deadline', {
                                shouldUnregister: true,
                              })}
                            />
                          </InputGroup>
                        </FormControl>
                      </>
                    )}
                  </HStack>
                </VStack>
              </Card>
              <RemindersCard
                mode="create"
                onRemindersDataChange={handleRemindersData}
                subscription={{
                  nextPaymentDate: enteredNextPaymentDate,
                  end_date: enteredEndDate,
                  refund_deadline: enteredRefundDate,
                  renewal_date: enteredRenewalDate,
                  billing_freq: enteredFreq,
                  billing_range: enteredRange,
                }}
                locale={currentWorkspace?.locale}
              />
            </VStack>
          </Stack>
          <Modal
            isOpen={isCurrencyModalOpen}
            onClose={onCurrencyModalClose}
            scrollBehavior="inside"
            h={'100vh'}
          >
            <ModalOverlay />
            <ModalContent borderRadius={12}>
              <ModalHeader textAlign="center" borderRadius={12} pt={6}>
                Change Default Currency
                <Box />
                <ModalCloseButton />
              </ModalHeader>
              <Divider />
              <ModalBody bg={modalBg} pt={0}>
                <CurrenciesList selectedCurrency={updateDefaultCurrency} />
              </ModalBody>
              <ModalFooter bg={modalBg} borderBottomRadius={12} />
            </ModalContent>
          </Modal>
          <Modal isOpen={isNewTagModalOpen} onClose={onNewTagModalClose}>
            <ModalOverlay />
            <ModalContent borderRadius={12}>
              <ModalHeader textAlign="center" borderRadius={12} pt={6}>
                Create new tag
                <ModalCloseButton />
              </ModalHeader>
              <Divider />
              <ModalBody bg={modalBg} pt={0}>
                <NewTagForm tag={newTag} onModalClose={onNewTagModalClose} />
              </ModalBody>
              <ModalFooter py={1} bg={modalBg} borderBottomRadius={12} />
            </ModalContent>
          </Modal>
        </VStack>
      ) : (
        <VStack h="550px" justify="center">
          <CircularProgress isIndeterminate />
        </VStack>
      )}
    </>
  )
}
