/**
 * Room Model - Hotel Room Booking System
 * Developed by POORVAJAN G S
 * Final Year CSE Student at KSRIET
 * Leader of Team CODE CRAFTS
 */

const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
    roomNumber: {
        type: String,
        required: [true, 'Room number is required'],
        unique: true,
        trim: true
    },
    roomType: {
        type: String,
        required: [true, 'Room type is required'],
        enum: ['single', 'double', 'suite', 'deluxe', 'presidential'],
        lowercase: true
    },
    description: {
        type: String,
        required: [true, 'Room description is required'],
        maxlength: [1000, 'Description cannot exceed 1000 characters']
    },
    price: {
        type: Number,
        required: [true, 'Room price is required'],
        min: [0, 'Price cannot be negative']
    },
    capacity: {
        adults: {
            type: Number,
            required: true,
            min: 1,
            max: 10
        },
        children: {
            type: Number,
            default: 0,
            min: 0,
            max: 5
        }
    },
    bedType: {
        type: String,
        required: true,
        enum: ['single', 'double', 'queen', 'king', 'twin'],
        default: 'single'
    },
    amenities: [{
        type: String,
        enum: [
            'wifi', 'tv', 'air-conditioning', 'mini-bar', 'room-service',
            'balcony', 'ocean-view', 'city-view', 'jacuzzi', 'fireplace',
            'kitchenette', 'safe', 'phone', 'coffee-maker', 'hair-dryer',
            'iron', 'bathrobe', 'slippers', 'newspaper', 'wake-up-service'
        ]
    }],
    images: [{
        url: String,
        alt: String,
        isPrimary: { type: Boolean, default: false }
    }],
    floor: {
        type: Number,
        required: true,
        min: 1,
        max: 50
    },
    isAvailable: {
        type: Boolean,
        default: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    smokingAllowed: {
        type: Boolean,
        default: false
    },
    petFriendly: {
        type: Boolean,
        default: false
    },
    accessibility: {
        wheelchairAccessible: {
            type: Boolean,
            default: false
        },
        hearingImpaired: {
            type: Boolean,
            default: false
        },
        visuallyImpaired: {
            type: Boolean,
            default: false
        }
    },
    dimensions: {
        area: {
            type: Number, // in square feet
            min: 100,
            max: 2000
        },
        ceilingHeight: {
            type: Number, // in feet
            min: 8,
            max: 15
        }
    },
    maintenanceSchedule: {
        lastCleaned: {
            type: Date,
            default: Date.now
        },
        lastMaintained: {
            type: Date,
            default: Date.now
        },
        nextMaintenance: Date
    },
    rating: {
        average: {
            type: Number,
            default: 0,
            min: 0,
            max: 5
        },
        reviewCount: {
            type: Number,
            default: 0
        }
    },
    specialOffers: [{
        title: String,
        description: String,
        discount: {
            type: Number,
            min: 0,
            max: 100
        },
        validFrom: Date,
        validTo: Date,
        isActive: {
            type: Boolean,
            default: true
        }
    }]
}, {
    timestamps: true
});

// Index for efficient querying
roomSchema.index({ roomType: 1, isAvailable: 1, isActive: 1 });
roomSchema.index({ price: 1 });
roomSchema.index({ 'capacity.adults': 1, 'capacity.children': 1 });

// Virtual for total capacity
roomSchema.virtual('totalCapacity').get(function() {
    return this.capacity.adults + this.capacity.children;
});

// Method to check if room is available for date range
roomSchema.methods.isAvailableForDates = async function(checkIn, checkOut) {
    const Booking = mongoose.model('Booking');
    
    const conflictingBookings = await Booking.find({
        room: this._id,
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
    });
    
    return conflictingBookings.length === 0;
};

// Static method to find available rooms
roomSchema.statics.findAvailable = function(checkIn, checkOut, criteria = {}) {
    const Booking = mongoose.model('Booking');
    
    return this.aggregate([
        {
            $match: {
                isAvailable: true,
                isActive: true,
                ...criteria
            }
        },
        {
            $lookup: {
                from: 'bookings',
                let: { roomId: '$_id' },
                pipeline: [
                    {
                        $match: {
                            $expr: { $eq: ['$room', '$$roomId'] },
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
                        }
                    }
                ],
                as: 'conflictingBookings'
            }
        },
        {
            $match: {
                conflictingBookings: { $size: 0 }
            }
        }
    ]);
};

// Ensure virtual fields are serialized
roomSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Room', roomSchema);
