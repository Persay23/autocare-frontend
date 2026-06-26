import { create } from 'zustand'

export type Currency = 'PLN' | 'USD' | 'EUR' | 'UAH'

export const RATES: Record<Currency, number> = {
  PLN: 1,
  USD: 0.25,
  EUR: 0.23,
  UAH: 10.5,
}

export const SYMBOLS: Record<Currency, string> = {
  PLN: 'zł',
  USD: '$',
  EUR: '€',
  UAH: '₴',
}

const STORAGE_KEY = 'autocare_currency'

interface CurrencyStore {
  currency: Currency
  setCurrency: (c: Currency) => void
}

export const useCurrencyStore = create<CurrencyStore>((set) => ({
  currency: (localStorage.getItem(STORAGE_KEY) as Currency) ?? 'PLN',
  setCurrency: (currency) => {
    localStorage.setItem(STORAGE_KEY, currency)
    set({ currency })
  },
}))

export const formatMoney = (amountPLN: number, currency: Currency): string => {
  const converted = amountPLN * RATES[currency]
  const symbol = SYMBOLS[currency]
  const formatted = converted % 1 === 0
    ? converted.toLocaleString()
    : converted.toLocaleString(undefined, { maximumFractionDigits: 2 })
  return `${formatted} ${symbol}`
}

export const toPLN = (amount: number, currency: Currency): number =>
  currency === 'PLN' ? amount : amount / RATES[currency]

export const isSupportedCurrency = (code: string): code is Currency =>
  code in RATES

// Converts an amount between two supported currencies via the PLN base rate.
export const convertCurrency = (amount: number, from: Currency, to: Currency): number =>
  (amount / RATES[from]) * RATES[to]
