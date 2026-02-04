import { createContext, useContext, useState } from 'react'

const UIContext = createContext()

export const UIProvider = ({ children }) => {
  const [isSideBarOpen, setIsSideBarOpen] = useState(true)

  return (
    <UIContext.Provider value={{ isSideBarOpen, setIsSideBarOpen }}>
      {children}
    </UIContext.Provider>
  )
}

export const useUIContext = () => useContext(UIContext)
