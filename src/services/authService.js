const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';
const TOKEN_STORAGE_KEY = 'medlink_auth_token';
const USER_STORAGE_KEY = 'medlink_auth_user';

/**
 * Parses and returns a clean error message from an API error response.
 */
async function parseErrorResponse(response) {
  try {
    const errorData = await response.json();
    if (errorData.errors && Array.isArray(errorData.errors) && errorData.errors.length > 0) {
      return errorData.errors.map((e) => e.message).join(' ');
    }
    return errorData.message || `Request failed with status ${response.status}`;
  } catch {
    return `Server error (${response.status}). Please try again.`;
  }
}

export const authService = {
  /**
   * Retrieves the stored JWT token.
   */
  getToken() {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  },

  /**
   * Saves the JWT token to local storage.
   */
  setToken(token) {
    if (token) {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  },

  /**
   * Retrieves the cached user info from local storage.
   */
  getUser() {
    try {
      const stored = localStorage.getItem(USER_STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  },

  /**
   * Saves cached user info to local storage.
   */
  setUser(user) {
    if (user) {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(USER_STORAGE_KEY);
    }
  },

  /**
   * Clears token and cached user from local storage.
   */
  clearStorage() {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
  },

  /**
   * Authenticates user with email and password.
   * @param {string} email
   * @param {string} password
   * @returns {Promise<{user: object, token: string}>}
   */
  async login(email, password) {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const errorMessage = await parseErrorResponse(response);
      throw new Error(errorMessage);
    }

    const payload = await response.json();
    const { user, token } = payload.data;

    this.setToken(token);
    this.setUser(user);

    return { user, token };
  },

  /**
   * Registers a new patient with onboarding profile data.
   * @param {object} patientData
   * @returns {Promise<{user: object, token: string}>}
   */
  async register(patientData) {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(patientData),
    });

    if (!response.ok) {
      const errorMessage = await parseErrorResponse(response);
      throw new Error(errorMessage);
    }

    const payload = await response.json();
    const { user, token } = payload.data;

    this.setToken(token);
    this.setUser(user);

    return { user, token };
  },

  /**
   * Fetches the current authenticated user's profile from the backend.
   * @returns {Promise<object>}
   */
  async getCurrentUser() {
    const token = this.getToken();
    if (!token) {
      throw new Error('No authentication token available.');
    }

    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      this.clearStorage();
      const errorMessage = await parseErrorResponse(response);
      throw new Error(errorMessage);
    }

    const payload = await response.json();
    const user = payload.data.user;

    this.setUser(user);
    return user;
  },

  /**
   * Logs out the user by clearing client session storage.
   */
  logout() {
    this.clearStorage();
  },
};
