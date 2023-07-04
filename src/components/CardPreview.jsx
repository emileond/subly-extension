import {
  Box,
  Button,
  Heading,
  HStack,
  Flex,
  IconButton,
  Stat,
  StatNumber,
  StatHelpText,
  Text,
  VStack,
  Image,
} from '@chakra-ui/react'
import { rgbDataURL } from '../utils/rgbDataURL'
import { colorContrast } from '../utils/colorContrast'
import { BiUpload } from 'react-icons/bi'
import { numberFormatter } from '../utils/numberFormatter'

function CardPreview({
  title,
  subscriptionLogo,
  subscriptionCategory,
  subscriptionCost,
  subscriptionBillingPeriod,
  cardColor,
  subscriptionCurrency,
  isRecurring,
}) {
  const gradients = {
    white:
      'linear-gradient(337deg, rgba(252,252,252,1) 0%, rgba(248,248,250,1) 100%)',
    red: 'linear-gradient(337deg, rgba(218,68,83,1) 0%, rgba(140,22,78,1) 100%)',
    green: 'linear-gradient(135deg, #32a56f 0%, #30BA4A 100%)',
    blue: 'linear-gradient(337deg, rgba(57,149,252,1) 0%, rgba(43,71,236,1) 100%)',
    purple:
      'linear-gradient(337deg, rgba(160,68,255,1) 0%, rgba(106,48,147,1) 100%)',
    pink: 'linear-gradient(337deg, #F95B62 0%, #B92981 100%)',
    gray: 'linear-gradient(337deg, rgba(73,80,87,1) 0%, rgba(33,37,41,1) 100%)',
    orange: 'linear-gradient(337deg, #fc4a1a 0%, #F08A4B 100%)',
    yellow: 'linear-gradient(337deg, #F3CA40 0%, #FDD03B 100%)',
  }

  const gradientsHex = {
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

  return (
    <Flex
      alignItems="center"
      justifyContent="space-between"
      px={6}
      py={6}
      borderRadius={20}
      bg={gradients[cardColor] ? gradients[cardColor] : cardColor}
      textAlign="center"
      pos="relative"
      overflow="hidden"
      transition="all .25s"
      boxShadow="md"
      _hover={{
        boxShadow: 'lg',
      }}
      w="100%"
    >
      <Box
        pos="absolute"
        top="0"
        left="0"
        overflow="hidden"
        width="100%"
        height="100%"
      >
        <Box
          _before={{
            top: '-145px',
            right: '-5px',
            width: '210px',
            height: '210px',
            content: '""',
            opacity: 0.3,
            position: 'absolute',
            background:
              gradients[cardColor] && cardColor !== 'white'
                ? `${cardColor}.700`
                : 'blackAlpha.200',
            backgroundBlendMode: 'color',
            borderRadius: '50%',
          }}
          _after={{
            top: '-95px',
            right: '-95px',
            width: '210px',
            height: '210px',
            content: '""',
            opacity: 0.5,
            position: 'absolute',
            background:
              gradients[cardColor] && cardColor !== 'white'
                ? `${cardColor}.500`
                : 'blackAlpha.100',
            backgroundBlendMode: 'color',
            borderRadius: '50%',
          }}
        ></Box>
      </Box>
      <HStack alignItems="center">
        <VStack spacing={0} justify="center">
          <Box
            borderRadius="32px"
            bg="gray.100"
            overflow="hidden"
            w="48px"
            h="48px"
            minW="48px"
            minH="48px"
            pos="relative"
          >
            <Image
              src={
                subscriptionLogo
                  ? subscriptionLogo
                  : '/empty-states/light/17.svg'
              }
              placeholder="blur"
              blurDataURL={rgbDataURL(2, 129, 210)}
              alt="Subscription logo"
              fill
              sizes="48px"
            />
          </Box>
        </VStack>
        <Box
          textAlign="left"
          color={
            gradients[cardColor]
              ? colorContrast(gradientsHex[cardColor], 'y')
              : colorContrast(cardColor, 'y')
          }
          maxW="70%"
        >
          <Heading as="h3" size="md" noOfLines={1} mb={1}>
            {title ? title : 'Subscription'}
          </Heading>
          <Text>{subscriptionCategory}</Text>
        </Box>
      </HStack>
      <VStack zIndex={1} align="end" spacing={1} minW="fit-content">
        <Heading
          size="md"
          noOfLines={1}
          color={
            gradients[cardColor]
              ? colorContrast(gradientsHex[cardColor], 'y')
              : colorContrast(cardColor, 'y')
          }
          // display="inline-block"
        >
          {subscriptionCurrency?.symbol}
          {subscriptionCost ? numberFormatter(subscriptionCost) : 0}
        </Heading>
        <Text
          // display="inline-block"
          fontSize="sm"
          color={
            gradients[cardColor]
              ? colorContrast(gradientsHex[cardColor], 'y')
              : colorContrast(cardColor, 'y')
          }
        >
          / {subscriptionBillingPeriod}
        </Text>
      </VStack>
    </Flex>
  )
}

export default CardPreview
