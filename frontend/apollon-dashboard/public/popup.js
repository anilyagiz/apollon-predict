// Apollon Oracle - Chrome Extension Popup

const content = document.getElementById("content");

function formatPrice(price, decimals = 2) {
  if (!price && price !== 0) return "--";
  return `$${Number(price).toFixed(decimals)}`;
}

function formatVolume(vol) {
  if (!vol) return "--";
  if (vol >= 1e9) return `$${(vol / 1e9).toFixed(2)}B`;
  if (vol >= 1e6) return `$${(vol / 1e6).toFixed(1)}M`;
  if (vol >= 1e3) return `$${(vol / 1e3).toFixed(0)}K`;
  return `$${vol.toFixed(0)}`;
}

function formatChange(change) {
  if (!change && change !== 0) return { text: "0.00%", isPositive: true };
  const isPositive = change >= 0;
  return {
    text: `${isPositive ? "+" : ""}${change.toFixed(2)}%`,
    isPositive,
  };
}

function renderPrices(data) {
  const near = data.near;
  const aurora = data.aurora;
  const nearChange = formatChange(near?.usd_24h_change);
  const auroraChange = formatChange(aurora?.usd_24h_change);

  content.innerHTML = `
    <!-- Price Cards -->
    <div class="prices">
      <!-- NEAR -->
      <div class="price-card">
        <div class="price-card-header">
          <div class="token-info">
            <div class="token-icon near">N</div>
            <div>
              <div class="token-name">NEAR Protocol</div>
              <div class="token-symbol">NEAR</div>
            </div>
          </div>
          <span class="change-badge ${nearChange.isPositive ? "positive" : "negative"}">
            ${nearChange.text}
          </span>
        </div>
        <div class="price-value">${near ? formatPrice(near.usd) : "--"}</div>
        <div class="price-meta">
          <span>Vol: ${formatVolume(near?.usd_24h_vol)}</span>
          <span>MCap: ${formatVolume(near?.usd_market_cap)}</span>
        </div>
      </div>

      <!-- Aurora -->
      <div class="price-card">
        <div class="price-card-header">
          <div class="token-info">
            <div class="token-icon aurora">A</div>
            <div>
              <div class="token-name">Aurora</div>
              <div class="token-symbol">AURORA</div>
            </div>
          </div>
          <span class="change-badge ${auroraChange.isPositive ? "positive" : "negative"}">
            ${auroraChange.text}
          </span>
        </div>
        <div class="price-value">${aurora ? formatPrice(aurora.usd, 4) : "--"}</div>
        <div class="price-meta">
          <span>Vol: ${formatVolume(aurora?.usd_24h_vol)}</span>
          <span>MCap: ${formatVolume(aurora?.usd_market_cap)}</span>
        </div>
      </div>
    </div>

    <!-- Quick Stats -->
    <div class="stats">
      <div class="stat-card">
        <div class="stat-label">ML Models</div>
        <div class="stat-value">4</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Chains</div>
        <div class="stat-value">14+</div>
      </div>
    </div>

    <!-- Actions -->
    <div class="footer">
      <button class="btn btn-primary" id="openDashboard">
        Open Full Dashboard
      </button>
      <button class="btn btn-secondary" id="refreshBtn">
        Refresh Prices
      </button>
    </div>

    <div class="last-updated">
      Last updated: ${data.lastUpdated ? new Date(data.lastUpdated).toLocaleTimeString() : "N/A"}
    </div>
  `;

  // Attach event listeners
  document.getElementById("openDashboard").addEventListener("click", () => {
    chrome.runtime.sendMessage({ type: "OPEN_DASHBOARD" });
    window.close();
  });

  document.getElementById("refreshBtn").addEventListener("click", () => {
    content.innerHTML = '<div class="loading"><div class="spinner"></div>Refreshing...</div>';
    chrome.runtime.sendMessage({ type: "REFRESH_PRICES" }, (data) => {
      if (data) renderPrices(data);
      else renderError();
    });
  });
}

function renderError() {
  content.innerHTML = `
    <div class="prices">
      <div class="price-card" style="text-align:center; color:#6B7280;">
        <p style="margin-bottom:12px;">Could not load prices</p>
        <button class="btn btn-secondary" id="retryBtn">Try Again</button>
      </div>
    </div>
    <div class="footer">
      <button class="btn btn-primary" id="openDashboard">Open Full Dashboard</button>
    </div>
  `;

  document.getElementById("retryBtn")?.addEventListener("click", loadPrices);
  document.getElementById("openDashboard").addEventListener("click", () => {
    chrome.runtime.sendMessage({ type: "OPEN_DASHBOARD" });
    window.close();
  });
}

function loadPrices() {
  chrome.runtime.sendMessage({ type: "GET_PRICES" }, (data) => {
    if (chrome.runtime.lastError) {
      renderError();
      return;
    }
    if (data && (data.near || data.aurora)) {
      renderPrices(data);
    } else {
      renderError();
    }
  });
}

// Load prices on popup open
document.addEventListener("DOMContentLoaded", loadPrices);
