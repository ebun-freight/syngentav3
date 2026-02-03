import axios from 'axios'
import { useState } from 'react'
import { API_USER } from '../utils/APIRoutes'

const useCreateSubcon = () => {
  const [isLoading, setIsLoading] = useState(false)

  const createSubconFunction = async data => {
    setIsLoading(true)

    const formData = new FormData()

    // append all form fields
    Object.entries(data).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        formData.append(key, value)
      }
    })

    try {
      const token = sessionStorage.getItem('userToken')
      const response = await axios.post(`${API_USER}/create-admin`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data ',
          Authorization: `Bearer ${token}`
        }
      })

      console.log('HOOK - CREATED SUBCON', response.data)

      return response.data
    } catch (error) {
      console.log(error.response.data.message)
      return error.response?.data?.message || 'Something went wrong!'
    } finally {
      setIsLoading(false)
    }
  }

  return { createSubconFunction, isLoading }
}

export default useCreateSubcon
