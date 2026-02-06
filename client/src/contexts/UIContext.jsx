import { createContext, useContext, useEffect, useState } from 'react'

const UIContext = createContext()

export const UIProvider = ({ children }) => {
  // Check window size immediately (only runs in browser)
  const [isSideBarOpen, setIsSideBarOpen] = useState(() => {
    // This runs once when useState is called
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 1024 // true if desktop, false if mobile
    }
    return true // Default for SSR or initial render
  })

  return (
    <UIContext.Provider value={{ isSideBarOpen, setIsSideBarOpen }}>
      {children}
    </UIContext.Provider>
  )
}

export const useUIContext = () => useContext(UIContext)
