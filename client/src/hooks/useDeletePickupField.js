import axios from 'axios'
import { useState } from 'react'
import { API_PICKUP_FIELDS } from '../utils/APIRoutes'

const useDeletePickupField = () => {
  const [isLoading, setIsLoading] = useState(false)

  const deletePickupFieldFunction = async id => {
    setIsLoading(true)
    const token = sessionStorage.getItem('userToken')
    try {
      const response = await axios.delete(`${API_PICKUP_FIELDS}/${id}`, {
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

  return { deletePickupFieldFunction, isLoading }
}

export default useDeletePickupField
