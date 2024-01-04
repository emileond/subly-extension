import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'

dayjs.extend(utc)

export function calculateUTCReminderDate(date, offsetDays) {
  const today = dayjs.utc() // Current time in UTC
  // Convert the provided date to UTC
  const providedDate = dayjs(date).utc()
  const futureDate = providedDate.subtract(offsetDays, 'day')

  // if offsetDays is <= 0, return null
  if (offsetDays <= 0) {
    return null
  }

  // Check if the future date is after today (both in UTC)
  if (futureDate.isAfter(today)) {
    return futureDate.toISOString() // Return date in ISO format (in UTC)
  }

  // Return null if the calculated date is not in the future
  return null
}

export function calculateUTCSubscriptionReminderDate(
  targetDate,
  billing_freq,
  billing_range,
  offsetDays,
  end_date = null
) {
  if (offsetDays <= 0) {
    return null
  }

  const today = dayjs.utc()
  let reminderDate = dayjs(targetDate).utc().subtract(offsetDays, 'day')

  // If reminder date is in the past, calculate the next cycle
  while (reminderDate.isBefore(today)) {
    reminderDate = reminderDate.add(billing_freq, billing_range)
  }

  // If end_date is provided and reminder date is after end_date, return null
  if (end_date && reminderDate.isAfter(dayjs(end_date).utc())) {
    return null
  }

  // Ensure the reminder date is before the end date, if provided
  if (end_date) {
    const endDate = dayjs(end_date).utc()
    while (reminderDate.isAfter(endDate)) {
      reminderDate = reminderDate.subtract(billing_freq, billing_range)
      if (reminderDate.isBefore(today)) {
        return null // No valid reminder date before today
      }
    }
  }

  return reminderDate.toISOString()
}
