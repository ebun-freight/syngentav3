import { createContext, useContext, useEffect, useState } from 'react'
import useGetSettings from '../hooks/useGetSettings'
import useAddOptionValue from '../hooks/useAddOptionValue'
import useRemoveOptionValue from '../hooks/useRemoveOptionValue'
import { toast } from 'react-toastify'

const SettingsContext = createContext()

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState({
    trucksDrivers: {
      truckType: [],
      status: [],
      subcon: []
    },
    deployments: {
      hybrid: [],
      territory: [],
      flagging: [],
      destination: []
    }
  })

  const { getSettingsFunction, isLoading: isLoadingSettings } = useGetSettings()
  const { addOptionValueFunction, isLoading: isAdding } = useAddOptionValue()
  const { removeOptionValueFunction, isLoading: isRemoving } =
    useRemoveOptionValue()

  const fetchSettings = async () => {
    const result = await getSettingsFunction()

    console.log('SETTINGS', result)

    if (result.settings) {
      const trucksDrivers = {
        truckType: [],
        status: [],
        subcon: []
      }
      const deployments = {
        hybrid: [],
        territory: [],
        flagging: [],
        destination: []
      }

      result.settings.forEach(setting => {
        if (setting.category === 'trucksDrivers') {
          trucksDrivers[setting.field] = setting.values
        } else if (setting.category === 'deployments') {
          deployments[setting.field] = setting.values
        }
      })

      setSettings({ trucksDrivers, deployments })
    }
  }

  const addOption = async ({ category, field, value }) => {
    const result = await addOptionValueFunction({ category, field, value })

    if (result.setting) {
      toast.success(result.message)

      setSettings(prev => ({
        ...prev,
        [category]: {
          ...prev[category],
          [field]: result.setting.values
        }
      }))

      return true
    } else {
      toast.error(result)
      return false
    }
  }

  const removeOption = async ({ category, field, value }) => {
    const result = await removeOptionValueFunction({ category, field, value })

    if (result.setting) {
      toast.success(result.message)

      setSettings(prev => ({
        ...prev,
        [category]: {
          ...prev[category],
          [field]: result.setting.values
        }
      }))

      return true
    } else {
      toast.error(result)
      return false
    }
  }

  useEffect(() => {
    fetchSettings()
  }, [])

  return (
    <SettingsContext.Provider
      value={{
        settings,
        isLoadingSettings,
        isAdding,
        isRemoving,
        fetchSettings,
        addOption,
        removeOption
      }}
    >
      {children}
    </SettingsContext.Provider>
  )
}

export const useSettingsContext = () => useContext(SettingsContext)
