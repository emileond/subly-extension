import {
  Heading,
  Box,
  Text,
  Button,
  useColorModeValue,
  Stack,
  VStack
} from '@chakra-ui/react'
import Image from 'next/image'

const EmptyState = ({
  img,
  heading,
  desc,
  cta,
  ctaClick,
  size,
  orientation,
  headingSize
}) => {
  const imgSize = {
    md: ['60%', '32%', '22%', '17%', '17%', '17%'],
    lg: ['60%', '40%', '35%', '30%'],
    xl: ['70%', '70%', '60%', '55%', '50%', '50%']
  }

  // Color mode values
  const primaryText = useColorModeValue('blackAlpha.800', 'whiteAlpha.900')
  const secondaryText = useColorModeValue('blackAlpha.700', 'whiteAlpha.700')
  const imgSrc = useColorModeValue(
    `/empty-states/light/${img}.svg`,
    `/empty-states/dark/${img}.svg`
  )

  return (
    <Stack
      p={4}
      w="100%"
      direction={orientation ? 'row' : 'column'}
      align="center"
      spacing={4}
      justify="center"
    >
      {img && (
        <Box display="block" w={size ? imgSize[size] : imgSize.md}>
          <Image
            src={imgSrc}
            width={125}
            height={100}
            sizes="100vw"
            alt="Empty state image."
            style={{
              width: '100%',
              height: 'auto'
            }}
          />
        </Box>
      )}
      <VStack
        align={orientation ? 'start' : 'center'}
        spacing={2}
        textAlign={orientation ? 'left' : 'center'}
      >
        <Heading
          as="h2"
          size={headingSize ? headingSize : 'md'}
          color={primaryText}
        >
          {heading}
        </Heading>
        <Text mt={4} mb={6} color={secondaryText}>
          {desc}
        </Text>
        {cta ? <Button onClick={ctaClick}>{cta}</Button> : null}
      </VStack>
    </Stack>
  )
}

export default EmptyState
