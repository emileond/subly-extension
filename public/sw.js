/* global chrome */

console.log('Background script loaded')

// Listener for messages from Popup
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  switch (request.action) {
    case 'loginWithGoogle': {
      // const url = 'https://web.subly.app/chrome-extension-login'
      // const url = 'http://localhost:3000/chrome-extension-login'
      const url = request.payload.url

      chrome.tabs.create({ url: url, active: true }, (tab) => {
        chrome.tabs.onUpdated.addListener(setTokens)
        sendResponse('Opened login tab')
      })
      break
    }
    default:
      break
  }
  return true // Keep the message channel open for sendResponse
})

// Listener for messages from the web app
chrome.runtime.onMessageExternal.addListener(function (
  request,
  sender,
  sendResponse
) {
  // Validate the sender, you can be more specific depending on your needs
  // if (sender.url.startsWith('https://web.subly.app')) {
  if (request.type === 'SET_SESSION') {
    // sned response to the web app
    sendResponse('Session data received')

    console.log('request received ', request)
    // Save the session data
    chrome.storage.local.set({ sessionData: request }, function () {
      console.log('Session data saved')
      // open popup
    })
  }

  // Close the tab after getting the session data
  if (sender.tab.id) {
    console.log('Closing tab...')
    // chrome.tabs.remove(sender.tab.id)
  }
  // }
})

const setTokens = async (tabId, changeInfo, tab) => {
  // once the tab is loaded

  const url = new URL(tab.url)
  url.hash
  if (tab.url && tab.url.includes('access_token')) {
    console.log('tab updated', tab.url)
    if (!tab.url) return

    // at this point user is logged-in to the web app
    // url should look like this: https://my.webapp.com/#access_token=zI1NiIsInR5c&expires_in=3600&provider_token=ya29.a0AVelGEwL6L&refresh_token=GEBzW2vz0q0s2pww&token_type=bearer
    // parse access_token and refresh_token from query string params
    // if (url.origin === 'https://my.webapp.com') {
    const fragment = url.hash.substring(1) // remove the leading '#'
    const params = new URLSearchParams(fragment)

    const accessToken = params.get('access_token')
    const refreshToken = params.get('refresh_token')

    if (accessToken && refreshToken) {
      if (!tab.id) return
      // we can close that tab now
      await chrome.tabs.remove(tab.id)
      // store access_token and refresh_token in storage as these will be used to authenticate user in chrome extension
      await chrome.storage.local.set({
        gauthAccessToken: accessToken,
        gauthRefreshToken: refreshToken,
      })
      // remove tab listener as tokens are set
      chrome.tabs.onUpdated.removeListener(setTokens)
      // }
    }
  }
}
