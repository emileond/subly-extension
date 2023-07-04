export const sortArray = (arr, sortBy) => {
  const sorted = arr.sort((a, b) => {
    if (sortBy === 'name') return a?.name?.localeCompare(b?.name)
    if (sortBy === 'cost-high') return a?.cost - b?.cost
    if (sortBy === 'cost-low') return b?.cost - a?.cost
    if (sortBy === 'category') return a?.category?.localeCompare(b?.category)
  })

  return sorted
}
