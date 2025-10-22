/**
 * Booking Model - Hotel Room Booking System
 * Developed by POORVAJAN G S
 * Final Year CSE Student at KSRIET
 * Leader of Team CODE CRAFTS
 */

const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
    bookingNumber: {
        type: String,
        unique: true,
        required: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'User is required for booking']
    },
    room: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Room',
        required: [true, 'Room is required for booking']
    },
    checkIn: {
        type: Date,
        required: [true, 'Check-in date is required'],
        validate: {
            validator: function(value) {
                return value >= new Date().setHours(0, 0, 0, 0);
            },
            message: 'Check-in date cannot be in the past'
        }
    },
    checkOut: {
        type: Date,
        required: [true, 'Check-out date is required'],
        validate: {
            validator: function(value) {
                return value > this.checkIn;
            },
            message: 'Check-out date must be after check-in date'
        }
    },
    guests: {
        adults: {
            type: Number,
            required: true,
            min: [1, 'At least one adult is required'],
            max: [10, 'Maximum 10 adults allowed']
        },
        children: {
            type: Number,
            default: 0,
            min: [0, 'Children count cannot be negative'],
            max: [5, 'Maximum 5 children allowed']
        }
    },
    guestDetails: {
        primaryGuest: {
            firstName: {
                type: String,
                required: true,
                trim: true
            },
            lastName: {
                type: String,
                required: true,
                trim: true
            },
            email: {
                type: String,
                required: true,
                lowercase: true
            },
            phone: {
                type: String,
                required: true
            }
        },
        additionalGuests: [{
            firstName: String,
            lastName: String,
            age: Number,
            relation: String
        }]
    },
    pricing: {
        roomRate: {
            type: Number,
            required: true,
            min: 0
        },
        numberOfNights: {
            type: Number,
            required: true,
            min: 1
        },
        subtotal: {
            type: Number,
            required: true,
            min: 0
        },
        taxes: {
            type: Number,
            default: 0,
            min: 0
        },
        discounts: {
            amount: {
                type: Number,
                default: 0,
                min: 0
            },
            reason: String
        },
        totalAmount: {
            type: Number,
            required: true,
            min: 0
        }
    },
    payment: {
        method: {
            type: String,
            enum: ['credit-card', 'debit-card', 'paypal', 'bank-transfer', 'cash', 'upi'],
            required: true
        },
        status: {
            type: String,
            enum: ['pending', 'completed', 'failed', 'refunded', 'partially-refunded'],
            default: 'pending'
        },
        transactionId: String,
        paidAmount: {
            type: Number,
            default: 0,
            min: 0
        },
        paymentDate: Date,
        refundAmount: {
            type: Number,
            default: 0,
            min: 0
        },
        refundDate: Date
    },
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'checked-in', 'checked-out', 'cancelled', 'no-show'],
        default: 'pending'
    },
    specialRequests: [{
        type: {
            type: String,
            enum: ['early-checkin', 'late-checkout', 'room-preference', 'dietary', 'accessibility', 'other']
        },
        description: String,
        fulfilled: {
            type: Boolean,
            default: false
        }
    }],
    preferences: {
        smokingRoom: {
            type: Boolean,
            default: false
        },
        floorPreference: {
            type: String,
            enum: ['low', 'middle', 'high', 'no-preference'],
            default: 'no-preference'
        },
        bedPreference: {
            type: String,
            enum: ['single', 'double', 'queen', 'king', 'twin', 'no-preference'],
            default: 'no-preference'
        }
    },
    checkInTime: Date,
    checkOutTime: Date,
    notes: {
        customerNotes: String,
        adminNotes: String,
        housekeepingNotes: String
    },
    cancellation: {
        isCancelled: {
            type: Boolean,
            default: false
        },
        cancelledAt: Date,
        cancelledBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        reason: String,
        refundStatus: {
            type: String,
            enum: ['not-applicable', 'full', 'partial', 'none'],
            default: 'not-applicable'
        }
    },
    communication: {
        confirmationSent: {
            type: Boolean,
            default: false
        },
        reminderSent: {
            type: Boolean,
            default: false
        },
        feedbackRequested: {
            type: Boolean,
            default: false
        }
    }
}, {
    timestamps: true
});

// Indexes for efficient querying
bookingSchema.index({ user: 1, createdAt: -1 });
bookingSchema.index({ room: 1, checkIn: 1, checkOut: 1 });
bookingSchema.index({ status: 1, checkIn: 1 });
bookingSchema.index({ bookingNumber: 1 });

// Pre-save middleware to generate booking number
bookingSchema.pre('save', async function(next) {
    if (!this.bookingNumber) {
        const count = await this.constructor.countDocuments();
        const year = new Date().getFullYear();
        this.bookingNumber = `BK${year}${String(count + 1).padStart(6, '0')}`;
    }
    
    // Calculate pricing
    if (this.checkIn && this.checkOut && this.pricing.roomRate) {
        const nights = Math.ceil((this.checkOut - this.checkIn) / (1000 * 60 * 60 * 24));
        this.pricing.numberOfNights = nights;
        this.pricing.subtotal = this.pricing.roomRate * nights;
        
        // Calculate taxes (assuming 18% GST)
        this.pricing.taxes = this.pricing.subtotal * 0.18;
        
        // Calculate total
        this.pricing.totalAmount = this.pricing.subtotal + this.pricing.taxes - (this.pricing.discounts.amount || 0);
    }
    
    next();
});

// Virtual for booking duration
bookingSchema.virtual('duration').get(function() {
    if (this.checkIn && this.checkOut) {
        return Math.ceil((this.checkOut - this.checkIn) / (1000 * 60 * 60 * 24));
    }
    return 0;
});

// Virtual for total guests
bookingSchema.virtual('totalGuests').get(function() {
    return this.guests.adults + this.guests.children;
});

// Method to check if booking can be cancelled
bookingSchema.methods.canBeCancelled = function() {
    if (this.status === 'cancelled' || this.status === 'checked-out') {
        return false;
    }
    
    // Allow cancellation until 24 hours before check-in
    const cancellationDeadline = new Date(this.checkIn);
    cancellationDeadline.setHours(cancellationDeadline.getHours() - 24);
    
    return new Date() < cancellationDeadline;
};

// Method to calculate refund amount
bookingSchema.methods.calculateRefund = function() {
    if (!this.canBeCancelled()) {
        return 0;
    }
    
    const hoursUntilCheckIn = (this.checkIn - new Date()) / (1000 * 60 * 60);
    
    if (hoursUntilCheckIn > 72) {
        return this.pricing.totalAmount; // Full refund
    } else if (hoursUntilCheckIn > 24) {
        return this.pricing.totalAmount * 0.5; // 50% refund
    } else {
        return 0; // No refund
    }
};

// Static method to find overlapping bookings
bookingSchema.statics.findOverlapping = function(roomId, checkIn, checkOut, excludeBookingId) {
    const query = {
        room: roomId,
        status: { $in: ['confirmed', 'checked-in'] },
        $or: [
            {
                checkIn: { $lte: checkIn },
                checkOut: { $gt: checkIn }
            },
            {
                checkIn: { $lt: checkOut },
                checkOut: { $gte: checkOut }
            },
            {
                checkIn: { $gte: checkIn },
                checkOut: { $lte: checkOut }
            }
        ]
    };
    
    if (excludeBookingId) {
        query._id = { $ne: excludeBookingId };
    }
    
    return this.find(query);
};

// Ensure virtual fields are serialized
bookingSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Booking', bookingSchema);
