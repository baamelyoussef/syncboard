/// <reference types="vite/client" />

const raw = import.meta.env.VITE_BACKEND_URL as string | undefined

export const API_BASE = raw ? raw.replace(/\/$/, '') : ''

export const WS_BASE = raw
  ? raw.replace(/^https/, 'wss').replace(/^http/, 'ws').replace(/\/$/, '')
  : `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}`
