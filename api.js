/**
 * API Communication Module - Hotel Room Booking System
 * Developed by POORVAJAN G S
 * Final Year CSE Student at KSRIET
 * Leader of Team CODE CRAFTS
 */

const API = {
    // Base URL for all API calls
    baseURL: CONFIG.API_BASE_URL,

    // Default headers
    getHeaders(includeAuth = true) {
        const headers = {
            'Content-Type': 'application/json',
        };

        if (includeAuth && typeof Auth !== 'undefined') {
            const token = Auth.getToken();
            if (token) {
                headers.Authorization = `Bearer ${token}`;
            }
        }

        return headers;
    },

    // Handle API response
    async handleResponse(response) {
        try {
            const data = await response.json();
            
            if (!response.ok) {
                // Handle specific HTTP status codes
                switch (response.status) {
                    case 401:
                        // Unauthorized - token might be expired
                        if (typeof Auth !== 'undefined') {
                            Auth.clearAuthData();
                            Toast.error(CONFIG.ERROR_MESSAGES.TOKEN_EXPIRED);
                        }
                        break;
                    case 403:
                        Toast.error(CONFIG.ERROR_MESSAGES.FORBIDDEN);
                        break;
                    case 404:
                        Toast.error(CONFIG.ERROR_MESSAGES.NOT_FOUND);
                        break;
                    case 500:
                        Toast.error(CONFIG.ERROR_MESSAGES.SERVER_ERROR);
                        break;
                }
                
                throw { 
                    status: response.status, 
                    message: data.error || data.message || 'Request failed',
                    data: data
                };
            }

            return data;
        } catch (error) {
            if (error.status) {
                throw error;
            }
            
            // Network error or JSON parsing error
            console.error('API Response Error:', error);
            throw {
                status: 0,
                message: CONFIG.ERROR_MESSAGES.NETWORK_ERROR,
                data: null
            };
        }
    },

    // Generic request method
    async request(endpoint, options = {}) {
        try {
            const url = `${this.baseURL}${endpoint}`;
            const config = {
                method: 'GET',
                headers: this.getHeaders(),
                ...options
            };

            console.log(`🌐 API ${config.method}: ${endpoint}`);
            
            const response = await fetch(url, config);
            return await this.handleResponse(response);
            
        } catch (error) {
            console.error(`❌ API Error (${endpoint}):`, error);
            throw error;
        }
    },

    // GET request
    async get(endpoint, params = {}) {
        let url = endpoint;
        
        // Add query parameters if any
        if (Object.keys(params).length > 0) {
            const searchParams = new URLSearchParams();
            Object.entries(params).forEach(([key, value]) => {
                if (value !== null && value !== undefined && value !== '') {
                    searchParams.append(key, value);
                }
            });
            
            const queryString = searchParams.toString();
            if (queryString) {
                url += `?${queryString}`;
            }
        }

        return await this.request(url, { method: 'GET' });
    },

    // POST request
    async post(endpoint, data = {}) {
        return await this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },

    // PUT request
    async put(endpoint, data = {}) {
        return await this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    },

    // PATCH request
    async patch(endpoint, data = {}) {
        return await this.request(endpoint, {
            method: 'PATCH',
            body: JSON.stringify(data)
        });
    },

    // DELETE request
    async delete(endpoint) {
        return await this.request(endpoint, { method: 'DELETE' });
    },

    // Upload file
    async upload(endpoint, formData) {
        try {
            const url = `${this.baseURL}${endpoint}`;
            const config = {
                method: 'POST',
                headers: {},
                body: formData
            };

            // Add authorization header if available
            if (typeof Auth !== 'undefined') {
                const token = Auth.getToken();
                if (token) {
                    config.headers.Authorization = `Bearer ${token}`;
                }
            }

            console.log(`📤 Upload: ${endpoint}`);
            
            const response = await fetch(url, config);
            return await this.handleResponse(response);
            
        } catch (error) {
            console.error(`❌ Upload Error (${endpoint}):`, error);
            throw error;
        }
    },

    // Check API health
    async checkHealth() {
        try {
            const response = await this.get('/health');
            console.log('✅ API Health Check:', response);
            return response;
        } catch (error) {
            console.error('❌ API Health Check Failed:', error);
            return null;
        }
    }
};

// API Service Methods for specific endpoints
API.auth = {
    login: (credentials) => API.post(CONFIG.ENDPOINTS.AUTH.LOGIN, credentials),
    register: (userData) => API.post(CONFIG.ENDPOINTS.AUTH.REGISTER, userData),
    logout: () => API.post(CONFIG.ENDPOINTS.AUTH.LOGOUT),
    getProfile: () => API.get(CONFIG.ENDPOINTS.AUTH.PROFILE),
    updateProfile: (data) => API.put(CONFIG.ENDPOINTS.AUTH.PROFILE, data),
    changePassword: (data) => API.put(CONFIG.ENDPOINTS.AUTH.CHANGE_PASSWORD, data)
};

API.rooms = {
    getAll: (params) => API.get(CONFIG.ENDPOINTS.ROOMS.GET_ALL, params),
    getById: (id) => API.get(CONFIG.ENDPOINTS.ROOMS.GET_BY_ID(id)),
    create: (data) => API.post(CONFIG.ENDPOINTS.ROOMS.CREATE, data),
    update: (id, data) => API.put(CONFIG.ENDPOINTS.ROOMS.UPDATE(id), data),
    delete: (id) => API.delete(CONFIG.ENDPOINTS.ROOMS.DELETE(id)),
    checkAvailability: (id, data) => API.post(CONFIG.ENDPOINTS.ROOMS.CHECK_AVAILABILITY(id), data)
};

API.bookings = {
    getUserBookings: (params) => API.get(CONFIG.ENDPOINTS.BOOKINGS.GET_USER_BOOKINGS, params),
    getById: (id) => API.get(CONFIG.ENDPOINTS.BOOKINGS.GET_BY_ID(id)),
    create: (data) => API.post(CONFIG.ENDPOINTS.BOOKINGS.CREATE, data),
    update: (id, data) => API.put(CONFIG.ENDPOINTS.BOOKINGS.UPDATE(id), data),
    cancel: (id, data) => API.put(CONFIG.ENDPOINTS.BOOKINGS.CANCEL(id), data),
    updatePayment: (id, data) => API.put(CONFIG.ENDPOINTS.BOOKINGS.PAYMENT(id), data),
    checkIn: (id) => API.put(CONFIG.ENDPOINTS.BOOKINGS.CHECKIN(id)),
    checkOut: (id) => API.put(CONFIG.ENDPOINTS.BOOKINGS.CHECKOUT(id))
};

API.admin = {
    getDashboard: () => API.get(CONFIG.ENDPOINTS.ADMIN.DASHBOARD),
    getUsers: (params) => API.get(CONFIG.ENDPOINTS.ADMIN.USERS, params),
    getBookings: (params) => API.get(CONFIG.ENDPOINTS.ADMIN.BOOKINGS, params),
    updateUserStatus: (id, data) => API.put(CONFIG.ENDPOINTS.ADMIN.USER_STATUS(id), data),
    getBookingAnalytics: (params) => API.get(CONFIG.ENDPOINTS.ADMIN.ANALYTICS_BOOKINGS, params),
    getRevenueAnalytics: (params) => API.get(CONFIG.ENDPOINTS.ADMIN.ANALYTICS_REVENUE, params),
    getSettings: () => API.get(CONFIG.ENDPOINTS.ADMIN.SETTINGS)
};

// Error handling utility
API.handleError = function(error, defaultMessage = 'An error occurred') {
    console.error('API Error:', error);
    
    if (error && error.message) {
        return error.message;
    }
    
    if (error && error.data && error.data.error) {
        return error.data.error;
    }
    
    switch (error?.status) {
        case 0:
            return CONFIG.ERROR_MESSAGES.NETWORK_ERROR;
        case 400:
            return CONFIG.ERROR_MESSAGES.VALIDATION_ERROR;
        case 401:
            return CONFIG.ERROR_MESSAGES.UNAUTHORIZED;
        case 403:
            return CONFIG.ERROR_MESSAGES.FORBIDDEN;
        case 404:
            return CONFIG.ERROR_MESSAGES.NOT_FOUND;
        case 500:
            return CONFIG.ERROR_MESSAGES.SERVER_ERROR;
        default:
            return defaultMessage;
    }
};

// Initialize API health check on page load
document.addEventListener('DOMContentLoaded', function() {
    // Check API health after a short delay
    setTimeout(() => {
        API.checkHealth().then(health => {
            if (health) {
                console.log('🎉 API is healthy and ready!');
                console.log('📊 Developer:', health.developer);
                console.log('👑 Team:', health.team);
            } else {
                console.warn('⚠️ API health check failed - backend may not be running');
                Toast.warning('Backend server may not be running. Please start the backend server.');
            }
        });
    }, 2000);
});

// Retry mechanism for failed requests
API.withRetry = async function(apiCall, maxRetries = 3, delay = 1000) {
    let lastError;
    
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await apiCall();
        } catch (error) {
            lastError = error;
            
            // Don't retry on client errors (4xx) except 429 (rate limit)
            if (error.status >= 400 && error.status < 500 && error.status !== 429) {
                throw error;
            }
            
            if (i < maxRetries - 1) {
                console.log(`Retrying API call... Attempt ${i + 2}/${maxRetries}`);
                await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
            }
        }
    }
    
    throw lastError;
};

// Batch request utility
API.batch = async function(requests) {
    try {
        const promises = requests.map(request => {
            const { method = 'GET', endpoint, data, params } = request;
            
            switch (method.toUpperCase()) {
                case 'GET':
                    return this.get(endpoint, params);
                case 'POST':
                    return this.post(endpoint, data);
                case 'PUT':
                    return this.put(endpoint, data);
                case 'DELETE':
                    return this.delete(endpoint);
                default:
                    throw new Error(`Unsupported method: ${method}`);
            }
        });
        
        const results = await Promise.allSettled(promises);
        
        return results.map((result, index) => ({
            index,
            request: requests[index],
            success: result.status === 'fulfilled',
            data: result.status === 'fulfilled' ? result.value : null,
            error: result.status === 'rejected' ? result.reason : null
        }));
        
    } catch (error) {
        console.error('Batch request error:', error);
        throw error;
    }
};

// Export API module
window.API = API;
