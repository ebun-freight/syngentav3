import axios from 'axios'
import { useState } from 'react'
import { API_PICKUP_FIELDS } from '../utils/APIRoutes'

const useCreatePickupField = () => {
  const [isLoading, setIsLoading] = useState(false)

  const createPickupFieldFunction = async data => {
    setIsLoading(true)
    const token = sessionStorage.getItem('userToken')

    try {
      const response = await axios.post(API_PICKUP_FIELDS, data, {
        headers: { Authorization: `Bearer ${token}` }
      })
      return { data: response.data, error: null }
    } catch (error) {
      return {
        data: null,
        error: error.response?.data?.message || 'Something went wrong!'
      }
    } finally {
      setIsLoading(false)
    }
  }

  return { createPickupFieldFunction, isLoading }
}

export default useCreatePickupField
