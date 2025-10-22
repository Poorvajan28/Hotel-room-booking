/**
 * Room Routes - Hotel Room Booking System
 * Developed by POORVAJAN G S
 * Final Year CSE Student at KSRIET
 * Leader of Team CODE CRAFTS
 */

const express = require('express');
const { body, query, validationResult } = require('express-validator');
const Room = require('../models/Room');
const Booking = require('../models/Booking');
const { protect, authorize, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// @desc    Get all rooms with filtering and search
// @route   GET /api/rooms
// @access  Public
router.get('/', [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('roomType').optional().isIn(['single', 'double', 'suite', 'deluxe', 'presidential']).withMessage('Invalid room type'),
    query('minPrice').optional().isFloat({ min: 0 }).withMessage('Min price must be a positive number'),
    query('maxPrice').optional().isFloat({ min: 0 }).withMessage('Max price must be a positive number'),
    query('adults').optional().isInt({ min: 1, max: 10 }).withMessage('Adults must be between 1 and 10'),
    query('children').optional().isInt({ min: 0, max: 5 }).withMessage('Children must be between 0 and 5'),
    query('checkIn').optional().isISO8601().withMessage('Check-in must be a valid date'),
    query('checkOut').optional().isISO8601().withMessage('Check-out must be a valid date')
], async (req, res) => {
    try {
        // Check validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                error: 'Validation failed',
                details: errors.array()
            });
        }

        const {
            page = 1,
            limit = 12,
            roomType,
            minPrice,
            maxPrice,
            adults,
            children,
            checkIn,
            checkOut,
            amenities,
            search
        } = req.query;

        // Build query object
        let query = { isActive: true };

        if (roomType) query.roomType = roomType;
        if (minPrice || maxPrice) {
            query.price = {};
            if (minPrice) query.price.$gte = parseFloat(minPrice);
            if (maxPrice) query.price.$lte = parseFloat(maxPrice);
        }

        if (adults || children) {
            if (adults) query['capacity.adults'] = { $gte: parseInt(adults) };
            if (children) query['capacity.children'] = { $gte: parseInt(children) };
        }

        if (amenities) {
            const amenitiesArray = amenities.split(',');
            query.amenities = { $all: amenitiesArray };
        }

        if (search) {
            query.$or = [
                { roomNumber: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
                { roomType: { $regex: search, $options: 'i' } }
            ];
        }

        // If dates are provided, find available rooms
        if (checkIn && checkOut) {
            const checkInDate = new Date(checkIn);
            const checkOutDate = new Date(checkOut);

            if (checkInDate >= checkOutDate) {
                return res.status(400).json({
                    success: false,
                    error: 'Check-out date must be after check-in date'
                });
            }

            const availableRooms = await Room.findAvailable(checkInDate, checkOutDate, query);
            
            const pageNum = parseInt(page);
            const limitNum = parseInt(limit);
            const startIndex = (pageNum - 1) * limitNum;
            
            const paginatedRooms = availableRooms.slice(startIndex, startIndex + limitNum);
            
            return res.json({
                success: true,
                count: paginatedRooms.length,
                total: availableRooms.length,
                page: pageNum,
                pages: Math.ceil(availableRooms.length / limitNum),
                data: paginatedRooms
            });
        }

        // Regular pagination for all rooms
        const options = {
            page: parseInt(page),
            limit: parseInt(limit),
            sort: { createdAt: -1 }
        };

        const rooms = await Room.find(query)
            .limit(options.limit * 1)
            .skip((options.page - 1) * options.limit)
            .sort(options.sort);

        const total = await Room.countDocuments(query);

        res.json({
            success: true,
            count: rooms.length,
            total,
            page: options.page,
            pages: Math.ceil(total / options.limit),
            data: rooms
        });

    } catch (error) {
        console.error('Get rooms error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error fetching rooms'
        });
    }
});

// @desc    Get single room
// @route   GET /api/rooms/:id
// @access  Public
router.get('/:id', optionalAuth, async (req, res) => {
    try {
        const room = await Room.findById(req.params.id);

        if (!room) {
            return res.status(404).json({
                success: false,
                error: 'Room not found'
            });
        }

        // Get recent reviews/bookings if user is authenticated
        let recentBookings = [];
        if (req.user) {
            recentBookings = await Booking.find({
                room: room._id,
                user: req.user._id,
                status: { $in: ['completed', 'checked-out'] }
            }).select('rating review checkOut').sort({ checkOut: -1 }).limit(5);
        }

        res.json({
            success: true,
            data: room,
            userBookings: recentBookings
        });

    } catch (error) {
        console.error('Get room error:', error);
        
        if (error.name === 'CastError') {
            return res.status(404).json({
                success: false,
                error: 'Room not found'
            });
        }

        res.status(500).json({
            success: false,
            error: 'Server error fetching room'
        });
    }
});

// @desc    Create new room
// @route   POST /api/rooms
// @access  Private (Admin only)
router.post('/', [
    protect,
    authorize('admin'),
    body('roomNumber').trim().notEmpty().withMessage('Room number is required'),
    body('roomType').isIn(['single', 'double', 'suite', 'deluxe', 'presidential']).withMessage('Invalid room type'),
    body('description').trim().isLength({ min: 10, max: 1000 }).withMessage('Description must be 10-1000 characters'),
    body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
    body('capacity.adults').isInt({ min: 1, max: 10 }).withMessage('Adults capacity must be between 1 and 10'),
    body('capacity.children').optional().isInt({ min: 0, max: 5 }).withMessage('Children capacity must be between 0 and 5'),
    body('bedType').isIn(['single', 'double', 'queen', 'king', 'twin']).withMessage('Invalid bed type'),
    body('floor').isInt({ min: 1, max: 50 }).withMessage('Floor must be between 1 and 50')
], async (req, res) => {
    try {
        // Check validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                error: 'Validation failed',
                details: errors.array()
            });
        }

        // Check if room number already exists
        const existingRoom = await Room.findOne({ roomNumber: req.body.roomNumber });
        if (existingRoom) {
            return res.status(400).json({
                success: false,
                error: 'Room number already exists'
            });
        }

        const room = await Room.create(req.body);

        res.status(201).json({
            success: true,
            message: 'Room created successfully',
            data: room
        });

    } catch (error) {
        console.error('Create room error:', error);
        
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                error: 'Room number already exists'
            });
        }

        res.status(500).json({
            success: false,
            error: 'Server error creating room'
        });
    }
});

// @desc    Update room
// @route   PUT /api/rooms/:id
// @access  Private (Admin only)
router.put('/:id', [
    protect,
    authorize('admin'),
    body('roomNumber').optional().trim().notEmpty().withMessage('Room number cannot be empty'),
    body('roomType').optional().isIn(['single', 'double', 'suite', 'deluxe', 'presidential']).withMessage('Invalid room type'),
    body('description').optional().trim().isLength({ min: 10, max: 1000 }).withMessage('Description must be 10-1000 characters'),
    body('price').optional().isFloat({ min: 0 }).withMessage('Price must be a positive number'),
    body('capacity.adults').optional().isInt({ min: 1, max: 10 }).withMessage('Adults capacity must be between 1 and 10'),
    body('capacity.children').optional().isInt({ min: 0, max: 5 }).withMessage('Children capacity must be between 0 and 5'),
    body('bedType').optional().isIn(['single', 'double', 'queen', 'king', 'twin']).withMessage('Invalid bed type'),
    body('floor').optional().isInt({ min: 1, max: 50 }).withMessage('Floor must be between 1 and 50')
], async (req, res) => {
    try {
        // Check validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                error: 'Validation failed',
                details: errors.array()
            });
        }

        let room = await Room.findById(req.params.id);

        if (!room) {
            return res.status(404).json({
                success: false,
                error: 'Room not found'
            });
        }

        // Check if room number is being changed and if it already exists
        if (req.body.roomNumber && req.body.roomNumber !== room.roomNumber) {
            const existingRoom = await Room.findOne({ roomNumber: req.body.roomNumber });
            if (existingRoom) {
                return res.status(400).json({
                    success: false,
                    error: 'Room number already exists'
                });
            }
        }

        room = await Room.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        res.json({
            success: true,
            message: 'Room updated successfully',
            data: room
        });

    } catch (error) {
        console.error('Update room error:', error);
        
        if (error.name === 'CastError') {
            return res.status(404).json({
                success: false,
                error: 'Room not found'
            });
        }

        res.status(500).json({
            success: false,
            error: 'Server error updating room'
        });
    }
});

// @desc    Delete room
// @route   DELETE /api/rooms/:id
// @access  Private (Admin only)
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
    try {
        const room = await Room.findById(req.params.id);

        if (!room) {
            return res.status(404).json({
                success: false,
                error: 'Room not found'
            });
        }

        // Check for active bookings
        const activeBookings = await Booking.find({
            room: room._id,
            status: { $in: ['confirmed', 'checked-in'] },
            checkOut: { $gte: new Date() }
        });

        if (activeBookings.length > 0) {
            return res.status(400).json({
                success: false,
                error: 'Cannot delete room with active bookings'
            });
        }

        // Soft delete - set as inactive
        room.isActive = false;
        await room.save();

        res.json({
            success: true,
            message: 'Room deleted successfully'
        });

    } catch (error) {
        console.error('Delete room error:', error);
        
        if (error.name === 'CastError') {
            return res.status(404).json({
                success: false,
                error: 'Room not found'
            });
        }

        res.status(500).json({
            success: false,
            error: 'Server error deleting room'
        });
    }
});

// @desc    Check room availability
// @route   POST /api/rooms/:id/availability
// @access  Public
router.post('/:id/availability', [
    body('checkIn').isISO8601().withMessage('Check-in must be a valid date'),
    body('checkOut').isISO8601().withMessage('Check-out must be a valid date')
], async (req, res) => {
    try {
        // Check validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                error: 'Validation failed',
                details: errors.array()
            });
        }

        const { checkIn, checkOut } = req.body;
        const checkInDate = new Date(checkIn);
        const checkOutDate = new Date(checkOut);

        if (checkInDate >= checkOutDate) {
            return res.status(400).json({
                success: false,
                error: 'Check-out date must be after check-in date'
            });
        }

        if (checkInDate < new Date().setHours(0, 0, 0, 0)) {
            return res.status(400).json({
                success: false,
                error: 'Check-in date cannot be in the past'
            });
        }

        const room = await Room.findById(req.params.id);

        if (!room) {
            return res.status(404).json({
                success: false,
                error: 'Room not found'
            });
        }

        const isAvailable = await room.isAvailableForDates(checkInDate, checkOutDate);

        res.json({
            success: true,
            available: isAvailable,
            room: {
                id: room._id,
                roomNumber: room.roomNumber,
                roomType: room.roomType,
                price: room.price
            },
            dates: {
                checkIn: checkInDate,
                checkOut: checkOutDate,
                nights: Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24))
            }
        });

    } catch (error) {
        console.error('Check availability error:', error);
        
        if (error.name === 'CastError') {
            return res.status(404).json({
                success: false,
                error: 'Room not found'
            });
        }

        res.status(500).json({
            success: false,
            error: 'Server error checking availability'
        });
    }
});

module.exports = router;
