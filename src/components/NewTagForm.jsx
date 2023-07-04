import { useState } from 'react'
import {
  Button,
  FormControl,
  FormErrorMessage,
  FormHelperText,
  FormLabel,
  Input,
  VStack,
  useToast,
} from '@chakra-ui/react'
import { useForm } from 'react-hook-form'
import { useSupabaseClient } from '@supabase/auth-helpers-react'
import useCurrentWorkspace from '../hooks/useCurrentWorkspace'
import useTags from '../hooks/useTags'

const NewTagForm = ({ tag, onModalClose }) => {
  const supabaseClient = useSupabaseClient()
  const [currentWorkspace] = useCurrentWorkspace()
  const [tags, setTags] = useTags()
  const [isLoading, setIsLoading] = useState(false)
  const toast = useToast()

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: {
      name: tag,
    },
  })

  const onSubmit = async (data) => {
    setIsLoading(true)
    const { name } = data
    const { data: newTag, error } = await supabaseClient
      .from('tags')
      .insert([{ name, workspace_id: currentWorkspace.id }])
      .select()

    if (error) {
      setIsLoading(false)
      console.error(error)
    }
    if (newTag) {
      toast({
        title: 'Tag created',
        status: 'success',
        duration: 3000,
        isClosable: true,
      })
      setIsLoading(false)
      setTags([...tags, newTag[0]])
      reset({
        name: null,
      })
      onModalClose()
    }
  }

  return (
    <>
      <VStack as="form" py={4} onSubmit={handleSubmit(onSubmit)} spacing={8}>
        <FormControl isInvalid={errors?.name}>
          <FormLabel htmlFor="name">Tag name</FormLabel>
          <Input
            id="name"
            autoComplete="off"
            type="text"
            placeholder="Enter tag name"
            {...register('name', {
              required: true,
            })}
          />
          <FormErrorMessage>
            {errors?.name && 'Name is required'}
          </FormErrorMessage>
        </FormControl>
        <Button width="full" isLoading={isLoading} type="submit">
          Create tag
        </Button>
      </VStack>
    </>
  )
}

export default NewTagForm
