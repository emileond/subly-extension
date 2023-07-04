// theme.js

// 1. import `extendTheme` function
import { extendTheme } from '@chakra-ui/react'
import { withProse } from '@nikolovlazar/chakra-ui-prose'

// 2. Add your color mode config
const config = {
  initialColorMode: 'light',
  useSystemColorMode: false,
}

const colors = {
  blue: {
    50: '#F2F9FF',
    100: '#CFE9FE',
    200: '#ADD8FC',
    300: '#6DB8F7',
    400: '#399AEF',
    500: '#1380E4',
    600: '#006AD3',
    700: '#005BBD',
    800: '#004AA3',
    900: '#003B87',
  },
  purple: {
    50: '#F6F2FF',
    100: '#E7DBFD',
    200: '#D8C4FC',
    300: '#BA98F6',
    400: '#9F73ED',
    500: '#8A56DF',
    600: '#7740CC',
    700: '#6530B2',
    800: '#532394',
    900: '#421973',
  },
  red: {
    50: '#FFF2F2',
    100: '#FCCACB',
    200: '#F7A2A5',
    300: '#EF8084',
    400: '#E4636A',
    500: '#D44D56',
    600: '#C03B48',
    700: '#A62D3C',
    800: '#882131',
    900: '#691827',
  },
  green: {
    50: '#e8f5e9',
    100: '#c8e6c9',
    200: '#a5d6a7',
    300: '#81c784',
    400: '#66bb6a',
    500: '#4caf50',
    600: '#43a047',
    700: '#388e3c',
    800: '#2e7d32',
    900: '#1b5e20',
  },
  brand: {
    50: '#EEFFF4',
    100: '#81F4BF',
    200: '#1DE9B6',
    300: '#00C69B',
    400: '#00C69B',
    500: '#005C40',
  },
}

const styles = {
  global: (props) => ({
    'h1, h2': {
      color: props.colorMode === 'dark' ? 'whiteAlpha.900' : 'blackAlpha.900',
    },
  }),
}

// 3. extend the theme
const theme = extendTheme(
  { config, colors, styles },
  withProse({
    baseStyle: {
      a: {
        fontWeight: 500,
        transitionProperty: 'common',
        transitionDuration: 'fast',
        transitionTimingFunction: 'ease-out',
        cursor: 'pointer',
        textDecoration: 'none',
        outline: 'none',
        color: 'blue.500',
      },
      h1: {
        fontSize: '4xl',
        fontWeight: 'bold',
        mt: 0,
        mb: 4,
        lineHeight: 'short',
      },
      h2: {
        fontSize: '2xl',
        fontWeight: 'bold',
        mt: 0,
        mb: 3,
        lineHeight: 'short',
      },
      h3: {
        fontSize: 'xl',
        fontWeight: 'semibold',
        mt: 0,
        mb: 2,
        lineHeight: 'short',
      },
      h4: {
        fontSize: 'md',
        fontWeight: 'semibold',
        mt: 0,
        mb: 0,
        lineHeight: 'short',
      },
    },
  })
)

export default theme
