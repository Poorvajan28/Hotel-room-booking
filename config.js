/**
 * Configuration File - Hotel Room Booking System
 * Developed by POORVAJAN G S
 * Final Year CSE Student at KSRIET
 * Leader of Team CODE CRAFTS
 */

// API Configuration
const CONFIG = {
    // Base URL for API endpoints
    API_BASE_URL: 'http://localhost:5000/api',
    
    // API Endpoints
    ENDPOINTS: {
        // Authentication
        AUTH: {
            LOGIN: '/auth/login',
            REGISTER: '/auth/register',
            PROFILE: '/auth/profile',
            LOGOUT: '/auth/logout',
            CHANGE_PASSWORD: '/auth/change-password'
        },
        
        // Rooms
        ROOMS: {
            GET_ALL: '/rooms',
            GET_BY_ID: (id) => `/rooms/${id}`,
            CREATE: '/rooms',
            UPDATE: (id) => `/rooms/${id}`,
            DELETE: (id) => `/rooms/${id}`,
            CHECK_AVAILABILITY: (id) => `/rooms/${id}/availability`
        },
        
        // Bookings
        BOOKINGS: {
            GET_USER_BOOKINGS: '/bookings',
            GET_BY_ID: (id) => `/bookings/${id}`,
            CREATE: '/bookings',
            UPDATE: (id) => `/bookings/${id}`,
            CANCEL: (id) => `/bookings/${id}/cancel`,
            PAYMENT: (id) => `/bookings/${id}/payment`,
            CHECKIN: (id) => `/bookings/${id}/checkin`,
            CHECKOUT: (id) => `/bookings/${id}/checkout`
        },
        
        // Admin
        ADMIN: {
            DASHBOARD: '/admin/dashboard',
            USERS: '/admin/users',
            BOOKINGS: '/admin/bookings',
            USER_STATUS: (id) => `/admin/users/${id}/status`,
            ANALYTICS_BOOKINGS: '/admin/analytics/bookings',
            ANALYTICS_REVENUE: '/admin/analytics/revenue',
            SETTINGS: '/admin/settings'
        }
    },
    
    // Local Storage Keys
    STORAGE_KEYS: {
        TOKEN: 'hotel_booking_token',
        USER: 'hotel_booking_user',
        SEARCH_PARAMS: 'hotel_booking_search'
    },
    
    // Application Settings
    SETTINGS: {
        // Pagination
        DEFAULT_PAGE_SIZE: 12,
        MAX_PAGE_SIZE: 100,
        
        // Date formats
        DATE_FORMAT: 'YYYY-MM-DD',
        DATETIME_FORMAT: 'YYYY-MM-DD HH:mm:ss',
        
        // File upload limits
        MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
        ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
        
        // Form validation
        MIN_PASSWORD_LENGTH: 6,
        PHONE_PATTERN: /^\d{10}$/,
        EMAIL_PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        
        // Booking constraints
        MIN_BOOKING_DAYS: 1,
        MAX_BOOKING_DAYS: 30,
        MAX_ADVANCE_BOOKING_DAYS: 365,
        MIN_ADVANCE_BOOKING_HOURS: 2,
        
        // Toast notifications
        TOAST_DURATION: 5000, // 5 seconds
        
        // Animation durations
        ANIMATION_FAST: 150,
        ANIMATION_NORMAL: 300,
        ANIMATION_SLOW: 500
    },
    
    // Room Types
    ROOM_TYPES: {
        single: 'Single Room',
        double: 'Double Room',
        suite: 'Suite',
        deluxe: 'Deluxe Room',
        presidential: 'Presidential Suite'
    },
    
    // Booking Status
    BOOKING_STATUS: {
        pending: 'Pending',
        confirmed: 'Confirmed',
        'checked-in': 'Checked In',
        'checked-out': 'Checked Out',
        cancelled: 'Cancelled',
        'no-show': 'No Show'
    },
    
    // Payment Methods
    PAYMENT_METHODS: {
        'credit-card': 'Credit Card',
        'debit-card': 'Debit Card',
        'paypal': 'PayPal',
        'bank-transfer': 'Bank Transfer',
        'cash': 'Cash',
        'upi': 'UPI'
    },
    
    // User Roles
    USER_ROLES: {
        customer: 'Customer',
        admin: 'Administrator'
    },
    
    // Error Messages
    ERROR_MESSAGES: {
        NETWORK_ERROR: 'Network error. Please check your connection.',
        UNAUTHORIZED: 'You are not authorized to perform this action.',
        FORBIDDEN: 'Access denied. Please contact administrator.',
        NOT_FOUND: 'Resource not found.',
        SERVER_ERROR: 'Server error. Please try again later.',
        VALIDATION_ERROR: 'Please check your input and try again.',
        TOKEN_EXPIRED: 'Your session has expired. Please login again.',
        UNKNOWN_ERROR: 'An unexpected error occurred.'
    },
    
    // Success Messages
    SUCCESS_MESSAGES: {
        LOGIN: 'Login successful!',
        LOGOUT: 'Logged out successfully!',
        REGISTER: 'Registration successful!',
        BOOKING_CREATED: 'Booking created successfully!',
        BOOKING_CANCELLED: 'Booking cancelled successfully!',
        PROFILE_UPDATED: 'Profile updated successfully!',
        PASSWORD_CHANGED: 'Password changed successfully!',
        ROOM_CREATED: 'Room created successfully!',
        ROOM_UPDATED: 'Room updated successfully!',
        ROOM_DELETED: 'Room deleted successfully!'
    },
    
    // Validation Rules
    VALIDATION: {
        firstName: {
            minLength: 2,
            maxLength: 50,
            pattern: /^[a-zA-Z\s]+$/,
            message: 'First name should be 2-50 characters and contain only letters'
        },
        lastName: {
            minLength: 2,
            maxLength: 50,
            pattern: /^[a-zA-Z\s]+$/,
            message: 'Last name should be 2-50 characters and contain only letters'
        },
        email: {
            pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
            message: 'Please enter a valid email address'
        },
        phone: {
            pattern: /^\d{10}$/,
            message: 'Please enter a valid 10-digit phone number'
        },
        password: {
            minLength: 6,
            pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
            message: 'Password must be at least 6 characters with uppercase, lowercase, and number'
        }
    },
    
    // Feature Flags
    FEATURES: {
        DARK_MODE: false,
        OFFLINE_SUPPORT: false,
        PUSH_NOTIFICATIONS: false,
        SOCIAL_LOGIN: false,
        MULTI_LANGUAGE: false,
        ACCESSIBILITY: true
    },
    
    // Developer Information
    DEVELOPER_INFO: {
        name: 'POORVAJAN G S',
        title: 'Final Year CSE Student at KSRIET',
        role: 'Leader of Team CODE CRAFTS',
        email: 'poorvajan@gmail.com',
        github: 'https://github.com/poorvajan',
        linkedin: 'https://linkedin.com/in/poorvajan',
        portfolio: 'https://poorvajan.dev'
    }
};

// Utility function to get full API URL
CONFIG.getApiUrl = function(endpoint) {
    return this.API_BASE_URL + endpoint;
};

// Utility function to format date
CONFIG.formatDate = function(date, format = this.SETTINGS.DATE_FORMAT) {
    if (!date) return '';
    
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    
    return format
        .replace('YYYY', year)
        .replace('MM', month)
        .replace('DD', day)
        .replace('HH', hours)
        .replace('mm', minutes)
        .replace('ss', seconds);
};

// Utility function to validate data
CONFIG.validate = function(field, value) {
    const rule = this.VALIDATION[field];
    if (!rule) return { valid: true };
    
    // Check required
    if (!value || value.trim() === '') {
        return { valid: false, message: `${field} is required` };
    }
    
    // Check minimum length
    if (rule.minLength && value.length < rule.minLength) {
        return { valid: false, message: rule.message || `${field} must be at least ${rule.minLength} characters` };
    }
    
    // Check maximum length
    if (rule.maxLength && value.length > rule.maxLength) {
        return { valid: false, message: rule.message || `${field} must be at most ${rule.maxLength} characters` };
    }
    
    // Check pattern
    if (rule.pattern && !rule.pattern.test(value)) {
        return { valid: false, message: rule.message || `${field} format is invalid` };
    }
    
    return { valid: true };
};

// Export CONFIG for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
} else {
    window.CONFIG = CONFIG;
}
