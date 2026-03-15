// Environment configuration – values can be overridden by window.__APP_CONFIG__
const defaults = {
  API_BASE_URL: 'https://api.mabunplay.com/v1',
  WS_BASE_URL: 'wss://ws.mabunplay.com',
  MIN_DEPOSIT: 5000,
  MAX_WALLET: 50000000,
  WITHDRAWAL_FEE: 0.01, // 1%
  QUIZ_ENTRY_FEES: {
    hourly: 1000,
    daily: 2000,
    weekly: 3000,
    auto: 15000
  },
  SUPPORTED_PROVIDERS: ['mtn', 'digitel']
};

const config = window.__APP_CONFIG__ ? { ...defaults, ...window.__APP_CONFIG__ } : defaults;

export default config;