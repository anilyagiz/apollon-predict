// Apollon Oracle - Chrome Extension Background Service Worker (Manifest V3)

// Price cache
let priceCache = {
  near: null,
  aurora: null,
  lastUpdated: null,
};

// Fetch prices from CoinGecko
async function fetchPrices() {
  try {
    const resp = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=near,aurora-near&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true&include_market_cap=true"
    );

    if (!resp.ok) throw new Error(`CoinGecko error: ${resp.status}`);

    const data = await resp.json();

    priceCache = {
      near: data.near || null,
      aurora: data["aurora-near"] || null,
      lastUpdated: new Date().toISOString(),
    };

    // Store in extension storage
    await chrome.storage.local.set({ priceCache });

    // Update badge with NEAR price
    if (data.near?.usd) {
      const price = data.near.usd;
      const text = price >= 100 ? `$${Math.round(price)}` : `$${price.toFixed(1)}`;
      chrome.action.setBadgeText({ text });
      chrome.action.setBadgeBackgroundColor({ color: "#3B82F6" });
    }

    return priceCache;
  } catch (error) {
    console.error("Failed to fetch prices:", error);
    return priceCache;
  }
}

// Set up periodic price updates (every 60 seconds)
chrome.alarms.create("fetchPrices", { periodInMinutes: 1 });

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "fetchPrices") {
    fetchPrices();
  }
});

// Handle messages from popup
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "GET_PRICES") {
    chrome.storage.local.get("priceCache", (result) => {
      if (result.priceCache && result.priceCache.lastUpdated) {
        sendResponse(result.priceCache);
      } else {
        fetchPrices().then((data) => sendResponse(data));
      }
    });
    return true; // Keep channel open for async response
  }

  if (message.type === "REFRESH_PRICES") {
    fetchPrices().then((data) => sendResponse(data));
    return true;
  }

  if (message.type === "OPEN_DASHBOARD") {
    chrome.tabs.create({ url: chrome.runtime.getURL("index.html") });
    sendResponse({ ok: true });
  }
});

// Fetch prices on install/startup
chrome.runtime.onInstalled.addListener(() => {
  fetchPrices();
});

chrome.runtime.onStartup.addListener(() => {
  fetchPrices();
});
