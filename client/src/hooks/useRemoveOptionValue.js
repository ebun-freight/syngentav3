import axios from 'axios'
import { useState } from 'react'
import { API_SYSTEM_SETTINGS } from '../utils/APIRoutes'

const useRemoveOptionValue = () => {
  const [isLoading, setIsLoading] = useState(false)

  const removeOptionValueFunction = async data => {
    setIsLoading(true)

    const token = sessionStorage.getItem('userToken')

    try {
      console.log(data)
      const response = await axios.delete(
        `${API_SYSTEM_SETTINGS}/remove-option`,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          data: data
        }
      )

      console.log('HOOK - REMOVED OPTION', response.data)

      return response.data
    } catch (error) {
      console.log(error.response?.data?.message)
      return error.response?.data?.message || 'Something went wrong!'
    } finally {
      setIsLoading(false)
    }
  }

  return { removeOptionValueFunction, isLoading }
}

export default useRemoveOptionValue
