import axios from 'axios'
import { useState } from 'react'
import { API_SYSTEM_SETTINGS } from '../utils/APIRoutes'

const useAddOptionValue = () => {
  const [isLoading, setIsLoading] = useState(false)

  const addOptionValueFunction = async data => {
    setIsLoading(true)

    const token = sessionStorage.getItem('userToken')

    try {
      console.log(data)
      const response = await axios.post(
        `${API_SYSTEM_SETTINGS}/add-option`,
        data,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          }
        }
      )

      console.log('HOOK - ADDED OPTION', response.data)

      return response.data
    } catch (error) {
      console.log(error.response?.data?.message)
      return error.response?.data?.message || 'Something went wrong!'
    } finally {
      setIsLoading(false)
    }
  }

  return { addOptionValueFunction, isLoading }
}

export default useAddOptionValue
