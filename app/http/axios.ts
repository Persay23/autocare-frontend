import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'https://localhost:7235/api',
  withCredentials: true, // sends the auth cookie with every request
})

// If the server returns 401, the user's session has expired.
// Redirect them to login automatically.
api.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    const status = (error as { response?: { status?: number } }).response?.status
    if (status === 401 && !window.location.pathname.includes('/login')) {
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api