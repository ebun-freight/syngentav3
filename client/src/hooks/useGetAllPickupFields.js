import axios from 'axios'
import { useState } from 'react'
import { API_PICKUP_FIELDS } from '../utils/APIRoutes'

const useGetAllPickupFields = () => {
  const [isLoading, setIsLoading] = useState(false)
  const [isError, setIsError] = useState(false)

  const getAllPickupFieldsFunction = async (filters = {}) => {
    setIsLoading(true)
    setIsError(false)
    const token = sessionStorage.getItem('userToken')

    try {
      const response = await axios.get(API_PICKUP_FIELDS, {
        headers: { Authorization: `Bearer ${token}` },
        params: filters
      })

      return {
        pickupFields: response.data.pickupFields,
        total: response.data.total,
        page: response.data.page,
        totalPages: response.data.totalPages,
        error: null
      }
    } catch (error) {
      setIsError(true)
      return {
        pickupFields: [],
        total: 0,
        page: 1,
        totalPages: 1,
        error: error.response?.data?.message || 'Something went wrong!'
      }
    } finally {
      setIsLoading(false)
    }
  }

  return { getAllPickupFieldsFunction, isLoading, isError }
}

export default useGetAllPickupFields
