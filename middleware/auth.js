/**
 * Authentication Middleware - Hotel Room Booking System
 * Developed by POORVAJAN G S
 * Final Year CSE Student at KSRIET
 * Leader of Team CODE CRAFTS
 */

const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Protect routes - verify JWT token
const protect = async (req, res, next) => {
    try {
        let token;
        
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }
        
        if (!token) {
            return res.status(401).json({
                success: false,
                error: 'Access denied. No token provided.'
            });
        }
        
        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Get user from token
        const user = await User.findById(decoded.id).select('-password');
        
        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'Token is no longer valid'
            });
        }
        
        if (!user.isActive) {
            return res.status(401).json({
                success: false,
                error: 'User account is deactivated'
            });
        }
        
        req.user = user;
        next();
        
    } catch (error) {
        console.error('Auth middleware error:', error);
        
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                error: 'Invalid token'
            });
        }
        
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                error: 'Token expired'
            });
        }
        
        res.status(500).json({
            success: false,
            error: 'Server error during authentication'
        });
    }
};

// Authorize roles
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                error: `User role '${req.user.role}' is not authorized to access this route`
            });
        }
        next();
    };
};

// Optional authentication - doesn't fail if no token
const optionalAuth = async (req, res, next) => {
    try {
        let token;
        
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
            
            if (token) {
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                const user = await User.findById(decoded.id).select('-password');
                
                if (user && user.isActive) {
                    req.user = user;
                }
            }
        }
        
        next();
        
    } catch (error) {
        // Continue without authentication if token is invalid
        next();
    }
};

// Rate limiting for sensitive operations
const rateLimiter = (maxAttempts = 5, timeWindow = 15 * 60 * 1000) => {
    const attempts = new Map();
    
    return (req, res, next) => {
        const key = req.ip + (req.user ? req.user._id : '');
        const now = Date.now();
        
        if (!attempts.has(key)) {
            attempts.set(key, []);
        }
        
        const userAttempts = attempts.get(key);
        
        // Remove old attempts outside the time window
        while (userAttempts.length > 0 && now - userAttempts[0] > timeWindow) {
            userAttempts.shift();
        }
        
        if (userAttempts.length >= maxAttempts) {
            return res.status(429).json({
                success: false,
                error: 'Too many requests. Please try again later.',
                retryAfter: Math.ceil((userAttempts[0] + timeWindow - now) / 1000)
            });
        }
        
        userAttempts.push(now);
        next();
    };
};

// Check if user owns resource or is admin
const ownerOrAdmin = (req, res, next) => {
    if (req.user.role === 'admin' || req.user._id.toString() === req.params.userId) {
        return next();
    }
    
    return res.status(403).json({
        success: false,
        error: 'Access denied. You can only access your own resources.'
    });
};

module.exports = {
    protect,
    authorize,
    optionalAuth,
    rateLimiter,
    ownerOrAdmin
};
