/**
 * Utility function for making API requests to the backend
 */
export const apiRequest = async (url: string, options: RequestInit = {}) => {
  const defaultOptions: RequestInit = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const fetchOptions = {
    ...defaultOptions,
    ...options,
  };

  try {
    const response = await fetch(url, fetchOptions);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
};