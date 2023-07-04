import { useEffect, useState } from 'react'
import { useUser, useSupabaseClient } from '@supabase/auth-helpers-react'
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
  Avatar,
  Box,
  Button,
  Center,
  FormControl,
  FormLabel,
  FormErrorMessage,
  FormHelperText,
  Heading,
  HStack,
  IconButton,
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
  Textarea,
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
} from '@chakra-ui/react'
import { BiArrowBack } from 'react-icons/bi'
import CardPreview from '../components/CardPreview'
import { isValidUrl } from '../utils/isValidUrl'
import { colorContrast } from '../utils/colorContrast'
import CurrenciesList from '../components/CurrenciesList'
import { getAbbreviation } from '../utils/getAbbreviation'
import SubsIconUpload from '../components/SubsIconUpload'
import NewTagForm from '../components/NewTagForm'
import SetUserData from './SetUserData'

export default function NewSubscription({ subQuery }) {
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
    control,
    formState: { errors },
  } = useForm({
    defaultValues: sub,
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
  const enteredRefundDate = watch('refund_deadline')
  const selectedAlert1 = watch('alert_1')
  const selectedAlert2 = watch('alert_2')
  const selectedAlert3 = watch('alert_3')

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
    sub?.currency ? sub?.currency : currentWorkspace?.currency
  )

  const onSubmit = async (data) => {
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
          : data.refund_deadline
          ? dayjs(data.refund_deadline).toISOString()
          : null,
      end_date: data.end_date ? dayjs(data.end_date).toISOString() : null,
      renewal_date: data.renewal_date
        ? dayjs(data.renewal_date).toISOString()
        : null,
      refund_deadline: data.refund_deadline
        ? dayjs(data.refund_deadline).toISOString()
        : null,
      isEmailReminderActive:
        parseInt(data.alert_1) ||
        parseInt(data.alert_2) ||
        parseInt(data.alert_3) ||
        parseInt(data.refund_alert_1) ||
        parseInt(data.refund_alert_2) ||
        parseInt(data.refund_alert_3)
          ? true
          : false,
      alert1_range:
        parseInt(data.alert_1) && data.nextPaymentDate
          ? parseInt(data.alert_1)
          : parseInt(data.refund_alert_1) && data.refund_deadline
          ? parseInt(data.refund_alert_1)
          : null,
      alert1_date:
        parseInt(data.alert_1) && data.nextPaymentDate
          ? alert1Date.format('YYYY-MM-DD')
          : parseInt(data.refund_alert_1) && data.refund_deadline
          ? dayjs(data.refund_deadline)
              .subtract(parseInt(data.refund_alert_1), 'day')
              .format('YYYY-MM-DD')
          : null,
      alert2_range:
        parseInt(data.alert_2) && data.nextPaymentDate
          ? parseInt(data.alert_2)
          : parseInt(data.refund_alert_2) && data.refund_deadline
          ? parseInt(data.refund_alert_2)
          : null,
      alert2_date:
        parseInt(data.alert_2) && data.nextPaymentDate
          ? alert2Date.format('YYYY-MM-DD')
          : parseInt(data.refund_alert_2) && data.refund_deadline
          ? dayjs(data.refund_deadline)
              .subtract(parseInt(data.refund_alert_2), 'day')
              .format('YYYY-MM-DD')
          : null,
      alert3_range:
        parseInt(data.alert_3) && data.nextPaymentDate
          ? parseInt(data.alert_3)
          : parseInt(data.refund_alert_3) && data.refund_deadline
          ? parseInt(data.refund_alert_3)
          : null,
      alert3_date:
        parseInt(data.alert_3) && data.nextPaymentDate
          ? alert3Date.format('YYYY-MM-DD')
          : parseInt(data.refund_alert_3) && data.refund_deadline
          ? dayjs(data.refund_deadline)
              .subtract(parseInt(data.refund_alert_3), 'day')
              .format('YYYY-MM-DD')
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

      // Once the sub was saved, return all user subs and update Subs Context
      const { data: allSubsData } = await supabaseClient
        .from('Subscriptions')
        .select('*')
        .eq('workspace_id', currentWorkspace?.id)

      if (allSubsData) {
        setIsLoading(false)
        // setSubscriptions(allSubsData)
        // router.push('/home')
      }
    }
    if (subError) {
      setIsLoading(false)
      toast({
        title: 'An error occurred, try again',
        status: 'error',
        duration: 3000,
        isClosable: true,
      })
      console.error(subError)
    }
  }

  const handleBack = () => {
    // router.back()
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

  const getWebsiteLogo = async (url) => {
    const logo = await fetch(`/api/utils/get-logo?website=${url}`)
      .then((res) => res.json())
      .then((res) => {
        const { data, error } = res
        if (error) {
          return '/empty-states/light/17.svg'
        }
        if (data) {
          return data
        }
      })
    setSubLogo(logo)
  }

  useEffect(() => {
    // remove the http:// or https:// from the enteredWebsite string
  }, [enteredWebsite])

  // use effecto use customIcon if customIcon exists
  useEffect(() => {
    if (customIcon) {
      setSubLogo(customIcon)
    }
    if (enteredWebsite && !customIcon) {
      const url = enteredWebsite?.replace(/(^\w+:|^)\/\//, '')

      if (isValidUrl(`https://${url}`)) {
        const logoUrl = new URL(`https://${url}`).hostname
        if (!subLogo.includes('/popular-services/')) {
          getWebsiteLogo(logoUrl)
        }
      }
    }
    if (!enteredWebsite && !customIcon) {
      setSubLogo('/empty-states/light/17.svg')
    }
  }, [customIcon, enteredWebsite])

  // useEffecto to get the subscription from router
  useEffect(() => {
    if (subQuery) {
      setSub({
        ...subQuery,
        is_recurring:
          !subQuery?.billingPeriod === 'One time' ? 'one time' : 'recurring',
      })
      setSubLogo(subQuery.logo)
      setColor(subQuery.cardColor ? subQuery.cardColor : 'white')
    } else {
      setSub(initialState)
      setSubLogo('/empty-states/light/17.svg')
    }
    reset({
      ...subQuery,
      is_recurring:
        subQuery?.billingPeriod === 'One time' ? 'one time' : 'recurring',
      billing_range: subQuery?.billing_range
        ? subQuery?.billing_range
        : 'month',
      billing_freq: subQuery?.billing_freq ? subQuery?.billing_freq : 1,
      project_id: currentProject?.id,
      nextPaymentDate: subQuery?.nextPaymentDate
        ? dayjs(subQuery?.nextPaymentDate).format('YYYY-MM-DD')
        : null,
      initialPaymentDate: subQuery?.initialPaymentDate
        ? dayjs(subQuery?.initialPaymentDate).format('YYYY-MM-DD')
        : null,
      end_date: subQuery?.end_date
        ? dayjs(subQuery?.end_date).format('YYYY-MM-DD')
        : null,
      refund_deadline: subQuery?.refund_deadline
        ? dayjs(subQuery?.refund_deadline).format('YYYY-MM-DD')
        : null,
      payment_method_id: subQuery?.payment_method_id
        ? subQuery?.payment_method_id
        : null,
    })
  }, [])

  const [alert1Date, setAlert1Date] = useState(null)
  const [alert2Date, setAlert2Date] = useState(null)
  const [alert3Date, setAlert3Date] = useState(null)

  // listen to alert range changes and set dates
  useEffect(() => {
    if (enteredNextPaymentDate) {
      const nextPaymentDate = dayjs(enteredNextPaymentDate)

      if (selectedAlert1 > 0) {
        const alert1 = nextPaymentDate.subtract(parseInt(selectedAlert1), 'day')
        // if the alert date would be before the current date, set it to the current date
        if (alert1.isBefore(dayjs())) {
          const nextAlertDate = nextPaymentDate
            .add(parseInt(enteredFreq), enteredRange)
            .subtract(parseInt(selectedAlert1), 'day')

          setAlert1Date(nextAlertDate)
        } else {
          setAlert1Date(alert1)
        }
      } else {
        setAlert1Date(null)
      }

      if (selectedAlert2 > 0) {
        const alert2 = nextPaymentDate.subtract(parseInt(selectedAlert2), 'day')
        // if the alert date would be before the current date, set it to the current date
        if (alert2.isBefore(dayjs())) {
          const nextAlertDate = nextPaymentDate
            .add(parseInt(enteredFreq), enteredRange)
            .subtract(parseInt(selectedAlert2), 'day')

          setAlert2Date(nextAlertDate)
        } else {
          setAlert2Date(alert2)
        }
      } else {
        setAlert2Date(null)
      }

      if (selectedAlert3 > 0) {
        const alert3 = nextPaymentDate.subtract(parseInt(selectedAlert3), 'day')
        // if the alert date would be before the current date, set it to the current date
        if (alert3.isBefore(dayjs())) {
          const nextAlertDate = nextPaymentDate
            .add(parseInt(enteredFreq), enteredRange)
            .subtract(parseInt(selectedAlert3), 'day')

          setAlert3Date(nextAlertDate)
        } else {
          setAlert3Date(alert3)
        }
      } else {
        setAlert3Date(null)
      }
    }
  }, [
    selectedAlert1,
    selectedAlert2,
    selectedAlert3,
    enteredNextPaymentDate,
    enteredFreq,
    enteredRange,
  ])

  useEffect(() => {
    if (currentWorkspace) {
      fetchTags()
    }
  }, [currentWorkspace])

  return (
    <>
      <SetUserData />
      <VStack justifyContent="start" maxW="fit-content" margin="auto">
        <HStack py={6} align="center" justifyContent="start" w="100%">
          <IconButton
            aria-label="back"
            icon={<BiArrowBack />}
            onClick={handleBack}
          />
          <Heading as="h1" size="lg" fontSize="26px" mr={8}>
            New subscription
          </Heading>
        </HStack>
        <Stack
          direction={['column', 'column', 'row-reverse', 'row-reverse']}
          alignItems={['center', 'center', 'start', 'start']}
          justifyContent="center"
          spacing={6}
          pb="6vh"
          overflowX="hidden"
        >
          <Box minW="sm" maxW="max-content">
            <Heading size="sm" color={secondaryText} mb={2}>
              Preview
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
            onSubmit={handleSubmit(onSubmit)}
            maxW="xl"
            spacing={6}
          >
            <Box
              bg={bg}
              p={[4, 4, 6]}
              w="100%"
              borderRadius={8}
              boxShadow="rgba(0, 0, 0, 0.05) 0px 4px 6px -1px, rgba(0, 0, 0, 0.02) 0px 2px 4px -1px"
            >
              <VStack align="start" spacing={6}>
                <Heading as="h2" fontSize="18px" color={secondaryHeading}>
                  General
                </Heading>
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
                  </FormControl>{' '}
                  <FormControl>
                    <FormLabel color={secondaryText}>Category</FormLabel>
                    <Select
                      id="category"
                      variant={inputVariant}
                      placeholder="Select Category"
                      {...register('category')}
                    >
                      {userCategories?.map((value, index) => (
                        <option key={index} value={value} name="category">
                          {value}
                        </option>
                      ))}
                    </Select>
                    <FormHelperText>Edit categories in settings</FormHelperText>
                  </FormControl>
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
            </Box>
            <Box
              bg={bg}
              p={[4, 4, 6]}
              w="100%"
              borderRadius={8}
              boxShadow="rgba(0, 0, 0, 0.05) 0px 4px 6px -1px, rgba(0, 0, 0, 0.02) 0px 2px 4px -1px"
            >
              <VStack align="start" spacing={6}>
                <Heading as="h2" fontSize="18px" color={secondaryHeading}>
                  Expense
                </Heading>
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
                <Divider />
                <Heading as="h2" fontSize="18px" color={secondaryHeading}>
                  Billing
                </Heading>
                {isRecurring && (
                  <Stack direction={['column', 'row']} w="100%" spacing={4}>
                    <FormControl isInvalid={errors?.billing_freq}>
                      <FormLabel color={secondaryText}>Period</FormLabel>
                      <HStack>
                        <Text fontSize="sm" minW="max-content">
                          Every:
                        </Text>
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
                      <FormLabel color={secondaryText}>Next Payment</FormLabel>
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
                              Enter a renewal date when the service contract is
                              renewed on different date than the payment dates,
                              i.e. insurance policies.
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
                      <FormControl isInvalid={errors.initialPaymentDate}>
                        <FormLabel color={secondaryText}>
                          Paid on{' '}
                          <Text display="inline-block" color="red.500">
                            *
                          </Text>
                        </FormLabel>
                        <InputGroup>
                          <Input
                            id="one_time_paid_date"
                            variant={inputVariant}
                            type="date"
                            name="one_time_paid_date"
                            {...register('one_time_paid_date', {
                              shouldUnregister: true,
                              required: 'Payment Date is required',
                            })}
                          />
                        </InputGroup>
                        <FormErrorMessage>
                          {errors.initialPaymentDate &&
                            errors.initialPaymentDate.message}
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
            </Box>
            {isRecurring && (
              <Box
                bg={bg}
                p={[4, 4, 6]}
                w="100%"
                borderRadius={8}
                boxShadow="rgba(0, 0, 0, 0.05) 0px 4px 6px -1px, rgba(0, 0, 0, 0.02) 0px 2px 4px -1px"
              >
                <VStack align="start" spacing={6}>
                  <VStack align="start">
                    <Heading as="h2" fontSize="18px" color={secondaryHeading}>
                      Reminders
                    </Heading>
                    <Text>
                      Set up to 3 reminders - you must enter a next payment date
                    </Text>
                  </VStack>
                  <FormControl>
                    <FormLabel color={secondaryText}>Reminder 1</FormLabel>
                    <Select
                      id="alert_1"
                      isDisabled={!enteredNextPaymentDate}
                      variant={inputVariant}
                      {...register('alert_1', {
                        shouldUnregister: true,
                      })}
                    >
                      <option value={0}>None</option>
                      <option value={1}>1 Day before</option>
                      <option value={3}>3 Days before</option>
                      <option value={5}>5 Days before</option>
                      <option value={7}>7 Days before</option>
                      <option value={10}>10 Days before</option>
                    </Select>
                    <FormHelperText>
                      {alert1Date &&
                        `Next alert on ${alert1Date.format('MMM DD, YYYY')}`}
                    </FormHelperText>
                  </FormControl>
                  <FormControl>
                    <FormLabel color={secondaryText}>Reminder 2</FormLabel>
                    <Select
                      id="alert_2"
                      isDisabled={!enteredNextPaymentDate}
                      variant={inputVariant}
                      {...register('alert_2', {
                        shouldUnregister: true,
                      })}
                    >
                      <option value={0}>None</option>
                      <option value={1}>1 Day before</option>
                      <option value={3}>3 Days before</option>
                      <option value={5}>5 Days before</option>
                      <option value={7}>7 Days before</option>
                      <option value={10}>10 Days before</option>
                    </Select>
                    <FormHelperText>
                      {alert2Date &&
                        `Next alert on ${alert2Date.format('MMM DD, YYYY')}`}
                    </FormHelperText>
                  </FormControl>
                  <FormControl>
                    <FormLabel color={secondaryText}>Reminder 3</FormLabel>
                    <Select
                      id="alert_3"
                      isDisabled={!enteredNextPaymentDate}
                      variant={inputVariant}
                      {...register('alert_3', {
                        shouldUnregister: true,
                      })}
                    >
                      <option value={0}>None</option>
                      <option value={1}>1 Day before</option>
                      <option value={3}>3 Days before</option>
                      <option value={5}>5 Days before</option>
                      <option value={7}>7 Days before</option>
                      <option value={10}>10 Days before</option>
                    </Select>
                    <FormHelperText>
                      {alert3Date &&
                        `Next alert on ${alert3Date.format('MMM DD, YYYY')}`}
                    </FormHelperText>
                  </FormControl>
                </VStack>
              </Box>
            )}
            {!isRecurring && (
              <Box
                bg={bg}
                p={[4, 4, 6]}
                w="100%"
                borderRadius={8}
                boxShadow="rgba(0, 0, 0, 0.05) 0px 4px 6px -1px, rgba(0, 0, 0, 0.02) 0px 2px 4px -1px"
              >
                <VStack align="start" spacing={6}>
                  <VStack align="start">
                    <Heading as="h2" fontSize="18px" color={secondaryHeading}>
                      Reminders
                    </Heading>
                    <Text>
                      Set up to 3 reminders - you must enter a refund deadline
                      date
                    </Text>
                  </VStack>
                  <FormControl>
                    <FormLabel color={secondaryText}>Reminder 1</FormLabel>
                    <Select
                      id="refund_alert_1"
                      isDisabled={!enteredRefundDate}
                      variant={inputVariant}
                      {...register('refund_alert_1', {
                        shouldUnregister: true,
                      })}
                    >
                      <option value={0}>None</option>
                      <option value={1}>1 Day before</option>
                      <option value={3}>3 Days before</option>
                      <option value={5}>5 Days before</option>
                      <option value={7}>7 Days before</option>
                      <option value={10}>10 Days before</option>
                    </Select>
                  </FormControl>
                  <FormControl>
                    <FormLabel color={secondaryText}>Reminder 2</FormLabel>
                    <Select
                      id="refund_alert_2"
                      isDisabled={!enteredRefundDate}
                      variant={inputVariant}
                      {...register('refund_alert_2', {
                        shouldUnregister: true,
                      })}
                    >
                      <option value={0}>None</option>
                      <option value={1}>1 Day before</option>
                      <option value={3}>3 Days before</option>
                      <option value={5}>5 Days before</option>
                      <option value={7}>7 Days before</option>
                      <option value={10}>10 Days before</option>
                    </Select>
                  </FormControl>
                  <FormControl>
                    <FormLabel color={secondaryText}>Reminder 3</FormLabel>
                    <Select
                      id="refund_alert_3"
                      isDisabled={!enteredRefundDate}
                      variant={inputVariant}
                      {...register('refund_alert_3', {
                        shouldUnregister: true,
                      })}
                    >
                      <option value={0}>None</option>
                      <option value={1}>1 Day before</option>
                      <option value={3}>3 Days before</option>
                      <option value={5}>5 Days before</option>
                      <option value={7}>7 Days before</option>
                      <option value={10}>10 Days before</option>
                    </Select>
                  </FormControl>
                </VStack>
              </Box>
            )}
            <Box
              bg={bg}
              p={[4, 4, 6]}
              w="100%"
              borderRadius={8}
              boxShadow="rgba(0, 0, 0, 0.05) 0px 4px 6px -1px, rgba(0, 0, 0, 0.02) 0px 2px 4px -1px"
            >
              <VStack align="start" spacing={4}>
                <Heading as="h2" fontSize="18px" color={secondaryHeading}>
                  Additional Information
                </Heading>
                {paymentMethods?.length > 0 && (
                  <FormControl isInvalid={errors.payment_method_id}>
                    <FormLabel color={secondaryText}>Payment Method </FormLabel>
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
              </VStack>
            </Box>
            <Box
              py={2}
              w="100%"
              pos={['sticky', 'sticky', 'relative']}
              bottom={0}
              bg={bg}
            >
              <Button
                type="submit"
                isLoading={isLoading}
                width="100%"
                size="lg"
                colorScheme="gray"
                bg={buttonBg}
                color={'whiteAlpha.900'}
                _hover={{ background: buttonHover }}
              >
                Add Subscription
              </Button>
            </Box>
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
    </>
  )
}
