import {
  Box,
  Button,
  Menu,
  MenuButton,
  Flex,
  Text,
  Tooltip,
  Icon,
  IconButton,
  useColorModeValue,
} from '@chakra-ui/react'

const NavItem = ({
  active,
  icon,
  id,
  isNavExpanded,
  linkTo,
  onNewTab,
  onClick,
  title,
  hasNotification,
  color,
}) => {
  // Color mode values
  const activeColor = useColorModeValue('whiteAlpha.900', 'whiteAlpha.900')
  const tooltipColor = useColorModeValue('whiteAlpha.900', 'blackAlpha.900')
  const inactiveColor = useColorModeValue('blackAlpha.900', 'whiteAlpha.900')
  const bgActive = useColorModeValue('blackAlpha.800', 'blackAlpha.500')
  const bgActiveHover = useColorModeValue(
    { background: 'blackAlpha.800' },
    { background: 'blackAlpha.400' }
  )
  const bgInactiveHover = useColorModeValue(
    { background: 'gray.200' },
    { background: 'whiteAlpha.200' }
  )
  return isNavExpanded ? (
    <>
      {linkTo ? (
        <Box w="100%">
          <a href={linkTo} target="_blank" rel="noopener noreferrer">
            {' '}
            <Button
              id={id ? id : title}
              tabIndex={-1}
              leftIcon={icon}
              width="100%"
              py={6}
              justifyContent="start"
              variant="ghost"
              fontWeight="500"
              color={color ? color : active ? activeColor : inactiveColor}
              background={active ? bgActive : 'none'}
              _hover={active ? bgActiveHover : bgInactiveHover}
            >
              {title}
            </Button>
          </a>
        </Box>
      ) : (
        <Button
          id={id ? id : title}
          {...(linkTo ? { as: 'a', href: linkTo } : { onClick: onClick })}
          leftIcon={icon}
          width="100%"
          py={6}
          justifyContent="start"
          variant="ghost"
          fontWeight="500"
          color={color ? color : active ? activeColor : inactiveColor}
          background={active ? bgActive : 'none'}
          _hover={active ? bgActiveHover : bgInactiveHover}
        >
          {title}
        </Button>
      )}
    </>
  ) : (
    <Tooltip
      label={title}
      placement="right"
      display={isNavExpanded && 'none'}
      color={tooltipColor}
    >
      {linkTo ? (
        <Box>
          <a href={linkTo} target="_blank" rel="noopener noreferrer">
            <IconButton
              tabIndex={-1}
              id={id ? id : title}
              aria-label={title}
              icon={icon}
              size="lg"
              fontSize="21px"
              variant="ghost"
              color={active ? activeColor : inactiveColor}
              background={active ? bgActive : 'none'}
              _hover={active ? bgActiveHover : bgInactiveHover}
            />
          </a>
        </Box>
      ) : (
        <Box pos="relative">
          <IconButton
            id={id ? id : title}
            onClick={onClick}
            // {...(linkTo ? { as: 'a', href: linkTo } : { onClick: onClick })}
            aria-label={title}
            icon={icon}
            size="lg"
            fontSize="21px"
            variant="ghost"
            color={color ? color : active ? activeColor : inactiveColor}
            background={active ? bgActive : 'none'}
            _hover={active ? bgActiveHover : bgInactiveHover}
          />
          <Box
            display={hasNotification ? 'block' : 'none'}
            w={3}
            h={3}
            bg="purple.500"
            borderRadius={32}
            pos="absolute"
            top="0"
            right="0"
          />
        </Box>
      )}
    </Tooltip>
  )
}

export default NavItem
