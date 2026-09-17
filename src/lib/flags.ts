// Feature flags configuration for TroXinh
export const FLAGS = {
  ENABLE_DEBUG: import.meta.env.VITE_ENABLE_DEBUG === 'true',
  ENABLE_MOCK: import.meta.env.VITE_ENABLE_MOCK === 'true',
  ENABLE_LIVE_PAYMENTS: import.meta.env.VITE_ENABLE_LIVE_PAYMENTS === 'true',
  IS_PROD: import.meta.env.PROD,
};
