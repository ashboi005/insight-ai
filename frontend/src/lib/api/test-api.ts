// Temporary test API client to debug connectivity issues
const TEST_API_URL = 'https://dgyy7el5y9.execute-api.ap-south-1.amazonaws.com/Prod'

export const testAPI = {
  // Test basic connectivity
  testConnection: async () => {
    try {
      console.log('Testing connection to:', `${TEST_API_URL}/`)
      const response = await fetch(`${TEST_API_URL}/`, {
        method: 'GET',
        mode: 'cors',
      })
      console.log('Test response status:', response.status)
      console.log('Test response headers:', [...response.headers.entries()])
      const text = await response.text()
      console.log('Test response body:', text)
      return { success: true, status: response.status, body: text }
    } catch (error) {
      console.error('Test connection failed:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  },

  // Test login with minimal config
  testLogin: async (email: string, password: string) => {
    try {
      console.log('Testing login to:', `${TEST_API_URL}/auth/login`)
      const response = await fetch(`${TEST_API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        mode: 'cors',
        body: JSON.stringify({ email, password })
      })
      
      console.log('Login test response status:', response.status)
      console.log('Login test response headers:', [...response.headers.entries()])
      
      const data = await response.json()
      console.log('Login test response data:', data)
      
      return { success: response.ok, status: response.status, data }
    } catch (error) {
      console.error('Test login failed:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }
}
