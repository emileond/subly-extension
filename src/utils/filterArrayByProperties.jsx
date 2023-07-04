export const filterArrayByProperties = (arr, set1, set2, set3, set4, set5) => {
  const f1 = set1?.length
  const f2 = set2?.length
  const f3 = set3?.length
  const f4 = set4?.length
  const f5 = set5?.length

  const filtered = arr?.filter(item => {
    return (
      (f1 ? set1?.includes(item.category) : !set1?.includes(item.category)) &&
      (f2
        ? set2?.includes(item.billingPeriod)
        : !set2?.includes(item.billingPeriod)) &&
      (f3
        ? set3?.includes(`${item.payment_method_id}`)
        : !set3?.includes(`${item.payment_method_id}`)) &&
      // search for tags in the tags array
      (f4
        ? item.tags?.some(tag => set4?.includes(`${tag}`))
        : !item.tags?.some(tag => set4?.includes(`${tag}`))) &&
      (f5 ? set5?.includes(item.cardColor) : !set5?.includes(item.cardColor))
    )
  })

  return filtered
}
