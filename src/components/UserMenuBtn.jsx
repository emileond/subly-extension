import { BiChevronDown, BiMenu } from 'react-icons/bi'
import Avatar from './Avatar'
import {
  Button,
  HStack,
  MenuButton,
  Text,
  useColorModeValue,
} from '@chakra-ui/react'

const UserMenuBtn = ({ menu }) => {
  const bg = useColorModeValue('white', 'gray.800')
  return menu ? (
    <MenuButton
      minW="90px"
      as={Button}
      variant="outline"
      size="md"
      rightIcon={<BiMenu fontSize="1.2rem" />}
      leftIcon={<Avatar size="xs" />}
      borderRadius={24}
      bg={bg}
    />
  ) : (
    <Button
      as={HStack}
      minW="90px"
      variant="outline"
      size="md"
      rightIcon={<BiMenu fontSize="1.2rem" />}
      leftIcon={<Avatar size="xs" />}
      borderRadius={24}
      bg={bg}
    />
  )
}

export default UserMenuBtn
