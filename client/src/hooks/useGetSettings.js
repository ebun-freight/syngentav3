import axios from 'axios'
import { useState } from 'react'
import { API_SYSTEM_SETTINGS } from '../utils/APIRoutes'

const useGetSettings = () => {
  const [isLoading, setIsLoading] = useState(false)

  const getSettingsFunction = async (category = null) => {
    setIsLoading(true)

    const token = sessionStorage.getItem('userToken')

    try {
      const url = category
        ? `${API_SYSTEM_SETTINGS}?category=${category}`
        : API_SYSTEM_SETTINGS

      const response = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      console.log('HOOK - GET SETTINGS', response.data)

      return response.data
    } catch (error) {
      console.log(error.response?.data?.message)
      return error.response?.data?.message || 'Something went wrong!'
    } finally {
      setIsLoading(false)
    }
  }

  return { getSettingsFunction, isLoading }
}

export default useGetSettings
