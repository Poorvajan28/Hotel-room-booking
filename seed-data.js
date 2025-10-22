/**
 * Seed Data Script - Hotel Room Booking System
 * Developed by POORVAJAN G S
 * Final Year CSE Student at KSRIET
 * Leader of Team CODE CRAFTS
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Import models
const User = require('./models/User');
const Room = require('./models/Room');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/hotel_booking', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

const seedData = async () => {
    try {
        console.log('🌱 Starting data seeding...');

        // Clear existing data
        await User.deleteMany({});
        await Room.deleteMany({});

        // Create admin user
        const adminUser = await User.create({
            firstName: 'Admin',
            lastName: 'User',
            email: 'admin@hotel.com',
            password: 'admin123',
            phone: '9999999999',
            role: 'admin',
            address: {
                street: '123 Admin Street',
                city: 'Chennai',
                state: 'Tamil Nadu',
                zipCode: '600001',
                country: 'India'
            }
        });

        // Create sample customer
        const customer = await User.create({
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@example.com',
            password: 'password123',
            phone: '9876543210',
            role: 'customer',
            address: {
                street: '456 Customer Lane',
                city: 'Mumbai',
                state: 'Maharashtra',
                zipCode: '400001',
                country: 'India'
            }
        });

        // Create sample rooms
        const sampleRooms = [
            {
                roomNumber: '101',
                roomType: 'single',
                description: 'Comfortable single room with modern amenities',
                price: 2500,
                capacity: { adults: 1, children: 0 },
                bedType: 'single',
                amenities: ['wifi', 'tv', 'air-conditioning', 'room-service'],
                images: [{
                    url: '/uploads/room-101.jpg',
                    alt: 'Single Room 101',
                    isPrimary: true
                }],
                floor: 1,
                dimensions: { area: 200, ceilingHeight: 10 }
            },
            {
                roomNumber: '102',
                roomType: 'double',
                description: 'Spacious double room perfect for couples',
                price: 3500,
                capacity: { adults: 2, children: 1 },
                bedType: 'queen',
                amenities: ['wifi', 'tv', 'air-conditioning', 'mini-bar', 'balcony'],
                images: [{
                    url: '/uploads/room-102.jpg',
                    alt: 'Double Room 102',
                    isPrimary: true
                }],
                floor: 1,
                dimensions: { area: 300, ceilingHeight: 10 }
            },
            {
                roomNumber: '201',
                roomType: 'suite',
                description: 'Luxurious suite with separate living area',
                price: 7500,
                capacity: { adults: 3, children: 2 },
                bedType: 'king',
                amenities: ['wifi', 'tv', 'air-conditioning', 'mini-bar', 'room-service', 'jacuzzi', 'city-view'],
                images: [{
                    url: '/uploads/room-201.jpg',
                    alt: 'Suite 201',
                    isPrimary: true
                }],
                floor: 2,
                dimensions: { area: 500, ceilingHeight: 12 }
            },
            {
                roomNumber: '301',
                roomType: 'deluxe',
                description: 'Premium deluxe room with ocean view',
                price: 5500,
                capacity: { adults: 2, children: 2 },
                bedType: 'king',
                amenities: ['wifi', 'tv', 'air-conditioning', 'mini-bar', 'balcony', 'ocean-view', 'coffee-maker'],
                images: [{
                    url: '/uploads/room-301.jpg',
                    alt: 'Deluxe Room 301',
                    isPrimary: true
                }],
                floor: 3,
                dimensions: { area: 400, ceilingHeight: 11 }
            },
            {
                roomNumber: 'PS01',
                roomType: 'presidential',
                description: 'Presidential suite with luxury amenities and panoramic views',
                price: 15000,
                capacity: { adults: 4, children: 2 },
                bedType: 'king',
                amenities: ['wifi', 'tv', 'air-conditioning', 'mini-bar', 'room-service', 'jacuzzi', 'fireplace', 'kitchenette', 'city-view', 'safe'],
                images: [{
                    url: '/uploads/room-ps01.jpg',
                    alt: 'Presidential Suite PS01',
                    isPrimary: true
                }],
                floor: 5,
                dimensions: { area: 800, ceilingHeight: 15 }
            }
        ];

        const rooms = await Room.insertMany(sampleRooms);

        console.log('✅ Data seeding completed successfully!');
        console.log(`👤 Created ${1} admin user and ${1} customer`);
        console.log(`🏠 Created ${rooms.length} sample rooms`);
        console.log('\nLogin credentials:');
        console.log('Admin: admin@hotel.com / admin123');
        console.log('Customer: john@example.com / password123');

        mongoose.connection.close();
        process.exit(0);

    } catch (error) {
        console.error('❌ Error seeding data:', error);
        mongoose.connection.close();
        process.exit(1);
    }
};

seedData();
