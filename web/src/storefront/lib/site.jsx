'use client'
import { createContext, useContext } from 'react'

// Settings, menus, announcement and age-step words that come from the CMS and are needed everywhere.
const Ctx = createContext(null)
export const SiteProvider = ({ site, children }) => <Ctx.Provider value={site}>{children}</Ctx.Provider>
export const useSite = () => useContext(Ctx)

