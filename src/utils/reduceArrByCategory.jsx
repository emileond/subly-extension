const convertCost = (billingRange, billingFreq, cost) => {
  if (billingFreq === 0) return 0
  if (!billingRange) return cost
  switch (billingRange) {
    case 'day':
      return (cost * 365) / billingFreq
    case 'week':
      return (cost * 52) / billingFreq
    case 'month':
      return (cost * 12) / billingFreq
    case null:
    case 'year':
      return cost
    default:
      return cost
  }
}
export const reduceArrByCategory = arr => {
  // create a new array of active subscriptions with the same category and sum the cost
  const activeSubsByCategory = arr?.reduce((acc, curr) => {
    const category = curr.category
    let cost = 0
    if (curr.billing_range && curr.billing_freq) {
      cost = convertCost(curr.billing_range, curr.billing_freq, curr.cost)
    } else {
      cost = curr.cost
    }
    if (acc[category]) {
      acc[category] += cost
    } else {
      acc[category] = cost
    }
    return acc
  }, {})

  // iterate activeSubsByCategory and create a new array of objects with the category and cost
  const chartData = Object.keys(activeSubsByCategory)?.map(key => {
    const sumValues = Object.values(activeSubsByCategory)?.reduce(
      (a, b) => a + b
    )

    return {
      id: key,
      label: key,
      value: sumValues
        ? parseFloat((activeSubsByCategory[key] / sumValues)?.toFixed(2))
        : 0,
      cost: parseFloat(activeSubsByCategory[key]?.toFixed(2))
    }
  })

  return chartData
}
