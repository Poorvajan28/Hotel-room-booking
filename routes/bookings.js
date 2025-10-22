/**
 * Booking Routes - Hotel Room Booking System
 * Developed by POORVAJAN G S
 * Final Year CSE Student at KSRIET
 * Leader of Team CODE CRAFTS
 */

const express = require('express');
const { body, query, validationResult } = require('express-validator');
const Booking = require('../models/Booking');
const Room = require('../models/Room');
const User = require('../models/User');
const { protect, authorize, ownerOrAdmin } = require('../middleware/auth');

const router = express.Router();

// @desc    Get user bookings
// @route   GET /api/bookings
// @access  Private
router.get('/', protect, async (req, res) => {
    try {
        const { page = 1, limit = 10, status, sortBy = 'createdAt', order = 'desc' } = req.query;

        let query = { user: req.user.id };
        
        if (status) {
            query.status = status;
        }

        const options = {
            page: parseInt(page),
            limit: parseInt(limit),
            sort: { [sortBy]: order === 'desc' ? -1 : 1 }
        };

        const bookings = await Booking.find(query)
            .populate('room', 'roomNumber roomType price images')
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
        console.error('Get bookings error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error fetching bookings'
        });
    }
});

// @desc    Get single booking
// @route   GET /api/bookings/:id
// @access  Private (Owner or Admin)
router.get('/:id', protect, async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id)
            .populate('room')
            .populate('user', 'firstName lastName email phone');

        if (!booking) {
            return res.status(404).json({
                success: false,
                error: 'Booking not found'
            });
        }

        // Check if user owns this booking or is admin
        if (booking.user._id.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                error: 'Access denied. You can only view your own bookings.'
            });
        }

        res.json({
            success: true,
            data: booking
        });

    } catch (error) {
        console.error('Get booking error:', error);
        
        if (error.name === 'CastError') {
            return res.status(404).json({
                success: false,
                error: 'Booking not found'
            });
        }

        res.status(500).json({
            success: false,
            error: 'Server error fetching booking'
        });
    }
});

// @desc    Create new booking
// @route   POST /api/bookings
// @access  Private
router.post('/', [
    protect,
    body('room').isMongoId().withMessage('Valid room ID is required'),
    body('checkIn').isISO8601().withMessage('Valid check-in date is required'),
    body('checkOut').isISO8601().withMessage('Valid check-out date is required'),
    body('guests.adults').isInt({ min: 1, max: 10 }).withMessage('Adults must be between 1 and 10'),
    body('guests.children').optional().isInt({ min: 0, max: 5 }).withMessage('Children must be between 0 and 5'),
    body('guestDetails.primaryGuest.firstName').trim().notEmpty().withMessage('Primary guest first name is required'),
    body('guestDetails.primaryGuest.lastName').trim().notEmpty().withMessage('Primary guest last name is required'),
    body('guestDetails.primaryGuest.email').isEmail().withMessage('Valid email is required'),
    body('guestDetails.primaryGuest.phone').matches(/^\d{10}$/).withMessage('Valid 10-digit phone number is required'),
    body('payment.method').isIn(['credit-card', 'debit-card', 'paypal', 'bank-transfer', 'cash', 'upi']).withMessage('Invalid payment method')
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
            room: roomId,
            checkIn,
            checkOut,
            guests,
            guestDetails,
            payment,
            specialRequests,
            preferences,
            notes
        } = req.body;

        const checkInDate = new Date(checkIn);
        const checkOutDate = new Date(checkOut);

        // Validate dates
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

        // Check if room exists and is active
        const room = await Room.findById(roomId);
        if (!room || !room.isActive) {
            return res.status(404).json({
                success: false,
                error: 'Room not found or not available'
            });
        }

        // Check room capacity
        const totalGuests = guests.adults + (guests.children || 0);
        if (totalGuests > room.totalCapacity) {
            return res.status(400).json({
                success: false,
                error: `Room can accommodate maximum ${room.totalCapacity} guests`
            });
        }

        // Check room availability
        const isAvailable = await room.isAvailableForDates(checkInDate, checkOutDate);
        if (!isAvailable) {
            return res.status(400).json({
                success: false,
                error: 'Room is not available for the selected dates'
            });
        }

        // Calculate pricing
        const nights = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));
        const roomRate = room.price;
        const subtotal = roomRate * nights;
        const taxes = subtotal * 0.18; // 18% GST
        const totalAmount = subtotal + taxes;

        // Create booking
        const booking = await Booking.create({
            user: req.user.id,
            room: roomId,
            checkIn: checkInDate,
            checkOut: checkOutDate,
            guests,
            guestDetails,
            pricing: {
                roomRate,
                numberOfNights: nights,
                subtotal,
                taxes,
                totalAmount
            },
            payment: {
                method: payment.method,
                status: 'pending'
            },
            specialRequests: specialRequests || [],
            preferences: preferences || {},
            notes: notes || {},
            status: 'pending'
        });

        // Populate the created booking
        await booking.populate('room', 'roomNumber roomType price images');
        await booking.populate('user', 'firstName lastName email phone');

        // Add loyalty points to user (1 point per 100 rupees spent)
        const loyaltyPoints = Math.floor(totalAmount / 100);
        await User.findByIdAndUpdate(req.user.id, {
            $inc: { loyaltyPoints: loyaltyPoints }
        });

        res.status(201).json({
            success: true,
            message: 'Booking created successfully',
            data: booking
        });

    } catch (error) {
        console.error('Create booking error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error creating booking'
        });
    }
});

// @desc    Update booking
// @route   PUT /api/bookings/:id
// @access  Private (Owner or Admin)
router.put('/:id', [
    protect,
    body('checkIn').optional().isISO8601().withMessage('Valid check-in date is required'),
    body('checkOut').optional().isISO8601().withMessage('Valid check-out date is required'),
    body('guests.adults').optional().isInt({ min: 1, max: 10 }).withMessage('Adults must be between 1 and 10'),
    body('guests.children').optional().isInt({ min: 0, max: 5 }).withMessage('Children must be between 0 and 5'),
    body('guestDetails.primaryGuest.firstName').optional().trim().notEmpty().withMessage('Primary guest first name cannot be empty'),
    body('guestDetails.primaryGuest.lastName').optional().trim().notEmpty().withMessage('Primary guest last name cannot be empty'),
    body('guestDetails.primaryGuest.email').optional().isEmail().withMessage('Valid email is required'),
    body('guestDetails.primaryGuest.phone').optional().matches(/^\d{10}$/).withMessage('Valid 10-digit phone number is required')
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

        const booking = await Booking.findById(req.params.id);

        if (!booking) {
            return res.status(404).json({
                success: false,
                error: 'Booking not found'
            });
        }

        // Check if user owns this booking or is admin
        if (booking.user.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                error: 'Access denied. You can only modify your own bookings.'
            });
        }

        // Check if booking can be modified
        if (['checked-in', 'checked-out', 'cancelled'].includes(booking.status)) {
            return res.status(400).json({
                success: false,
                error: 'Cannot modify booking in current status'
            });
        }

        // If dates are being changed, validate availability
        if (req.body.checkIn || req.body.checkOut) {
            const newCheckIn = req.body.checkIn ? new Date(req.body.checkIn) : booking.checkIn;
            const newCheckOut = req.body.checkOut ? new Date(req.body.checkOut) : booking.checkOut;

            if (newCheckIn >= newCheckOut) {
                return res.status(400).json({
                    success: false,
                    error: 'Check-out date must be after check-in date'
                });
            }

            if (newCheckIn < new Date().setHours(0, 0, 0, 0)) {
                return res.status(400).json({
                    success: false,
                    error: 'Check-in date cannot be in the past'
                });
            }

            // Check availability for new dates (excluding current booking)
            const conflictingBookings = await Booking.findOverlapping(
                booking.room,
                newCheckIn,
                newCheckOut,
                booking._id
            );

            if (conflictingBookings.length > 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Room is not available for the new dates'
                });
            }

            // Recalculate pricing if dates changed
            const room = await Room.findById(booking.room);
            const nights = Math.ceil((newCheckOut - newCheckIn) / (1000 * 60 * 60 * 24));
            const roomRate = room.price;
            const subtotal = roomRate * nights;
            const taxes = subtotal * 0.18;
            const totalAmount = subtotal + taxes - (booking.pricing.discounts.amount || 0);

            req.body.pricing = {
                ...booking.pricing,
                numberOfNights: nights,
                subtotal,
                taxes,
                totalAmount
            };
        }

        const updatedBooking = await Booking.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        ).populate('room', 'roomNumber roomType price images')
         .populate('user', 'firstName lastName email phone');

        res.json({
            success: true,
            message: 'Booking updated successfully',
            data: updatedBooking
        });

    } catch (error) {
        console.error('Update booking error:', error);
        
        if (error.name === 'CastError') {
            return res.status(404).json({
                success: false,
                error: 'Booking not found'
            });
        }

        res.status(500).json({
            success: false,
            error: 'Server error updating booking'
        });
    }
});

// @desc    Cancel booking
// @route   PUT /api/bookings/:id/cancel
// @access  Private (Owner or Admin)
router.put('/:id/cancel', [
    protect,
    body('reason').optional().trim().isLength({ max: 500 }).withMessage('Reason cannot exceed 500 characters')
], async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id);

        if (!booking) {
            return res.status(404).json({
                success: false,
                error: 'Booking not found'
            });
        }

        // Check if user owns this booking or is admin
        if (booking.user.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                error: 'Access denied. You can only cancel your own bookings.'
            });
        }

        // Check if booking can be cancelled
        if (!booking.canBeCancelled()) {
            return res.status(400).json({
                success: false,
                error: 'Booking cannot be cancelled (already cancelled, checked-out, or within 24 hours of check-in)'
            });
        }

        // Calculate refund
        const refundAmount = booking.calculateRefund();
        let refundStatus = 'none';
        
        if (refundAmount === booking.pricing.totalAmount) {
            refundStatus = 'full';
        } else if (refundAmount > 0) {
            refundStatus = 'partial';
        }

        // Update booking
        booking.status = 'cancelled';
        booking.cancellation = {
            isCancelled: true,
            cancelledAt: new Date(),
            cancelledBy: req.user.id,
            reason: req.body.reason || 'Cancelled by customer',
            refundStatus
        };

        if (refundAmount > 0) {
            booking.payment.refundAmount = refundAmount;
            booking.payment.refundDate = new Date();
        }

        await booking.save();

        res.json({
            success: true,
            message: 'Booking cancelled successfully',
            refundAmount,
            refundStatus,
            data: booking
        });

    } catch (error) {
        console.error('Cancel booking error:', error);
        
        if (error.name === 'CastError') {
            return res.status(404).json({
                success: false,
                error: 'Booking not found'
            });
        }

        res.status(500).json({
            success: false,
            error: 'Server error cancelling booking'
        });
    }
});

// @desc    Confirm payment
// @route   PUT /api/bookings/:id/payment
// @access  Private (Owner or Admin)
router.put('/:id/payment', [
    protect,
    body('status').isIn(['completed', 'failed']).withMessage('Status must be completed or failed'),
    body('transactionId').optional().trim().notEmpty().withMessage('Transaction ID cannot be empty'),
    body('paidAmount').optional().isFloat({ min: 0 }).withMessage('Paid amount must be positive')
], async (req, res) => {
    try {
        const { status, transactionId, paidAmount } = req.body;

        const booking = await Booking.findById(req.params.id);

        if (!booking) {
            return res.status(404).json({
                success: false,
                error: 'Booking not found'
            });
        }

        // Check if user owns this booking or is admin
        if (booking.user.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                error: 'Access denied'
            });
        }

        // Update payment status
        booking.payment.status = status;
        booking.payment.paymentDate = new Date();
        
        if (transactionId) booking.payment.transactionId = transactionId;
        if (paidAmount) booking.payment.paidAmount = paidAmount;

        // Update booking status based on payment
        if (status === 'completed') {
            booking.status = 'confirmed';
        } else if (status === 'failed') {
            booking.status = 'cancelled';
        }

        await booking.save();

        res.json({
            success: true,
            message: `Payment ${status} successfully`,
            data: booking
        });

    } catch (error) {
        console.error('Update payment error:', error);
        
        if (error.name === 'CastError') {
            return res.status(404).json({
                success: false,
                error: 'Booking not found'
            });
        }

        res.status(500).json({
            success: false,
            error: 'Server error updating payment'
        });
    }
});

// @desc    Check-in booking
// @route   PUT /api/bookings/:id/checkin
// @access  Private (Admin only)
router.put('/:id/checkin', protect, authorize('admin'), async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id);

        if (!booking) {
            return res.status(404).json({
                success: false,
                error: 'Booking not found'
            });
        }

        if (booking.status !== 'confirmed') {
            return res.status(400).json({
                success: false,
                error: 'Only confirmed bookings can be checked in'
            });
        }

        booking.status = 'checked-in';
        booking.checkInTime = new Date();
        await booking.save();

        res.json({
            success: true,
            message: 'Guest checked in successfully',
            data: booking
        });

    } catch (error) {
        console.error('Check-in error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error during check-in'
        });
    }
});

// @desc    Check-out booking
// @route   PUT /api/bookings/:id/checkout
// @access  Private (Admin only)
router.put('/:id/checkout', protect, authorize('admin'), async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id);

        if (!booking) {
            return res.status(404).json({
                success: false,
                error: 'Booking not found'
            });
        }

        if (booking.status !== 'checked-in') {
            return res.status(400).json({
                success: false,
                error: 'Only checked-in bookings can be checked out'
            });
        }

        booking.status = 'checked-out';
        booking.checkOutTime = new Date();
        await booking.save();

        res.json({
            success: true,
            message: 'Guest checked out successfully',
            data: booking
        });

    } catch (error) {
        console.error('Check-out error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error during check-out'
        });
    }
});

module.exports = router;
