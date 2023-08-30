import { useState, useEffect } from 'react'
import { Box, useToast, useColorModeValue, Image } from '@chakra-ui/react'
import useUserProfile from '../hooks/useUserProfile'
import { useSupabaseClient } from '@supabase/auth-helpers-react'

export default function Avatar({ size }) {
  const supabaseClient = useSupabaseClient()
  const avatarBorder = useColorModeValue('gray.300', 'gray.600')
  const [userProfile, setUserProfile] = useUserProfile()
  const [imageUrl, setImageUrl] = useState()
  const toast = useToast()
  const sizeOptions = {
    xs: '24px',
    sm: '32px',
    md: '48px',
    lg: '64px',
    xl: '80px',
  }
  async function downloadImage(path) {
    try {
      const { data, error } = await supabaseClient.storage
        .from('avatars')
        .download(path)
      if (error) {
        console.error(error)
      }
      if (data) {
        console.log('avatar updated')
      }
      const url = URL.createObjectURL(data)
      setImageUrl(url)
    } catch (error) {
      toast({
        title: 'Error',
        description: `${error.message} ${path}`,
        status: 'error',
        isClosable: true,
      })
    }
  }

  useEffect(() => {
    if (userProfile?.avatar && !imageUrl) {
      downloadImage(userProfile?.avatar)
    }
  }, [userProfile])

  return (
    <Image
      src={imageUrl ? imageUrl : '/avatar.png'}
      boxSize={sizeOptions[size]}
      borderRadius="full"
      border={`2px solid ${avatarBorder}`}
    />
  )
}
