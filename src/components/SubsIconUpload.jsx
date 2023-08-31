import { useState } from 'react'
import { useSupabaseClient } from '@supabase/auth-helpers-react'
import useUserProfile from '../hooks/useUserProfile'
import { message, Upload } from 'antd'
import {
  Button,
  VStack,
  useToast,
  Text,
  useColorModeValue,
  HStack,
  IconButton,
  Icon,
  Link,
} from '@chakra-ui/react'
import {
  BiClipboard,
  BiCrown,
  BiImage,
  BiLoader,
  BiLoaderAlt,
  BiTrashAlt,
  BiUpload,
} from 'react-icons/bi'
import useCurrentWorkspace from '../hooks/useCurrentWorkspace'

const beforeUpload = (file) => {
  console.log(file)
  const isJpgOrPng = file.type === 'image/jpeg' || file.type === 'image/png'

  if (!isJpgOrPng) {
    message.error('Only jpg/png files allowed')
  }

  // check if file size is less than 20kb
  const isLt100 = file.size / 1024 / 1024 < 0.1

  if (!isLt100) {
    message.error('Image must smaller than 100kB')
  }

  if (isJpgOrPng && isLt100) {
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => {
        const img = document.createElement('img')
        img.src = reader.result
        img.onload = () => {
          const canvas = document.createElement('canvas')
          canvas.width = 128
          canvas.height = 128
          const ctx = canvas.getContext('2d')

          // Draw the image on the canvas, starting at position (0, 0)
          // and scaling the image to fit the dimensions of the canvas.
          ctx.drawImage(img, 0, 0, 128, 128)

          // Create a blob from the data on the canvas and resolve the promise with the blob.
          canvas.toBlob((result) => resolve(result))
        }
      }
    })
  }

  return false
}

const SubsIconUpload = ({ setCustomIcon }) => {
  const supabaseClient = useSupabaseClient()
  const [userProfile, setUserProfile] = useUserProfile()
  const [loading, setLoading] = useState(false)
  const toast = useToast()
  const [currentWorkspace, setCurrentWorkspace] = useCurrentWorkspace()
  const [selectedFile, setSelectedFile] = useState(null)

  const secondaryText = useColorModeValue('blackAlpha.700', 'whiteAlpha.700')

  const uploadFile = async (file) => {
    setSelectedFile(file?.file?.name)
    const fileExt = file?.file?.name?.split('.').pop()
    // generate a unique id for the file

    const { data, error } = await supabaseClient.storage
      .from('icons-subs')
      .upload(`${currentWorkspace?.id}/${file?.file?.name}`, file.file, {
        upsert: true,
      })

    if (error) {
      setLoading(false)
      console.log('err1', error)

      if (error.error === 'Duplicate') {
        getPublicUrl(`${currentWorkspace?.id}/${file?.file?.name}`)
      }
      toast({
        title: 'Error',
        description: error.message,
        status: 'error',
        isClosable: true,
      })
    }

    if (data) {
      getPublicUrl(data.path)
    }
  }

  const getPublicUrl = async (path) => {
    // download public url
    const { data: publicUrl, error: publicUrlError } =
      await supabaseClient.storage.from('icons-subs').getPublicUrl(path)

    if (publicUrlError) {
      setLoading(false)
      console.log(publicUrlError)
      toast({
        title: 'Error',
        description: publicUrlError.message,
        status: 'error',
        isClosable: true,
      })
    }

    if (publicUrl) {
      console.log(publicUrl.publicUrl)
      setLoading(false)
      setCustomIcon(publicUrl.publicUrl)
    }
  }

  const handleIconDelete = async () => {
    setLoading(true)
    const { data, error } = await supabaseClient.storage
      .from('icons-subs')
      .remove([`${currentWorkspace?.id}/${selectedFile}`])

    if (error) {
      setLoading(false)
      console.log(error)
      toast({
        title: 'Error',
        description: error.message,
        status: 'error',
        isClosable: true,
      })
    }

    if (data) {
      console.log(data)
      setLoading(false)
      setSelectedFile(null)
      setCustomIcon(null)
    }
  }

  return (
    <>
      {currentWorkspace?.plan === 'free' || !currentWorkspace?.is_subscribed ? (
        <Link href="https://web.subly.app/pro">
          <Text
            fontSize="sm"
            fontWeight="semibold"
            color="purple.700"
            cursor="pointer"
            _hover={{
              textDecoration: 'underline',
            }}
          >
            <Icon as={BiCrown} />
            Upgrade your plan to upload custom icons
          </Text>
        </Link>
      ) : (
        <Upload
          name="icon"
          maxCount={1}
          showUploadList={false}
          customRequest={(file) => uploadFile(file)}
          beforeUpload={beforeUpload}
          // onChange={handleChange}
        >
          <Button
            isLoading={loading}
            leftIcon={<BiUpload fontSize="1.1rem" />}
            variant="outline"
            size="sm"
          >
            Upload
          </Button>
        </Upload>
      )}
      {selectedFile && (
        <HStack pt={1} justify="space-between" maxW="300px">
          <Icon as={loading ? BiLoaderAlt : BiImage} fontSize="1.1rem" />
          <Text fontSize="sm" color={secondaryText} noOfLines={1}>
            {selectedFile}
          </Text>
          <IconButton
            icon={<BiTrashAlt />}
            size="xs"
            onClick={handleIconDelete}
          />
        </HStack>
      )}
    </>
  )
}

export default SubsIconUpload
