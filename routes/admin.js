/**
 * Admin Routes - Hotel Room Booking System
 * Developed by POORVAJAN G S
 * Final Year CSE Student at KSRIET
 * Leader of Team CODE CRAFTS
 */

const express = require('express');
const { body, query, validationResult } = require('express-validator');
const User = require('../models/User');
const Room = require('../models/Room');
const Booking = require('../models/Booking');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// All admin routes require authentication and admin role
router.use(protect);
router.use(authorize('admin'));

// @desc    Get admin dashboard stats
// @route   GET /api/admin/dashboard
// @access  Private (Admin only)
router.get('/dashboard', async (req, res) => {
    try {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfYear = new Date(now.getFullYear(), 0, 1);

        // Get basic counts
        const [totalUsers, totalRooms, totalBookings] = await Promise.all([
            User.countDocuments({ role: 'customer' }),
            Room.countDocuments({ isActive: true }),
            Booking.countDocuments()
        ]);

        // Get monthly stats
        const [monthlyBookings, monthlyRevenue] = await Promise.all([
            Booking.countDocuments({ 
                createdAt: { $gte: startOfMonth },
                status: { $in: ['confirmed', 'checked-in', 'checked-out'] }
            }),
            Booking.aggregate([
                {
                    $match: {
                        createdAt: { $gte: startOfMonth },
                        'payment.status': 'completed'
                    }
                },
                {
                    $group: {
                        _id: null,
                        total: { $sum: '$pricing.totalAmount' }
                    }
                }
            ])
        ]);

        // Get yearly revenue
        const yearlyRevenue = await Booking.aggregate([
            {
                $match: {
                    createdAt: { $gte: startOfYear },
                    'payment.status': 'completed'
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: '$pricing.totalAmount' }
                }
            }
        ]);

        // Get current occupancy
        const currentOccupancy = await Booking.countDocuments({
            status: 'checked-in',
            checkIn: { $lte: now },
            checkOut: { $gt: now }
        });

        // Get today's check-ins and check-outs
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const [todayCheckIns, todayCheckOuts] = await Promise.all([
            Booking.countDocuments({
                checkIn: { $gte: today, $lt: tomorrow },
                status: 'confirmed'
            }),
            Booking.countDocuments({
                checkOut: { $gte: today, $lt: tomorrow },
                status: 'checked-in'
            })
        ]);

        // Get popular room types
        const popularRoomTypes = await Booking.aggregate([
            {
                $match: {
                    createdAt: { $gte: startOfMonth },
                    status: { $in: ['confirmed', 'checked-in', 'checked-out'] }
                }
            },
            {
                $lookup: {
                    from: 'rooms',
                    localField: 'room',
                    foreignField: '_id',
                    as: 'roomData'
                }
            },
            {
                $unwind: '$roomData'
            },
            {
                $group: {
                    _id: '$roomData.roomType',
                    count: { $sum: 1 },
                    revenue: { $sum: '$pricing.totalAmount' }
                }
            },
            {
                $sort: { count: -1 }
            },
            {
                $limit: 5
            }
        ]);

        // Get recent bookings
        const recentBookings = await Booking.find()
            .populate('room', 'roomNumber roomType')
            .populate('user', 'firstName lastName email')
            .sort({ createdAt: -1 })
            .limit(10);

        res.json({
            success: true,
            data: {
                overview: {
                    totalUsers,
                    totalRooms,
                    totalBookings,
                    currentOccupancy,
                    occupancyRate: totalRooms > 0 ? ((currentOccupancy / totalRooms) * 100).toFixed(1) : 0
                },
                revenue: {
                    monthly: monthlyRevenue[0]?.total || 0,
                    yearly: yearlyRevenue[0]?.total || 0
                },
                bookings: {
                    monthly: monthlyBookings,
                    todayCheckIns,
                    todayCheckOuts
                },
                popularRoomTypes,
                recentBookings
            }
        });

    } catch (error) {
        console.error('Dashboard stats error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error fetching dashboard stats'
        });
    }
});

// @desc    Get all users
// @route   GET /api/admin/users
// @access  Private (Admin only)
router.get('/users', async (req, res) => {
    try {
        const { page = 1, limit = 20, search, role, isActive } = req.query;

        let query = {};
        
        if (search) {
            query.$or = [
                { firstName: { $regex: search, $options: 'i' } },
                { lastName: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }

        if (role) query.role = role;
        if (isActive !== undefined) query.isActive = isActive === 'true';

        const options = {
            page: parseInt(page),
            limit: parseInt(limit),
            sort: { createdAt: -1 }
        };

        const users = await User.find(query)
            .select('-password')
            .limit(options.limit * 1)
            .skip((options.page - 1) * options.limit)
            .sort(options.sort);

        const total = await User.countDocuments(query);

        res.json({
            success: true,
            count: users.length,
            total,
            page: options.page,
            pages: Math.ceil(total / options.limit),
            data: users
        });

    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error fetching users'
        });
    }
});

// @desc    Get all bookings (admin view)
// @route   GET /api/admin/bookings
// @access  Private (Admin only)
router.get('/bookings', async (req, res) => {
    try {
        const { 
            page = 1, 
            limit = 20, 
            status, 
            checkIn, 
            checkOut,
            search,
            sortBy = 'createdAt',
            order = 'desc'
        } = req.query;

        let query = {};
        
        if (status) query.status = status;
        
        if (checkIn || checkOut) {
            query.checkIn = {};
            if (checkIn) query.checkIn.$gte = new Date(checkIn);
            if (checkOut) query.checkIn.$lte = new Date(checkOut);
        }

        if (search) {
            // Search by booking number, guest name, or room number
            const users = await User.find({
                $or: [
                    { firstName: { $regex: search, $options: 'i' } },
                    { lastName: { $regex: search, $options: 'i' } },
                    { email: { $regex: search, $options: 'i' } }
                ]
            }).select('_id');

            const rooms = await Room.find({
                roomNumber: { $regex: search, $options: 'i' }
            }).select('_id');

            query.$or = [
                { bookingNumber: { $regex: search, $options: 'i' } },
                { user: { $in: users.map(u => u._id) } },
                { room: { $in: rooms.map(r => r._id) } }
            ];
        }

        const options = {
            page: parseInt(page),
            limit: parseInt(limit),
            sort: { [sortBy]: order === 'desc' ? -1 : 1 }
        };

        const bookings = await Booking.find(query)
            .populate('room', 'roomNumber roomType price')
            .populate('user', 'firstName lastName email phone')
            .limit(options.limit * 1)
            .skip((options.page - 1) * options.limit)
            .sort(options.sort);

        const total = await Booking.countDocuments(query);

        res.json({
            success: true,
            count: bookings.length,
            total,
            page: options.page,
            pages: Math.ceil(total / options.limit),
            data: bookings
        });

    } catch (error) {
        console.error('Get admin bookings error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error fetching bookings'
        });
    }
});

// @desc    Update user status (activate/deactivate)
// @route   PUT /api/admin/users/:id/status
// @access  Private (Admin only)
router.put('/users/:id/status', [
    body('isActive').isBoolean().withMessage('isActive must be a boolean')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                error: 'Validation failed',
                details: errors.array()
            });
        }

        const { isActive } = req.body;

        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        // Don't allow deactivating other admins
        if (user.role === 'admin' && !isActive) {
            return res.status(400).json({
                success: false,
                error: 'Cannot deactivate admin users'
            });
        }

        user.isActive = isActive;
        await user.save();

        res.json({
            success: true,
            message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
            data: {
                id: user._id,
                email: user.email,
                isActive: user.isActive
            }
        });

    } catch (error) {
        console.error('Update user status error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error updating user status'
        });
    }
});

// @desc    Get booking analytics
// @route   GET /api/admin/analytics/bookings
// @access  Private (Admin only)
router.get('/analytics/bookings', async (req, res) => {
    try {
        const { period = 'monthly', year = new Date().getFullYear() } = req.query;

        let groupBy, dateRange;
        
        if (period === 'daily') {
            // Last 30 days
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            
            groupBy = {
                $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
            };
            dateRange = { createdAt: { $gte: thirtyDaysAgo } };
        } else if (period === 'monthly') {
            // Current year by month
            groupBy = {
                $dateToString: { format: "%Y-%m", date: "$createdAt" }
            };
            dateRange = {
                createdAt: {
                    $gte: new Date(`${year}-01-01`),
                    $lt: new Date(`${parseInt(year) + 1}-01-01`)
                }
            };
        }

        const bookingAnalytics = await Booking.aggregate([
            { $match: dateRange },
            {
                $group: {
                    _id: groupBy,
                    totalBookings: { $sum: 1 },
                    confirmedBookings: {
                        $sum: {
                            $cond: [{ $in: ['$status', ['confirmed', 'checked-in', 'checked-out']] }, 1, 0]
                        }
                    },
                    cancelledBookings: {
                        $sum: {
                            $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0]
                        }
                    },
                    totalRevenue: {
                        $sum: {
                            $cond: [
                                { $eq: ['$payment.status', 'completed'] },
                                '$pricing.totalAmount',
                                0
                            ]
                        }
                    }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // Room type performance
        const roomTypeAnalytics = await Booking.aggregate([
            {
                $match: {
                    createdAt: { $gte: new Date(`${year}-01-01`) },
                    status: { $in: ['confirmed', 'checked-in', 'checked-out'] }
                }
            },
            {
                $lookup: {
                    from: 'rooms',
                    localField: 'room',
                    foreignField: '_id',
                    as: 'roomData'
                }
            },
            { $unwind: '$roomData' },
            {
                $group: {
                    _id: '$roomData.roomType',
                    bookings: { $sum: 1 },
                    revenue: { $sum: '$pricing.totalAmount' },
                    averageRate: { $avg: '$pricing.roomRate' }
                }
            },
            { $sort: { revenue: -1 } }
        ]);

        res.json({
            success: true,
            data: {
                bookingTrends: bookingAnalytics,
                roomTypePerformance: roomTypeAnalytics,
                period,
                year: parseInt(year)
            }
        });

    } catch (error) {
        console.error('Booking analytics error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error fetching booking analytics'
        });
    }
});

// @desc    Get revenue analytics
// @route   GET /api/admin/analytics/revenue
// @access  Private (Admin only)
router.get('/analytics/revenue', async (req, res) => {
    try {
        const { year = new Date().getFullYear() } = req.query;

        const revenueAnalytics = await Booking.aggregate([
            {
                $match: {
                    createdAt: {
                        $gte: new Date(`${year}-01-01`),
                        $lt: new Date(`${parseInt(year) + 1}-01-01`)
                    },
                    'payment.status': 'completed'
                }
            },
            {
                $group: {
                    _id: {
                        $dateToString: { format: "%Y-%m", date: "$createdAt" }
                    },
                    grossRevenue: { $sum: '$pricing.subtotal' },
                    taxes: { $sum: '$pricing.taxes' },
                    discounts: { $sum: '$pricing.discounts.amount' },
                    netRevenue: { $sum: '$pricing.totalAmount' },
                    bookingsCount: { $sum: 1 },
                    averageBookingValue: { $avg: '$pricing.totalAmount' }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // Calculate year-over-year comparison if previous year data exists
        const previousYearRevenue = await Booking.aggregate([
            {
                $match: {
                    createdAt: {
                        $gte: new Date(`${parseInt(year) - 1}-01-01`),
                        $lt: new Date(`${year}-01-01`)
                    },
                    'payment.status': 'completed'
                }
            },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: '$pricing.totalAmount' },
                    totalBookings: { $sum: 1 }
                }
            }
        ]);

        const currentYearTotal = revenueAnalytics.reduce((sum, month) => sum + month.netRevenue, 0);
        const previousYearTotal = previousYearRevenue[0]?.totalRevenue || 0;
        
        const yearOverYearGrowth = previousYearTotal > 0 
            ? ((currentYearTotal - previousYearTotal) / previousYearTotal * 100).toFixed(2)
            : 0;

        res.json({
            success: true,
            data: {
                monthlyRevenue: revenueAnalytics,
                summary: {
                    currentYearTotal,
                    previousYearTotal,
                    yearOverYearGrowth: parseFloat(yearOverYearGrowth)
                },
                year: parseInt(year)
            }
        });

    } catch (error) {
        console.error('Revenue analytics error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error fetching revenue analytics'
        });
    }
});

// @desc    Get system settings
// @route   GET /api/admin/settings
// @access  Private (Admin only)
router.get('/settings', async (req, res) => {
    try {
        const settings = {
            hotel: {
                name: 'Grand Hotel',
                address: '123 Main Street, City, State, ZIP',
                phone: '+91 9876543210',
                email: 'info@grandhotel.com',
                website: 'www.grandhotel.com'
            },
            booking: {
                cancellationPolicy: '24 hours before check-in for full refund',
                checkInTime: '15:00',
                checkOutTime: '11:00',
                maxAdvanceBookingDays: 365,
                minAdvanceBookingHours: 2
            },
            payment: {
                taxRate: 0.18, // 18% GST
                currency: 'INR',
                acceptedMethods: ['credit-card', 'debit-card', 'paypal', 'bank-transfer', 'upi']
            },
            system: {
                maintenanceMode: false,
                allowRegistration: true,
                requireEmailVerification: false
            }
        };

        res.json({
            success: true,
            data: settings
        });

    } catch (error) {
        console.error('Get settings error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error fetching settings'
        });
    }
});

module.exports = router;
