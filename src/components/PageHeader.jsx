import {
  Box,
  Button,
  Heading,
  IconButton,
  useColorModeValue,
  HStack,
} from '@chakra-ui/react'
import { BiLeftArrowAlt, BiPlus } from 'react-icons/bi'

const PageHeader = ({
  heading,
  primaryAction,
  primaryCTA,
  children,
  isLoading,
}) => {
  // Color mode values
  const bg = useColorModeValue('white', 'gray.700')
  const buttonBg = useColorModeValue('blackAlpha.800', 'whiteAlpha.100')
  const buttonHover = useColorModeValue(
    {
      background: 'blackAlpha.900',
    },
    {
      background: 'whiteAlpha.300',
    }
  )

  return (
    <HStack w="100%" py={8} alignItems="center" justifyContent="space-between">
      <HStack>
        {heading && (
          <Heading as="h1" size="md" noOfLines={1}>
            {heading}
          </Heading>
        )}
      </HStack>

      <HStack spacing={3}>
        <Box>{children}</Box>
        {primaryAction && (
          <Button
            size={['sm', 'sm', 'md']}
            color={'white'}
            bg={buttonBg}
            onClick={primaryAction}
            _hover={buttonHover}
            leftIcon={<BiPlus />}
            isLoading={isLoading}
          >
            {primaryCTA ? primaryCTA : 'Add'}
          </Button>
        )}
      </HStack>
    </HStack>
  )
}

export default PageHeader
