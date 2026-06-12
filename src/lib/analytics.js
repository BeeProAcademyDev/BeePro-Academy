const config = {
  gaId: import.meta.env.VITE_GA_MEASUREMENT_ID?.trim() || '',
  gtmId: import.meta.env.VITE_GTM_ID?.trim() || '',
  metaPixelId: import.meta.env.VITE_META_PIXEL_ID?.trim() || '',
  tiktokPixelId: import.meta.env.VITE_TIKTOK_PIXEL_ID?.trim() || '',
  snapPixelId: import.meta.env.VITE_SNAPCHAT_PIXEL_ID?.trim() || '',
  linkedInPartnerId: import.meta.env.VITE_LINKEDIN_PARTNER_ID?.trim() || '',
  twitterPixelId: import.meta.env.VITE_TWITTER_PIXEL_ID?.trim() || ''
}

let initialized = false

function loadScript(src, id) {
  if (document.getElementById(id)) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.id = id
    script.async = true
    script.src = src
    script.onload = () => resolve()
    script.onerror = () => reject(new Error(`Failed to load ${id}`))
    document.head.appendChild(script)
  })
}

function initGoogleAnalytics() {
  if (!config.gaId) return

  window.dataLayer = window.dataLayer || []
  window.gtag = window.gtag || function gtag() {
    window.dataLayer.push(arguments)
  }

  return loadScript(`https://www.googletagmanager.com/gtag/js?id=${config.gaId}`, 'ga-gtag')
    .then(() => {
      window.gtag('js', new Date())
      window.gtag('config', config.gaId, { send_page_view: false })
    })
}

function initGoogleTagManager() {
  if (!config.gtmId) return

  window.dataLayer = window.dataLayer || []

  // Skip if GTM was already injected from index.html
  if (document.getElementById('gtm-script') || document.querySelector('script[src*="googletagmanager.com/gtm.js"]')) {
    return
  }

  window.dataLayer.push({
    'gtm.start': new Date().getTime(),
    event: 'gtm.js'
  })

  return loadScript(`https://www.googletagmanager.com/gtm.js?id=${config.gtmId}`, 'gtm-script')
}

function initMetaPixel() {
  if (!config.metaPixelId) return

  if (!window.fbq) {
    const fbq = function fbqCall() {
      if (fbq.callMethod) {
        fbq.callMethod.apply(fbq, arguments)
      } else {
        fbq.queue.push(arguments)
      }
    }
    fbq.push = fbq
    fbq.loaded = true
    fbq.version = '2.0'
    fbq.queue = []
    window.fbq = fbq
    window._fbq = fbq
  }

  return loadScript('https://connect.facebook.net/en_US/fbevents.js', 'meta-pixel')
    .then(() => {
      window.fbq('init', config.metaPixelId)
    })
}

function initTikTokPixel() {
  if (!config.tiktokPixelId) return

  window.TiktokAnalyticsObject = 'ttq'
  const ttq = window.ttq || []
  ttq.methods = ['page', 'track', 'identify', 'instances', 'debug', 'on', 'off', 'once', 'ready', 'alias', 'group', 'enableCookie', 'disableCookie']
  ttq.setAndDefer = function setAndDefer(target, method) {
    target[method] = function deferred() {
      target.push([method].concat(Array.prototype.slice.call(arguments, 0)))
    }
  }
  ttq.methods.forEach((method) => ttq.setAndDefer(ttq, method))
  ttq.load = function load(pixelId) {
    const url = 'https://analytics.tiktok.com/i18n/pixel/events.js'
    ttq._i = ttq._i || {}
    ttq._i[pixelId] = []
    ttq._i[pixelId]._u = url
    ttq._t = ttq._t || {}
    ttq._t[pixelId] = +new Date()
    ttq._o = ttq._o || {}
    ttq._o[pixelId] = {}
    const script = document.createElement('script')
    script.id = 'tiktok-pixel'
    script.async = true
    script.src = `${url}?sdkid=${pixelId}&lib=ttq`
    document.head.appendChild(script)
  }
  window.ttq = ttq
  ttq.load(config.tiktokPixelId)
  ttq.page()
}

function initSnapPixel() {
  if (!config.snapPixelId) return

  const snaptr = function snaptrCall() {
    if (snaptr.handleRequest) {
      snaptr.handleRequest.apply(snaptr, arguments)
    } else {
      snaptr.queue.push(arguments)
    }
  }
  snaptr.queue = []
  window.snaptr = snaptr

  return loadScript('https://sc-static.net/scevent.min.js', 'snap-pixel')
    .then(() => {
      window.snaptr('init', config.snapPixelId)
    })
}

function initLinkedInInsight() {
  if (!config.linkedInPartnerId) return

  window._linkedin_data_partner_ids = window._linkedin_data_partner_ids || []
  window._linkedin_data_partner_ids.push(config.linkedInPartnerId)

  return loadScript('https://snap.licdn.com/li.lms-analytics/insight.min.js', 'linkedin-insight')
}

function initTwitterPixel() {
  if (!config.twitterPixelId) return

  if (!window.twq) {
    const twq = function twqCall() {
      twq.exe ? twq.exe.apply(twq, arguments) : twq.queue.push(arguments)
    }
    twq.version = '1.1'
    twq.queue = []
    window.twq = twq
  }

  return loadScript('https://static.ads-twitter.com/uwt.js', 'twitter-pixel')
    .then(() => {
      window.twq('config', config.twitterPixelId)
    })
}

export function initAnalytics() {
  if (initialized || typeof window === 'undefined') return
  initialized = true

  const tasks = [
    initGoogleTagManager(),
    initGoogleAnalytics(),
    initMetaPixel(),
    initTikTokPixel(),
    initSnapPixel(),
    initLinkedInInsight(),
    initTwitterPixel()
  ].filter(Boolean)

  Promise.allSettled(tasks).then((results) => {
    results.forEach((result) => {
      if (result.status === 'rejected') {
        console.warn('[Analytics] Script load failed:', result.reason)
      }
    })
  })
}

export function trackPageView(path, title = document.title) {
  const pagePath = path || window.location.pathname + window.location.search

  if (window.gtag && config.gaId) {
    window.gtag('event', 'page_view', {
      page_path: pagePath,
      page_title: title
    })
  }

  if (window.fbq && config.metaPixelId) {
    window.fbq('track', 'PageView')
  }

  if (window.ttq && config.tiktokPixelId) {
    window.ttq.page()
  }

  if (window.snaptr && config.snapPixelId) {
    window.snaptr('track', 'PAGE_VIEW')
  }

  if (window.twq && config.twitterPixelId) {
    window.twq('track', 'PageView')
  }

  if (window.dataLayer && config.gtmId) {
    window.dataLayer.push({
      event: 'page_view',
      page_path: pagePath,
      page_title: title
    })
  }
}

export function trackEvent(eventName, params = {}) {
  if (window.gtag && config.gaId) {
    window.gtag('event', eventName, params)
  }

  if (window.dataLayer && config.gtmId) {
    window.dataLayer.push({
      event: eventName,
      ...params
    })
  }

  const metaEventMap = {
    sign_up: 'CompleteRegistration',
    login: 'Lead',
    contact_submit: 'Contact',
    instructor_application: 'SubmitApplication',
    course_view: 'ViewContent',
    begin_checkout: 'InitiateCheckout'
  }

  if (window.fbq && config.metaPixelId && metaEventMap[eventName]) {
    window.fbq('track', metaEventMap[eventName], params)
  }

  if (window.ttq && config.tiktokPixelId) {
    window.ttq.track(eventName, params)
  }

  if (window.snaptr && config.snapPixelId) {
    window.snaptr('track', eventName.toUpperCase(), params)
  }

  if (window.twq && config.twitterPixelId) {
    window.twq('track', eventName, params)
  }
}

export function getAnalyticsConfig() {
  return { ...config }
}

export default {
  initAnalytics,
  trackPageView,
  trackEvent,
  getAnalyticsConfig
}
