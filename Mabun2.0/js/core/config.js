// Environment configuration – values can be overridden by window.__APP_CONFIG__
const defaults = {
  API_BASE_URL: 'https://ozydwqmnfdheqfcycatd.functions.supabase.co',
  SUPABASE_URL: 'https://ozydwqmnfdheqfcycatd.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im96eWR3cW1uZmRoZXFmY3ljYXRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1NjYyNDMsImV4cCI6MjA4OTE0MjI0M30.inot98a-xy8R5pJvdGETqIz-QGeP-3JQgEn1b4ljlcI',
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
