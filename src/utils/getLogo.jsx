import { popularServices } from '../data/popularServices'

export default async function getLogo(url) {
  // Search in the popularServices data first
  for (const service of popularServices) {
    if (service.website === url) {
      return service.logo
    }
  }

  // Construct the potential Clearbit logo URL
  const potentialClearbitURL = `https://logo.clearbit.com/${url}`

  // If no match in popularServices, call the API
  const response = await fetch(potentialClearbitURL)

  if (!response.ok) {
    console.error('Failed to fetch logo from Clearbit')
    return '/empty-states/light/17.svg'
  }

  const blob = await response.blob()

  // If for some reason the blob type is 'text/html', consider it an error.
  if (blob.type === 'text/html') {
    console.error('Clearbit returned HTML instead of an image')
    return '/empty-states/light/17.svg'
  }

  // If the response is successful and it's an image, return the Clearbit URL for saving in the database
  return potentialClearbitURL
}
