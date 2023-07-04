import { useEffect, useState } from 'react'
import { useSupabaseClient } from '@supabase/auth-helpers-react'
import { useForm } from 'react-hook-form'
import EmptyState from '../components/EmptyState'
import useCurrentWorkspace from '../hooks/useCurrentWorkspace'
import useSubscriptionsData from '../hooks/useSubscriptionsData'
import useUserCategories from '../hooks/useUserCategories'
import {
  Box,
  Button,
  Divider,
  FormControl,
  FormErrorMessage,
  FormHelperText,
  FormLabel,
  Heading,
  HStack,
  Icon,
  IconButton,
  Input,
  List,
  ListItem,
  Stack,
  Text,
  Tooltip,
  useColorModeValue,
  useToast,
  VStack,
} from '@chakra-ui/react'
import { BiSearchAlt, BiEdit, BiTrashAlt } from 'react-icons/bi'

const CategoriesList = () => {
  const {
    register,
    handleSubmit,
    watch,
    resetField,
    setValue,
    onBlur,
    formState: { errors },
  } = useForm({ mode: 'onBlur' })

  const [currentWorkspace, setCurrentWorkspace] = useCurrentWorkspace()
  const [subscriptions, setSubscriptions] = useSubscriptionsData()
  const [userCategories, setUserCategories] = useUserCategories()
  const supabaseClient = useSupabaseClient()
  const toast = useToast()

  //Color mode values
  const inputBorder = useColorModeValue('gray.200', 'gray.600')
  const inputVariant = useColorModeValue('filled', 'outline')
  const secondaryText = useColorModeValue('blackAlpha.700', 'whiteAlpha.700')
  const tertiaryText = useColorModeValue('blackAlpha.600', 'whiteAlpha.600')
  const listHover = useColorModeValue('blackAlpha.50', 'gray.700')
  const buttonBg = useColorModeValue('blackAlpha.800', 'whiteAlpha.200')
  const buttonHover = useColorModeValue('blackAlpha.900', 'whiteAlpha.300')
  const modalBg = useColorModeValue('gray.50', 'gray.700')
  const bg = useColorModeValue('white', 'gray.800')

  // const [userCategories, setUserCategories] = useState([])
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [selectedItem, setSelectedItem] = useState(null)

  const enteredNewCategory = watch('new_category')
  const enteredCategory = watch('edit_category')

  const addCategory = (val, index) => {
    if (!enteredNewCategory) {
      return null
    }
    setIsLoading(true)

    if (errors.new_category) {
      setIsLoading(false)
    }
    if (!errors.new_category) {
      const newCategories = [val, ...userCategories]
      saveUserCategories(newCategories)
      resetField('new_category')
      setIsEditing(false)
    }
  }

  const updateSub = async (sub, newVal) => {
    const { data, error } = await supabaseClient
      .from('Subscriptions')
      .update({ category: newVal })
      .eq('id', sub.id)
      .select()

    if (error) {
      console.error(error)
    }
  }

  const renameCategory = async (val, index) => {
    setIsLoading(true)

    const subsInUse = subscriptions.filter(
      (sub) => sub.category === userCategories[index]
    )

    if (errors.edit_category) {
      setIsLoading(false)
    }
    if (!errors.edit_category) {
      if (subsInUse.length) {
        await Promise.all(subsInUse.map((sub) => updateSub(sub, val))).then(
          () => {
            const newCategories = userCategories.map((item, i) => {
              return i === index ? val : item
            })
            saveUserCategories(newCategories)
            setIsEditing(false)
          }
        )
      } else {
        const newCategories = userCategories.map((item, i) => {
          return i === index ? val : item
        })
        saveUserCategories(newCategories)
        setIsEditing(false)
      }
    }
  }

  const removeCategory = (index) => {
    const newCategories = userCategories.filter(
      (item, itemIndex) => itemIndex !== index
    )
    saveUserCategories(newCategories)
  }

  const saveUserCategories = async (categories) => {
    const newCategoriesSorted = categories?.sort((a, b) => a.localeCompare(b))
    const { data, error } = await supabaseClient
      .from('workspaces')
      .update({ categories: newCategoriesSorted })
      .eq('id', currentWorkspace?.id)
      .select()
      .single()

    if (data) {
      setUserCategories(newCategoriesSorted)
      setIsLoading(false)
      toast({
        title: `Changes saved`,
        status: 'success',
        duration: 5000,
        isClosable: true,
      })
    }

    if (error) {
      console.error(error)
      setIsLoading(false)
    }
  }

  // Set input value to the corresponding label for each category
  useEffect(() => {
    if (selectedItem !== null) {
      setValue('edit_category', userCategories[selectedItem])
    }
  }, [selectedItem])

  return (
    <>
      <VStack position="sticky" top={0} zIndex={1} py={4} w="100%" bg={modalBg}>
        <HStack w="100%" spacing={3}>
          <FormControl isInvalid={errors?.new_category}>
            <FormLabel display="none">Add Category</FormLabel>
            <Input
              onBlur={onBlur}
              autoFocus
              autoComplete="off"
              id="new_category"
              {...register('new_category', {
                minLength: {
                  value: 2,
                  message: 'Must be at least 2 characters',
                },
                maxLength: {
                  value: 40,
                  message: 'Must be less than 40 characters',
                },
                pattern: {
                  value:
                    /^[a-zA-Z0-9 \-. \s/!@#$&*'+()\u00C0-\u1FFF\u2800-\uFFFD]+$/,
                  message: 'Some special characters are not allowed',
                },
              })}
              variant={inputVariant}
              placeholder="Enter new category"
              borderColor={inputBorder}
            />
            <FormErrorMessage>
              {errors.new_category && errors.new_category.message}
            </FormErrorMessage>
          </FormControl>
          <Button
            variant="outline"
            aria-label="Add category"
            isLoading={isLoading}
            colorScheme="gray"
            bg={buttonBg}
            color={'whiteAlpha.900'}
            _hover={{ background: buttonHover }}
            onClick={() => addCategory(enteredNewCategory)}
          >
            Add new
          </Button>
        </HStack>
        <Divider />
      </VStack>
      <List w="100%">
        {userCategories?.length ? (
          <>
            <Text fontSize="sm" color={tertiaryText} py={1} casing="uppercase">
              {userCategories?.length} Categories
            </Text>
            {userCategories?.map((item, index, array) => (
              <ListItem key={item + index} px={4} py={0} borderRadius={8}>
                <Stack
                  flexDir={['column', 'column', 'row']}
                  justifyContent="space-between"
                  align="center"
                  py={4}
                  spacing={1}
                >
                  {isEditing && selectedItem === index ? (
                    <>
                      <FormControl py={4} isInvalid={errors.edit_category}>
                        <FormLabel display="none">Category</FormLabel>
                        <Input
                          onBlur={onBlur}
                          maxW={['100%', '100%', 'max-content']}
                          {...register('edit_category', {
                            minLength: {
                              value: 2,
                              message: 'Must be at least 2 characters',
                            },
                            maxLength: {
                              value: 40,
                              message: 'Must be less than 40 characters',
                            },
                            pattern: {
                              value:
                                /^[a-zA-Z0-9 \-. \s/!@#$&*'+()\u00C0-\u1FFF\u2800-\uFFFD]+$/,
                              message:
                                'Some special characters are not allowed',
                            },
                          })}
                          autoComplete="off"
                          variant={inputVariant}
                          placeholder={item}
                          borderColor={inputBorder}
                        />
                        <FormErrorMessage>
                          {errors.edit_category && errors.edit_category.message}
                        </FormErrorMessage>
                        <FormHelperText>
                          {' '}
                          {subscriptions?.filter((sub) => sub.category === item)
                            .length === 0
                            ? `Not used`
                            : `${
                                subscriptions?.filter(
                                  (sub) => sub.category === item
                                ).length
                              } subscriptions`}
                        </FormHelperText>
                      </FormControl>
                      <HStack justifyContent="end" spacing={2}>
                        <Button
                          variant="outline"
                          aria-label="Edit category"
                          onClick={() => {
                            setIsEditing(false)
                          }}
                        >
                          Cancel
                        </Button>
                        <Button
                          variant="outline"
                          aria-label="Save changes"
                          isLoading={isLoading}
                          colorScheme="gray"
                          bg={buttonBg}
                          color={'whiteAlpha.900'}
                          _hover={{ background: buttonHover }}
                          onClick={() => {
                            renameCategory(enteredCategory, index)
                          }}
                        >
                          Save
                        </Button>
                      </HStack>
                    </>
                  ) : (
                    <>
                      <HStack spacing={4} py={3}>
                        <VStack align="start" spacing={0}>
                          <Heading size="sm">{item}</Heading>
                          <Text color={secondaryText} fontSize="sm">
                            {subscriptions?.filter(
                              (sub) => sub.category === item
                            ).length === 0
                              ? `Not used`
                              : `${
                                  subscriptions?.filter(
                                    (sub) => sub.category === item
                                  ).length
                                } subscriptions`}
                          </Text>
                        </VStack>
                      </HStack>
                      <HStack justifyContent="end" spacing={3}>
                        <Tooltip label="Edit category">
                          <IconButton
                            variant="outline"
                            aria-label="Edit category"
                            icon={<BiEdit size={21} />}
                            onClick={() => {
                              setSelectedItem(index)
                              setIsEditing(true)
                            }}
                          />
                        </Tooltip>
                        <Tooltip label="Delete category">
                          <IconButton
                            variant="outline"
                            aria-label="Delete category"
                            colorScheme="red"
                            icon={<BiTrashAlt size={21} />}
                            onClick={() => {
                              removeCategory(index)
                            }}
                          />
                        </Tooltip>
                      </HStack>
                    </>
                  )}
                </Stack>
                <Divider />
              </ListItem>
            ))}
          </>
        ) : (
          <Box pt={12} pb={4} textAlign="center">
            <Icon as={BiSearchAlt} fontSize="5xl" color="gray.500" />
            <EmptyState
              heading={`Search for a service to add`}
              desc="Search for a service or add a new one from scratch"
              size="lg"
            />
          </Box>
        )}
      </List>
    </>
  )
}

export default CategoriesList
