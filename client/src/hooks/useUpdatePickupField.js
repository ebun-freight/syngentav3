import axios from 'axios'
import { useState } from 'react'
import { API_PICKUP_FIELDS } from '../utils/APIRoutes'

const useUpdatePickupField = () => {
  const [isLoading, setIsLoading] = useState(false)

  const updatePickupFieldFunction = async (id, data) => {
    setIsLoading(true)
    const token = sessionStorage.getItem('userToken')

    try {
      const response = await axios.patch(`${API_PICKUP_FIELDS}/${id}`, data, {
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

  return { updatePickupFieldFunction, isLoading }
}

export default useUpdatePickupField
