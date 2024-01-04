import { useEffect, useState } from 'react'
import { useForm, useFieldArray, useWatch } from 'react-hook-form'
import {
  Box,
  VStack,
  HStack,
  Icon,
  FormControl,
  Select,
  NumberInput,
  NumberInputField,
  Button,
  Text,
  IconButton,
  FormHelperText,
  Divider,
} from '@chakra-ui/react'
import { BiAlarm, BiX } from 'react-icons/bi'
import EmptyState from './EmptyState'
import {
  calculateUTCReminderDate,
  calculateUTCSubscriptionReminderDate,
} from '../utils/calculateUTCReminderDate'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'

dayjs.extend(utc)

function RemindersCardCreate({ onRemindersDataChange, subscription, locale }) {
  let nextPaymentDate,
    refund_deadline,
    renewal_date,
    end_date,
    billing_freq,
    billing_range
  if (subscription) {
    ;({
      nextPaymentDate,
      refund_deadline,
      renewal_date,
      end_date,
      billing_freq,
      billing_range,
    } = subscription)
  }

  const {
    register,
    control,
    formState: { errors },
    reset,
  } = useForm({
    defaultValues: {
      reminders: [
        {
          reminder_offset: 5,
          reminder_type: '',
        },
      ],
    },
    mode: 'onChange',
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'reminders',
  })

  const watchedReminders = useWatch({
    control,
    name: 'reminders',
  })

  const [remindersData, setRemindersData] = useState([])

  useEffect(() => {
    const calculateRemindersData = () => {
      return watchedReminders.map((reminder, index) => {
        const isOffsetInvalid = !reminder.reminder_offset // Check if reminder_offset is empty
        const isTypeInvalid = !reminder.reminder_type // Check if reminder_type is empty

        const reminderDate = getReminderDate(
          reminder.reminder_type,
          reminder.reminder_offset
        )
        const isDateInvalid = reminderDate === null

        // Determine the error message based on the type of validation failure
        let errorMessage = ''
        if (isOffsetInvalid || isTypeInvalid) {
          errorMessage = 'Required fields are missing.'
        } else if (isDateInvalid) {
          errorMessage =
            'Reminder set in the past, reduce the days before the event or adjust the dates.'
        }

        return {
          ...reminder,
          reminderDate: reminderDate,
          isInvalid: isOffsetInvalid || isTypeInvalid || isDateInvalid,
          error: errorMessage,
          id: reminder.id || null,
        }
      })
    }

    const newRemindersData = calculateRemindersData()
    setRemindersData(newRemindersData)

    // To prevent the infinite loop, only call the callback when the reminders data actually changes
    if (JSON.stringify(newRemindersData) !== JSON.stringify(remindersData)) {
      onRemindersDataChange && onRemindersDataChange(newRemindersData)
    }
  }, [
    watchedReminders,
    nextPaymentDate,
    refund_deadline,
    renewal_date,
    end_date,
    billing_freq,
    billing_range,
    ,
    onRemindersDataChange,
  ])

  const getReminderDate = (type, offset) => {
    switch (type) {
      case 'nextPaymentDate':
        return calculateUTCSubscriptionReminderDate(
          nextPaymentDate,
          billing_freq,
          billing_range,
          offset,
          end_date
        )
      case 'refund_deadline':
        return calculateUTCReminderDate(refund_deadline, offset)
      case 'renewal_date':
        return calculateUTCReminderDate(renewal_date, offset)
      case 'end_date':
        return calculateUTCReminderDate(end_date, offset)
      default:
        return null
    }
  }

  // Function to determine the error message]
  const getErrorMessage = (index) => {
    if (errors.reminders?.[index]?.reminder_offset) {
      return errors.reminders[index].reminder_offset.message
    }
    if (remindersData[index]?.isInvalid) {
      return remindersData[index].error
    }
    return ''
  }

  return (
    <>
      <Text fontSize="sm" pb={2}>
        Set up to 5 reminders for important billing dates
      </Text>
      {nextPaymentDate || refund_deadline || renewal_date || end_date ? (
        <VStack align="start" spacing={5} w="100%" as="form">
          {fields.length > 0 &&
            fields.map((field, index) => {
              const errorMessage = getErrorMessage(index)
              return (
                <>
                  <FormControl
                    key={index}
                    isInvalid={
                      errors.reminders?.[index]?.reminder_offset ||
                      errors.reminders?.[index]?.reminder_type ||
                      remindersData[index]?.isInvalid
                    }
                  >
                    <HStack align="center" w="100%">
                      <NumberInput maxW="60px">
                        <NumberInputField
                          px={2}
                          {...register(`reminders.${index}.reminder_offset`, {
                            required: {
                              value: true,
                              message: 'Required',
                            },
                            min: {
                              value: 1,
                              message: 'Min. 1 day before',
                            },
                            max: {
                              value: 90,
                              message: 'Max. 90 days before',
                            },
                          })}
                        />
                      </NumberInput>
                      <Box w="max-content">
                        <Text w="max-content" fontSize="14px">
                          days before
                        </Text>
                      </Box>
                      <Select
                        placeholder="Select date"
                        {...register(`reminders.${index}.reminder_type`, {
                          required: {
                            value: true,
                            message: 'Required',
                          },
                        })}
                      >
                        {nextPaymentDate && (
                          <option value="nextPaymentDate">Next Payment</option>
                        )}
                        {refund_deadline && (
                          <option value="refund_deadline">
                            Refund Deadline
                          </option>
                        )}

                        {renewal_date && (
                          <option value="renewal_date">
                            Contract Renewal Date
                          </option>
                        )}
                        {end_date && <option value="end_date">End Date</option>}
                      </Select>
                      <IconButton
                        aria-label="Remove reminder"
                        icon={<BiX fontSize="1.2rem" />}
                        variant="ghost"
                        onClick={() => remove(index)}
                      />
                    </HStack>

                    {remindersData[index]?.reminderDate && (
                      <FormHelperText>
                        <HStack>
                          <Icon
                            as={BiAlarm}
                            fontSize="1.1rem"
                            color="gray.500"
                          />
                          <Text fontSize="sm">
                            Next on{' '}
                            {Intl.DateTimeFormat(locale, {
                              dateStyle: 'medium',
                            }).format(
                              dayjs(remindersData[index].reminderDate).local()
                            )}
                          </Text>
                        </HStack>
                      </FormHelperText>
                    )}
                    <Text color="red.500" fontSize="sm">
                      {errorMessage}
                    </Text>
                  </FormControl>
                  <Divider />
                </>
              )
            })}
          <Button
            size="sm"
            variant="ghost"
            colorScheme="blue"
            isDisabled={fields.length >= 5}
            onClick={() => append({ reminder_offset: 5, reminder_type: '' })}
          >
            Add reminder
          </Button>
        </VStack>
      ) : (
        <EmptyState desc="Add billing dates to set reminders" size="md" />
      )}
    </>
  )
}

export default RemindersCardCreate
