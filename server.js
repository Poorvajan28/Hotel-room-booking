/**
 * Hotel Room Booking System - Backend Server
 * Developed by POORVAJAN G S
 * Final Year CSE Student at KSRIET
 * Leader of Team CODE CRAFTS
 */

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config();

// Import routes
const authRoutes = require('./routes/auth');
const roomRoutes = require('./routes/rooms');
const bookingRoutes = require('./routes/bookings');
const adminRoutes = require('./routes/admin');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static file serving for room images
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/hotel_booking', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log('✅ MongoDB connected successfully'))
.catch(err => console.error('❌ MongoDB connection error:', err));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/admin', adminRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'Hotel Booking System API is running',
        developer: 'POORVAJAN G S - Final Year CSE Student at KSRIET',
        team: 'CODE CRAFTS',
        timestamp: new Date().toISOString()
    });
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('❌ Error:', error);
    const status = error.statusCode || 500;
    const message = error.message || 'Internal Server Error';
    res.status(status).json({ error: message });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({ error: 'API endpoint not found' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`
🚀 Hotel Room Booking System Server Started
📍 Port: ${PORT}
🌐 Environment: ${process.env.NODE_ENV}
👨‍💻 Developed by: POORVAJAN G S
🎓 Final Year CSE Student at KSRIET
👑 Leader of Team CODE CRAFTS
⏰ Started at: ${new Date().toLocaleString()}
    `);
});
