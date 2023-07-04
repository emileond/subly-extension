export const getAbbreviation = term => {
  if (!term) {
    return null
  }
  if (term === 'day') {
    return 'd'
  }
  if (term === 'week') {
    return 'wk'
  }
  if (term === 'month') {
    return 'mo'
  }
  if (term === 'year') {
    return 'yr'
  }
}
