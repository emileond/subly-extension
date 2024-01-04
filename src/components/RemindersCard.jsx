import { Card, VStack, HStack, Icon, Heading } from '@chakra-ui/react'
import { BiBell } from 'react-icons/bi'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import RemindersCardCreate from './RemindersCardCreate'

dayjs.extend(utc)

function RemindersCard({ onRemindersDataChange, subscription, locale, mode }) {
  return (
    <Card variant="outline" p={[4, 4, 6]} w="100%" maxW="500px">
      <VStack align="start" spacing={3}>
        <HStack>
          <Icon as={BiBell} fontSize="1.3rem" />
          <Heading as="h2" fontSize="18px">
            Reminders
          </Heading>
        </HStack>
        {mode === 'create' && (
          <RemindersCardCreate
            onRemindersDataChange={onRemindersDataChange}
            subscription={subscription}
            locale={locale}
          />
        )}
        {/* {mode === 'edit' && (
          <RemindersCardEdit
            onRemindersDataChange={onRemindersDataChange}
            subscription={subscription}
            locale={locale}
          />
        )}
        {mode === 'view' && (
          <RemindersCardView subscriptionId={subscription?.id} />
        )} */}
      </VStack>
    </Card>
  )
}

export default RemindersCard
