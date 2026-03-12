/* global chrome */
import { useMemo, useState } from 'react'
import { useUser } from '@supabase/auth-helpers-react'
import { FiCheckCircle } from 'react-icons/fi'
import {
  Alert,
  AlertDescription,
  AlertIcon,
  Box,
  Button,
  Card,
  FormControl,
  FormLabel,
  Heading,
  Icon,
  Link,
  Select,
  Text,
  VStack,
  useColorModeValue,
  useToast,
} from '@chakra-ui/react'
import useProjects from '../hooks/useProjects'
import useCurrentProject from '../hooks/useCurrentProject'
import useCurrentWorkspace from '../hooks/useCurrentWorkspace'

const APPSUMO_HISTORY_URL = 'https://appsumo.com/account/history/?page=1'
const APPSUMO_HISTORY_PATH = '/account/history'
const APPSUMO_IMPORT_ENDPOINT = 'https://web.subly.app/api/ai/analyze-appsumo-data'

function collectAppsumoHistoryFromPage() {
  const historyPath = '/account/history'
  const cleanText = (value = '') => value.replace(/\s+/g, ' ').trim()
  const toAbsoluteUrl = (href) => {
    try {
      return new URL(href, window.location.origin).toString()
    } catch {
      return ''
    }
  }

  const readPageNumber = (urlValue) => {
    try {
      const parsedUrl = new URL(urlValue, window.location.origin)
      const pageParam = parsedUrl.searchParams.get('page')
      const numericPage = Number.parseInt(pageParam || '1', 10)
      return Number.isNaN(numericPage) ? 1 : numericPage
    } catch {
      return 1
    }
  }

  const extractPaginationPages = (doc) => {
    const pages = new Set()
    const nodes = Array.from(
      doc?.querySelectorAll(
        '.pagination a[href], .pagination [data-page], .pagination .page-link, nav[aria-label*="Navigate"] a[href]'
      )
    )

    nodes.forEach((node) => {
      const href = node.getAttribute('href')
      const dataPage = node.getAttribute('data-page')
      let pageNumber = Number.NaN

      if (href) {
        try {
          const parsedUrl = new URL(href, window.location.origin)
          const isHistoryPath = parsedUrl.pathname.startsWith(historyPath)
          const pageParam = Number.parseInt(parsedUrl.searchParams.get('page') || '', 10)
          if (isHistoryPath && !Number.isNaN(pageParam) && pageParam > 0) {
            pageNumber = pageParam
          }
        } catch {
          // Ignore malformed urls in pagination controls.
        }
      }

      if (Number.isNaN(pageNumber) && dataPage) {
        const fromDataPage = Number.parseInt(dataPage, 10)
        if (!Number.isNaN(fromDataPage) && fromDataPage > 0) {
          pageNumber = fromDataPage
        }
      }

      if (Number.isNaN(pageNumber)) {
        const textValue = cleanText(node.textContent || '')
        if (/^\d+$/.test(textValue)) {
          pageNumber = Number.parseInt(textValue, 10)
        }
      }

      if (!Number.isNaN(pageNumber) && pageNumber > 0) {
        pages.add(pageNumber)
      }
    })

    return pages
  }

  const extractOrdersFromDocument = (doc, pageNumber, sourceUrl) => {
    const seen = new Set()
    const orders = []

    const pushOrder = (order) => {
      const id = `${order.deal_url}|${order.title}|${order.details}`
      if (seen.has(id)) return
      seen.add(id)
      orders.push(order)
    }

    const historyRows = Array.from(doc.querySelectorAll('ul.history > li'))

    historyRows.forEach((row) => {
      const rowText = cleanText(row.innerText)
      if (!rowText) return

      const dateText = cleanText(row.querySelector('.date')?.textContent || '')
      const statusText = cleanText(row.querySelector('.status')?.textContent || '')
      const priceText = cleanText(row.querySelector('.price')?.textContent || '')
      const invoiceAnchor = row.querySelector('.id a[href*="/account/history/"]')
      const invoiceUrl = toAbsoluteUrl(invoiceAnchor?.getAttribute('href') || '')
      const invoiceId = cleanText(invoiceAnchor?.textContent || '')
      const dealAnchors = Array.from(
        row.querySelectorAll(
          '.deals a[href*="/account/redemption/"], .deals a[href*="/products/"], .deals a[href*="/deals/"]'
        )
      )

      if (dealAnchors.length === 0) {
        const amounts = priceText ? [priceText] : rowText.match(/\$[\d,.]+(?:\s*[A-Z]{3})?/g) || []
        const dates = dateText ? [dateText] : rowText.match(/\b\d{1,2}\.\d{1,2}\.\d{4}\b/g) || []
        pushOrder({
          title: invoiceId || rowText.slice(0, 120),
          deal_url: invoiceUrl,
          details: rowText,
          amounts,
          dates,
          page: pageNumber,
          source_url: sourceUrl,
          source_html: row.outerHTML.slice(0, 4000),
        })
        return
      }

      dealAnchors.forEach((dealAnchor) => {
        const dealUrl = toAbsoluteUrl(dealAnchor.getAttribute('href') || '')
        const dealTitle = cleanText(dealAnchor.textContent || '')
        const amounts = priceText ? [priceText] : rowText.match(/\$[\d,.]+(?:\s*[A-Z]{3})?/g) || []
        const dates = dateText ? [dateText] : rowText.match(/\b\d{1,2}\.\d{1,2}\.\d{4}\b/g) || []
        const details = cleanText(
          [
            dateText,
            invoiceId ? `Invoice ID: ${invoiceId}` : '',
            statusText,
            priceText,
            dealTitle,
          ]
            .filter(Boolean)
            .join(' | ')
        )

        pushOrder({
          title: dealTitle || invoiceId || rowText.slice(0, 120),
          deal_url: dealUrl || invoiceUrl,
          details: details || rowText,
          amounts,
          dates,
          page: pageNumber,
          source_url: sourceUrl,
          source_html: row.outerHTML.slice(0, 4000),
        })
      })
    })

    if (orders.length === 0) {
      const tableRows = Array.from(doc.querySelectorAll('table tbody tr'))
      tableRows.forEach((row) => {
        const rowText = cleanText(row.innerText)
        if (!rowText) return

        const link = row.querySelector('a[href]')
        const dealUrl = link ? toAbsoluteUrl(link.getAttribute('href') || '') : ''
        const title = cleanText(link?.textContent || rowText.split('  ')[0] || '')
        const amounts = rowText.match(/\$[\d,.]+/g) || []
        const dates =
          rowText.match(
            /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\s+\d{1,2},\s+\d{4}\b/gi
          ) || []

        pushOrder({
          title: title || rowText.slice(0, 120),
          deal_url: dealUrl,
          details: rowText,
          amounts,
          dates,
          page: pageNumber,
          source_url: sourceUrl,
          source_html: row.outerHTML.slice(0, 4000),
        })
      })
    }

    return orders
  }

  const historyBaseUrl = `${window.location.origin}/account/history/?page=`
  const parser = new DOMParser()
  const visitedPages = new Set()
  const pageMetadata = []
  const allOrders = []
  const errors = []
  let stoppedAtPage = null
  let maxPage = readPageNumber(window.location.href)

  const isNotFoundDocument = (doc) => {
    const mainText = cleanText(doc?.querySelector('main')?.textContent || '').toLowerCase()
    const pageText = cleanText(`${doc?.title || ''} ${doc?.body?.textContent || ''}`).toLowerCase()

    return (
      pageText.includes('404') ||
      pageText.includes('not found') ||
      mainText.includes("can't seem to find the page you're looking for")
    )
  }

  const processPage = (doc, url, fromFetch = false) => {
    const pageNumber = readPageNumber(url)
    visitedPages.add(pageNumber)

    const parsedOrders = extractOrdersFromDocument(doc, pageNumber, url)
    allOrders.push(...parsedOrders)

    const paginationPages = extractPaginationPages(doc)
    paginationPages.forEach((page) => {
      if (page > maxPage) maxPage = page
    })

    pageMetadata.push({
      page: pageNumber,
      url,
      orders_detected: parsedOrders.length,
      fetched: fromFetch,
    })
  }

  processPage(document, window.location.href, false)

  return (async () => {
    for (let page = 1; page <= maxPage; page += 1) {
      if (visitedPages.has(page)) continue

      const pageUrl = `${historyBaseUrl}${page}`

      try {
        const response = await fetch(pageUrl, {
          method: 'GET',
          credentials: 'include',
          cache: 'no-store',
        })

        if (response.status === 404) {
          stoppedAtPage = page
          errors.push(`Page ${page}: HTTP 404 (stopping pagination)`)
          break
        }

        if (!response.ok) {
          errors.push(`Page ${page}: HTTP ${response.status}`)
          continue
        }

        const html = await response.text()
        const parsedDoc = parser.parseFromString(html, 'text/html')

        if (isNotFoundDocument(parsedDoc)) {
          stoppedAtPage = page
          errors.push(`Page ${page}: Not found page content detected (stopping pagination)`)
          break
        }

        processPage(parsedDoc, pageUrl, true)
      } catch (error) {
        errors.push(`Page ${page}: ${error.message}`)
      }
    }

    return {
      ok: true,
      scanned_at: new Date().toISOString(),
      pages_scraped: pageMetadata.length,
      total_pages_detected: maxPage,
      stopped_at_page: stoppedAtPage,
      orders: allOrders,
      page_metadata: pageMetadata.sort((a, b) => a.page - b.page),
      errors,
    }
  })()
}

export default function AppsumoImport() {
  const user = useUser()
  const toast = useToast()
  const [projects] = useProjects()
  const [currentProject, setCurrentProject] = useCurrentProject()
  const [currentWorkspace] = useCurrentWorkspace()

  const [importPhase, setImportPhase] = useState('idle')
  const [lastImport, setLastImport] = useState(null)

  const canImport = useMemo(() => {
    return Boolean(user?.id && currentProject?.id)
  }, [user?.id, currentProject?.id])

  const surfaceBg = useColorModeValue('white', 'gray.800')
  const helperText = useColorModeValue('blackAlpha.700', 'whiteAlpha.700')
  const isBusy = importPhase === 'parsing' || importPhase === 'sending'

  const handleOpenAppsumoPage = () => {
    chrome.tabs.create({ url: APPSUMO_HISTORY_URL, active: true })
  }

  const handleProjectChange = (event) => {
    const selectedId = Number.parseInt(event.target.value, 10)
    const selectedProject = projects?.find((project) => project.id === selectedId)
    setCurrentProject(selectedProject || null)
  }

  const getActiveTab = async () => {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
    return tabs?.[0]
  }

  const runHistoryScrape = async (tabId) => {
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: collectAppsumoHistoryFromPage,
    })

    return results?.[0]?.result
  }

  const handleImport = async () => {
    let didComplete = false

    if (!canImport) {
      toast({
        title: 'Project required',
        description: 'Select a project before importing AppSumo history.',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      })
      return
    }

    try {
      setImportPhase('parsing')
      const activeTab = await getActiveTab()

      if (!activeTab?.id || !activeTab?.url) {
        throw new Error('Unable to detect the active tab.')
      }

      const activeUrl = new URL(activeTab.url)
      const isOnAppsumoHistory =
        activeUrl.hostname.includes('appsumo.com') &&
        activeUrl.pathname.startsWith(APPSUMO_HISTORY_PATH)

      if (!isOnAppsumoHistory) {
        throw new Error(
          'Open https://appsumo.com/account/history/?page=1 in the active tab before importing.'
        )
      }

      const scrapeResult = await runHistoryScrape(activeTab.id)
      if (!scrapeResult?.ok) {
        throw new Error(scrapeResult?.error || 'Could not parse AppSumo history.')
      }

      setImportPhase('sending')
      const payload = {
        source: 'appsumo',
        user_id: user.id,
        project_id: currentProject.id,
        workspace_id: currentWorkspace?.id || null,
        imported_at: new Date().toISOString(),
        appsumo: scrapeResult,
      }

      console.log('Sending import payload:', payload)

      const response = await fetch(APPSUMO_IMPORT_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const responseText = await response.text()
      if (!response.ok) {
        throw new Error(
          `Import API failed (${response.status}). ${responseText.slice(0, 180)}`
        )
      }

      setLastImport({
        pages: scrapeResult.pages_scraped || 0,
        orders: scrapeResult.orders?.length || 0,
      })
      didComplete = true
      setImportPhase('completed')
    } catch (error) {
      console.error('Import failed:', error)
      toast({
        title: 'AppSumo import failed',
        description: error.message || 'Unexpected error while importing.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      })
    } finally {
      if (!didComplete) {
        setImportPhase('idle')
      }
    }
  }

  if (importPhase === 'completed') {
    return (
      <VStack spacing={4} align="stretch" pb={4}>
        <Card variant="outline" bg={surfaceBg} p={6}>
          <VStack align="center" spacing={4} textAlign="center">
            <Icon as={FiCheckCircle} boxSize={12} color="green.400" />
            <Heading size="md">Import started successfully</Heading>
            <Text fontSize="sm" color={helperText}>
              We started processing your AppSumo history and will send you an email
              once the import is finished.
            </Text>
            <Text fontSize="sm" color={helperText}>
              You can now close the extension.
            </Text>
            {lastImport && (
              <Box fontSize="sm" color={helperText}>
                Submitted {lastImport.orders} rows from {lastImport.pages} pages.
              </Box>
            )}
          </VStack>
        </Card>
      </VStack>
    )
  }

  return (
    <VStack spacing={4} align="stretch" pb={4}>
      <Card variant="outline" bg={surfaceBg} p={5}>
        <VStack align="stretch" spacing={4}>
          <Heading size="md">AppSumo Import</Heading>
          <Text fontSize="sm" color={helperText}>
            Select a project, then{' '}
            <Link
              href={APPSUMO_HISTORY_URL}
              color="blue.500"
              textDecoration="underline"
              onClick={(event) => {
                event.preventDefault()
                handleOpenAppsumoPage()
              }}
            >
              open AppSumo purchase history
            </Link>{' '}
            in the active tab and import all history pages.
          </Text>
          <FormControl>
            <FormLabel>Project</FormLabel>
            <Select
              value={currentProject?.id || ''}
              onChange={handleProjectChange}
              placeholder="Select a project"
              variant="filled"
            >
              {projects?.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </Select>
          </FormControl>
          <Button
            colorScheme="blue"
            onClick={handleImport}
            isLoading={isBusy}
            loadingText={importPhase === 'sending' ? 'Sending' : 'Parsing'}
          >
            Import
          </Button>
          {!canImport && (
            <Alert status="warning" borderRadius={8}>
              <AlertIcon />
              <AlertDescription>
                A valid project is required before importing.
              </AlertDescription>
            </Alert>
          )}
          {lastImport && (
            <Box fontSize="sm" color={helperText}>
              Last import: {lastImport.orders} rows from {lastImport.pages}{' '}
              pages.
            </Box>
          )}
        </VStack>
      </Card>
    </VStack>
  )
}
