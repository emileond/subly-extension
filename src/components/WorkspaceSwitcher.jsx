import useWorkspaces from '../hooks/useWorkspaces'
import useCurrentWorkspace from '../hooks/useCurrentWorkspace'
import {
  Button,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Text,
  useColorModeValue,
  IconButton,
  Tooltip,
} from '@chakra-ui/react'
import { BiBuildings, BiChevronDown, BiCheck } from 'react-icons/bi'

const WorkspaceSwitcher = ({ isNavExpanded }) => {
  const [workspaces, setWorkspaces] = useWorkspaces()
  const [currentWorkspace, setCurrentWorkspace] = useCurrentWorkspace()

  // color mode values
  const tertiaryText = useColorModeValue('blackAlpha.600', 'whiteAlpha.600')
  const secondaryText = useColorModeValue('blackAlpha.700', 'whiteAlpha.700')

  const handleSelectWorkspace = (item) => {
    setCurrentWorkspace(item)
  }

  return workspaces?.length > 1 ? (
    <>
      <Menu maxW="fit-content">
        {isNavExpanded ? (
          <MenuButton
            as={Button}
            w="100%"
            color={secondaryText}
            leftIcon={<BiBuildings fontSize="1.3rem" />}
            rightIcon={
              isNavExpanded ? <BiChevronDown fontSize="1.3rem" /> : null
            }
            variant="outline"
            maxW="100%"
            textAlign="left"
          >
            {isNavExpanded &&
              (currentWorkspace?.name
                ? currentWorkspace?.name
                : currentWorkspace?.id)}
          </MenuButton>
        ) : (
          <Tooltip label="Change Workspace" placement="right">
            <MenuButton
              as={IconButton}
              color={secondaryText}
              icon={<BiBuildings fontSize="1.3rem" />}
              variant="outline"
              maxW="100%"
            >
              {isNavExpanded && (
                <Text
                  fontSize="sm"
                  fontWeight="500"
                  noOfLines={1}
                  color={secondaryText}
                >
                  {currentWorkspace?.name
                    ? currentWorkspace?.name
                    : currentWorkspace?.id}
                </Text>
              )}
            </MenuButton>
          </Tooltip>
        )}
        {workspaces?.length > 1 && (
          <MenuList>
            {workspaces?.map((item) => {
              const isCurrentWorkspace = item.id === currentWorkspace?.id
              return (
                <MenuItem
                  key={item.id}
                  onClick={() => handleSelectWorkspace(item)}
                  icon={
                    isCurrentWorkspace ? (
                      <BiCheck fontSize="1.2rem" />
                    ) : (
                      <BiCheck fontSize="1.2rem" opacity={0} />
                    )
                  }
                >
                  {isCurrentWorkspace
                    ? currentWorkspace?.name
                      ? currentWorkspace?.name
                      : currentWorkspace?.id
                    : item?.name
                    ? item?.name
                    : item?.id}
                </MenuItem>
              )
            })}
          </MenuList>
        )}
      </Menu>
    </>
  ) : null
}

export default WorkspaceSwitcher
