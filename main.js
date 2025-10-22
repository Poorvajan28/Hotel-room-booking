/**
 * Main JavaScript File - Hotel Room Booking System
 * Developed by POORVAJAN G S
 * Final Year CSE Student at KSRIET
 * Leader of Team CODE CRAFTS
 */

// Global application state
window.APP = {
    currentUser: null,
    isAuthenticated: false,
    currentPage: 1,
    searchParams: {},
    rooms: [],
    bookings: [],
    loading: false
};

// Initialize application when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Hotel Booking System - Initializing...');
    console.log('👨‍💻 Developed by: POORVAJAN G S');
    console.log('🎓 Final Year CSE Student at KSRIET');
    console.log('👑 Leader of Team CODE CRAFTS');
    
    // Ensure loading element exists
    if (!document.getElementById('loading')) {
        const loadingDiv = document.createElement('div');
        loadingDiv.id = 'loading';
        loadingDiv.className = 'loading-spinner hidden';
        loadingDiv.innerHTML = `
            <div class="spinner"></div>
            <p>Loading...</p>
        `;
        document.body.appendChild(loadingDiv);
    }
    
    // Hide loading initially
    Utils.hideLoading();
    
    // Initialize modules
    initializeApp();
    
    // Setup login form handler
    setupLoginHandler();
});

// Initialize application modules
function initializeApp() {
    try {
        // Initialize Toast notifications
        if (typeof Toast !== 'undefined' && Toast.init) {
            Toast.init();
        }
        
        // Load initial room data
        loadInitialRooms();
        
        console.log('✅ Application initialized successfully');
        
    } catch (error) {
        console.error('❌ Error initializing application:', error);
        if (typeof Toast !== 'undefined' && Toast.error) {
            Toast.error('Failed to initialize application');
        }
    }
}

// Load initial rooms for display
async function loadInitialRooms() {
    try {
        const roomsGrid = document.getElementById('roomsGrid');
        if (!roomsGrid) {
            console.log('No rooms grid found, skipping room loading');
            return;
        }
        
        if (typeof Utils !== 'undefined' && Utils.showLoading) {
            Utils.showLoading();
        }
        
        // Check if API is available
        if (typeof API === 'undefined' || !API.rooms || !API.rooms.getAll) {
            console.warn('API not available, showing placeholder rooms');
            displaySampleRooms();
            return;
        }
        
        // Fetch rooms from API
        const response = await API.rooms.getAll({ limit: 12 });
        const rooms = response.data || response.rooms || [];
        
        // Display rooms
        displayRooms(rooms);
        
        console.log(`✅ Loaded ${rooms.length} rooms`);
        
    } catch (error) {
        console.error('❌ Error loading rooms:', error);
        displaySampleRooms();
    } finally {
        if (typeof Utils !== 'undefined' && Utils.hideLoading) {
            Utils.hideLoading();
        }
    }
}

// Display rooms in grid
function displayRooms(rooms) {
    const roomsGrid = document.getElementById('roomsGrid');
    if (!roomsGrid) return;
    
    roomsGrid.innerHTML = '';
    
    if (!rooms || rooms.length === 0) {
        displayNoRooms();
        return;
    }
    
    // Store rooms globally for access in modals
    window.currentRooms = rooms;
    
    rooms.forEach(room => {
        const roomCard = createRoomCard(room);
        roomsGrid.appendChild(roomCard);
    });
}

// Create room card element
function createRoomCard(room) {
    const card = document.createElement('div');
    card.className = 'room-card';
    card.innerHTML = `
        <div class="room-image">
            <img src="${getRoomImage(room.roomNumber)}" 
                 alt="${room.description || room.roomType + ' room'}">
            <div class="room-type-badge">${Utils.capitalize(room.roomType)}</div>
        </div>
        <div class="room-details">
            <h3 class="room-title">Room ${room.roomNumber}</h3>
            <p class="room-description">${room.description}</p>
            <div class="room-amenities">
                ${room.amenities?.slice(0, 3).map(amenity => 
                    `<span class="amenity-tag">${Utils.capitalize(amenity.replace('-', ' '))}</span>`
                ).join('') || ''}
            </div>
            <div class="room-capacity">
                <i class="fas fa-users"></i>
                ${room.capacity?.adults || 1} Adults
                ${room.capacity?.children ? `, ${room.capacity.children} Children` : ''}
            </div>
            <div class="room-price">
                <span class="price">${Utils.formatCurrency(room.price)}</span>
                <span class="per-night">per night</span>
            </div>
            <div class="room-actions">
                <button class="btn btn-outline view-room-btn" data-room-id="${room._id}">
                    <i class="fas fa-eye"></i> View Details
                </button>
                <button class="btn btn-primary book-room-btn" data-room-id="${room._id}">
                    <i class="fas fa-calendar-plus"></i> Book Now
                </button>
            </div>
        </div>
    `;
    
    return card;
}

// Display sample rooms when API is not available
function displaySampleRooms() {
    const sampleRooms = getSampleRooms();
    displayRooms(sampleRooms);
}

// Display no rooms message
function displayNoRooms() {
    const roomsGrid = document.getElementById('roomsGrid');
    if (!roomsGrid) return;
    
    roomsGrid.innerHTML = `
        <div class="no-rooms-message">
            <div class="no-rooms-icon">
                <i class="fas fa-hotel fa-3x"></i>
            </div>
            <h3>No Rooms Available</h3>
            <p>Sorry, no rooms match your criteria. Please try different search parameters.</p>
            <button class="btn btn-primary" onclick="location.reload()">Reload Page</button>
        </div>
    `;
}

// Setup simple login handler
function setupLoginHandler() {
    // Handle login button clicks
    document.addEventListener('click', function(e) {
        if (e.target.id === 'loginBtn' || e.target.classList.contains('login-btn')) {
            showLoginModal();
        }
        if (e.target.id === 'registerBtn' || e.target.classList.contains('register-btn')) {
            showRegisterModal();
        }
        
        // Handle room actions
        if (e.target.classList.contains('view-room-btn')) {
            const roomId = e.target.dataset.roomId;
            showRoomDetails(roomId);
        }
        if (e.target.classList.contains('book-room-btn')) {
            const roomId = e.target.dataset.roomId;
            showBookingModal(roomId);
        }
    });
    
    // Handle login form submission
    document.addEventListener('submit', function(e) {
        if (e.target.id === 'loginForm') {
            e.preventDefault();
            handleLogin(e.target);
        }
        if (e.target.id === 'registerForm') {
            e.preventDefault();
            handleRegister(e.target);
        }
        if (e.target.id === 'bookingForm') {
            e.preventDefault();
            handleBookingSubmission(e.target);
        }
    });
}

// Show login modal
function showLoginModal() {
    const modalHtml = `
        <div id="loginModal" class="modal-overlay" onclick="hideModal('loginModal')">
            <div class="modal-content" onclick="event.stopPropagation()">
                <div class="modal-header">
                    <h2>Login</h2>
                    <button class="modal-close" onclick="hideModal('loginModal')">&times;</button>
                </div>
                <form id="loginForm" class="modal-body">
                    <div class="form-group">
                        <label for="loginEmail">Email:</label>
                        <input type="email" id="loginEmail" name="email" required 
                               placeholder="admin@hotel.com" value="admin@hotel.com">
                    </div>
                    <div class="form-group">
                        <label for="loginPassword">Password:</label>
                        <input type="password" id="loginPassword" name="password" required 
                               placeholder="admin123" value="admin123">
                    </div>
                    <button type="submit" class="btn btn-primary">Login</button>
                </form>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

// Show register modal
function showRegisterModal() {
    const modalHtml = `
        <div id="registerModal" class="modal-overlay" onclick="hideModal('registerModal')">
            <div class="modal-content" onclick="event.stopPropagation()">
                <div class="modal-header">
                    <h2>Register</h2>
                    <button class="modal-close" onclick="hideModal('registerModal')">&times;</button>
                </div>
                <form id="registerForm" class="modal-body">
                    <div class="form-group">
                        <label for="firstName">First Name:</label>
                        <input type="text" id="firstName" name="firstName" required>
                    </div>
                    <div class="form-group">
                        <label for="lastName">Last Name:</label>
                        <input type="text" id="lastName" name="lastName" required>
                    </div>
                    <div class="form-group">
                        <label for="email">Email:</label>
                        <input type="email" id="email" name="email" required>
                    </div>
                    <div class="form-group">
                        <label for="phone">Phone:</label>
                        <input type="tel" id="phone" name="phone" required>
                    </div>
                    <div class="form-group">
                        <label for="password">Password:</label>
                        <input type="password" id="password" name="password" required>
                    </div>
                    <button type="submit" class="btn btn-primary">Register</button>
                </form>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

// Hide modal
function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.remove();
    }
}

// Handle login
async function handleLogin(form) {
    const formData = new FormData(form);
    const email = formData.get('email');
    const password = formData.get('password');
    
    try {
        Utils.showLoading();
        
        const response = await fetch('http://localhost:5000/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Save auth data
            localStorage.setItem('hotel_booking_token', result.token);
            localStorage.setItem('hotel_booking_user', JSON.stringify(result.user));
            
            // Show success message
            if (typeof Toast !== 'undefined') {
                Toast.success('Login successful!');
            } else {
                alert('Login successful!');
            }
            
            // Hide modal and refresh page
            hideModal('loginModal');
            setTimeout(() => location.reload(), 1000);
            
        } else {
            if (typeof Toast !== 'undefined') {
                Toast.error(result.error || 'Login failed');
            } else {
                alert(result.error || 'Login failed');
            }
        }
        
    } catch (error) {
        console.error('Login error:', error);
        if (typeof Toast !== 'undefined') {
            Toast.error('Login failed. Please try again.');
        } else {
            alert('Login failed. Please try again.');
        }
    } finally {
        Utils.hideLoading();
    }
}

// Handle register
async function handleRegister(form) {
    const formData = new FormData(form);
    const userData = {
        firstName: formData.get('firstName'),
        lastName: formData.get('lastName'),
        email: formData.get('email'),
        phone: formData.get('phone'),
        password: formData.get('password')
    };
    
    try {
        Utils.showLoading();
        
        const response = await fetch('http://localhost:5000/api/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(userData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Save auth data
            localStorage.setItem('hotel_booking_token', result.token);
            localStorage.setItem('hotel_booking_user', JSON.stringify(result.user));
            
            // Show success message
            if (typeof Toast !== 'undefined') {
                Toast.success('Registration successful!');
            } else {
                alert('Registration successful!');
            }
            
            // Hide modal and refresh page
            hideModal('registerModal');
            setTimeout(() => location.reload(), 1000);
            
        } else {
            if (typeof Toast !== 'undefined') {
                Toast.error(result.error || 'Registration failed');
            } else {
                alert(result.error || 'Registration failed');
            }
        }
        
    } catch (error) {
        console.error('Registration error:', error);
        if (typeof Toast !== 'undefined') {
            Toast.error('Registration failed. Please try again.');
        } else {
            alert('Registration failed. Please try again.');
        }
    } finally {
        Utils.hideLoading();
    }
}

// Show room details modal
function showRoomDetails(roomId) {
    // Find room data
    let room = null;
    
    // Try to find from loaded rooms or use sample data
    if (window.currentRooms && window.currentRooms.length > 0) {
        room = window.currentRooms.find(r => r._id === roomId);
    } else {
        // Use sample room data
        const sampleRooms = getSampleRooms();
        room = sampleRooms.find(r => r._id === roomId);
    }
    
    if (!room) {
        alert('Room details not found');
        return;
    }
    
    const modalHtml = `
        <div id="roomDetailsModal" class="modal-overlay" onclick="hideModal('roomDetailsModal')">
            <div class="modal-content room-details-modal" onclick="event.stopPropagation()">
                <div class="modal-header">
                    <h2>Room ${room.roomNumber} Details</h2>
                    <button class="modal-close" onclick="hideModal('roomDetailsModal')">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="room-detail-image">
                        <img src="${getRoomImage(room.roomNumber)}" alt="Room ${room.roomNumber}">
                        <div class="room-type-badge">${Utils.capitalize(room.roomType)}</div>
                    </div>
                    <div class="room-detail-info">
                        <h3>${room.description}</h3>
                        <div class="room-price-large">
                            <span class="price">${Utils.formatCurrency(room.price)}</span>
                            <span class="per-night">per night</span>
                        </div>
                        
                        <div class="room-features">
                            <h4>Capacity</h4>
                            <p><i class="fas fa-users"></i> ${room.capacity?.adults || 1} Adults${room.capacity?.children ? `, ${room.capacity.children} Children` : ''}</p>
                            
                            <h4>Amenities</h4>
                            <div class="amenities-list">
                                ${room.amenities?.map(amenity => 
                                    `<span class="amenity-tag">${Utils.capitalize(amenity.replace('-', ' '))}</span>`
                                ).join('') || 'Standard amenities'}
                            </div>
                            
                            <h4>Room Features</h4>
                            <ul>
                                <li>Air conditioning</li>
                                <li>Free WiFi</li>
                                <li>Private bathroom</li>
                                <li>Room service available</li>
                                <li>Daily housekeeping</li>
                            </ul>
                        </div>
                        
                        <div class="room-actions">
                            <button class="btn btn-primary" onclick="hideModal('roomDetailsModal'); showBookingModal('${room._id}')">
                                <i class="fas fa-calendar-plus"></i> Book This Room
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

// Show booking modal
function showBookingModal(roomId) {
    // Check if user is logged in
    const token = localStorage.getItem('hotel_booking_token');
    if (!token) {
        alert('Please login to book a room');
        showLoginModal();
        return;
    }
    
    // Find room data
    let room = null;
    if (window.currentRooms && window.currentRooms.length > 0) {
        room = window.currentRooms.find(r => r._id === roomId);
    } else {
        const sampleRooms = getSampleRooms();
        room = sampleRooms.find(r => r._id === roomId);
    }
    
    if (!room) {
        alert('Room not found');
        return;
    }
    
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    
    const modalHtml = `
        <div id="bookingModal" class="modal-overlay" onclick="hideModal('bookingModal')">
            <div class="modal-content booking-modal" onclick="event.stopPropagation()">
                <div class="modal-header">
                    <h2>Book Room ${room.roomNumber}</h2>
                    <button class="modal-close" onclick="hideModal('bookingModal')">&times;</button>
                </div>
                <form id="bookingForm" class="modal-body">
                    <input type="hidden" name="roomId" value="${room._id}">
                    
                    <div class="booking-room-info">
                        <img src="${getRoomImage(room.roomNumber)}" alt="Room ${room.roomNumber}">
                        <div class="room-info">
                            <h3>Room ${room.roomNumber} - ${Utils.capitalize(room.roomType)}</h3>
                            <p class="room-price">${Utils.formatCurrency(room.price)} per night</p>
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="checkIn">Check-in Date:</label>
                            <input type="date" id="checkIn" name="checkIn" min="${today}" value="${today}" required>
                        </div>
                        <div class="form-group">
                            <label for="checkOut">Check-out Date:</label>
                            <input type="date" id="checkOut" name="checkOut" min="${tomorrowStr}" value="${tomorrowStr}" required>
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="adults">Adults:</label>
                            <select id="adults" name="adults" required>
                                <option value="1">1 Adult</option>
                                <option value="2">2 Adults</option>
                                <option value="3">3 Adults</option>
                                <option value="4">4 Adults</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="children">Children:</label>
                            <select id="children" name="children">
                                <option value="0">0 Children</option>
                                <option value="1">1 Child</option>
                                <option value="2">2 Children</option>
                                <option value="3">3 Children</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label for="specialRequests">Special Requests (Optional):</label>
                        <textarea id="specialRequests" name="specialRequests" rows="3" placeholder="Any special requests or requirements..."></textarea>
                    </div>
                    
                    <div class="booking-summary">
                        <h4>Booking Summary</h4>
                        <div class="summary-item">
                            <span>Room Rate:</span>
                            <span id="roomRate">${Utils.formatCurrency(room.price)} per night</span>
                        </div>
                        <div class="summary-item">
                            <span>Nights:</span>
                            <span id="numberOfNights">1</span>
                        </div>
                        <div class="summary-item">
                            <span>Subtotal:</span>
                            <span id="subtotal">${Utils.formatCurrency(room.price)}</span>
                        </div>
                        <div class="summary-item">
                            <span>Taxes (18%):</span>
                            <span id="taxes">${Utils.formatCurrency(room.price * 0.18)}</span>
                        </div>
                        <div class="summary-item total">
                            <span>Total Amount:</span>
                            <span id="totalAmount">${Utils.formatCurrency(room.price * 1.18)}</span>
                        </div>
                    </div>
                    
                    <button type="submit" class="btn btn-primary btn-large">
                        <i class="fas fa-credit-card"></i> Confirm Booking
                    </button>
                </form>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // Add event listeners for price calculation
    setupBookingCalculation(room.price);
}

// Get sample rooms data
function getSampleRooms() {
    return [
        {
            _id: '1',
            roomNumber: '101',
            roomType: 'single',
            description: 'Comfortable single room with modern amenities and city view',
            price: 2500,
            capacity: { adults: 1, children: 0 },
            amenities: ['wifi', 'tv', 'air-conditioning', 'room-service']
        },
        {
            _id: '2', 
            roomNumber: '102',
            roomType: 'double',
            description: 'Spacious double room perfect for couples with balcony',
            price: 3500,
            capacity: { adults: 2, children: 1 },
            amenities: ['wifi', 'tv', 'air-conditioning', 'mini-bar', 'balcony']
        },
        {
            _id: '3',
            roomNumber: '201',
            roomType: 'suite',
            description: 'Luxurious suite with separate living area and premium amenities',
            price: 7500,
            capacity: { adults: 3, children: 2 },
            amenities: ['wifi', 'tv', 'air-conditioning', 'jacuzzi', 'room-service', 'city-view']
        },
        {
            _id: '4',
            roomNumber: '301',
            roomType: 'deluxe',
            description: 'Premium deluxe room with ocean view and luxury amenities',
            price: 5500,
            capacity: { adults: 2, children: 2 },
            amenities: ['wifi', 'tv', 'air-conditioning', 'mini-bar', 'ocean-view', 'coffee-maker']
        },
        {
            _id: '5',
            roomNumber: 'PS01',
            roomType: 'presidential',
            description: 'Presidential suite with panoramic views and exclusive amenities',
            price: 15000,
            capacity: { adults: 4, children: 2 },
            amenities: ['wifi', 'tv', 'air-conditioning', 'jacuzzi', 'kitchenette', 'panoramic-view', 'butler-service']
        }
    ];
}

// Get room image URL
function getRoomImage(roomNumber) {
    const imageMap = {
        '101': 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=400&h=300&fit=crop',
        '102': 'https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=400&h=300&fit=crop',
        '201': 'https://images.unsplash.com/photo-1591088398332-8a7791972843?w=400&h=300&fit=crop',
        '301': 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=400&h=300&fit=crop',
        'PS01': 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=300&fit=crop'
    };
    return imageMap[roomNumber] || `https://via.placeholder.com/400x300/2c5aa0/ffffff?text=Room+${roomNumber}`;
}

// Setup booking price calculation
function setupBookingCalculation(roomPrice) {
    const checkInInput = document.getElementById('checkIn');
    const checkOutInput = document.getElementById('checkOut');
    
    function calculatePrice() {
        const checkIn = new Date(checkInInput.value);
        const checkOut = new Date(checkOutInput.value);
        
        if (checkIn && checkOut && checkOut > checkIn) {
            const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
            const subtotal = roomPrice * nights;
            const taxes = subtotal * 0.18;
            const total = subtotal + taxes;
            
            document.getElementById('numberOfNights').textContent = nights;
            document.getElementById('subtotal').textContent = Utils.formatCurrency(subtotal);
            document.getElementById('taxes').textContent = Utils.formatCurrency(taxes);
            document.getElementById('totalAmount').textContent = Utils.formatCurrency(total);
        }
    }
    
    checkInInput.addEventListener('change', calculatePrice);
    checkOutInput.addEventListener('change', calculatePrice);
}

// Handle booking form submission
async function handleBookingSubmission(form) {
    const formData = new FormData(form);
    const user = JSON.parse(localStorage.getItem('hotel_booking_user') || '{}');
    
    const bookingData = {
        room: formData.get('roomId'),
        checkIn: formData.get('checkIn'),
        checkOut: formData.get('checkOut'),
        guests: {
            adults: parseInt(formData.get('adults')),
            children: parseInt(formData.get('children'))
        },
        guestDetails: {
            primaryGuest: {
                firstName: user.firstName || 'Guest',
                lastName: user.lastName || 'User',
                email: user.email || 'guest@hotel.com',
                phone: user.phone || '0000000000'
            }
        },
        payment: {
            method: 'credit-card'
        },
        specialRequests: formData.get('specialRequests') || '',
        notes: {
            customerNotes: formData.get('specialRequests') || ''
        }
    };
    
    try {
        Utils.showLoading();
        
        const token = localStorage.getItem('hotel_booking_token');
        const response = await fetch('http://localhost:5000/api/bookings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(bookingData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Show success message
            if (typeof Toast !== 'undefined') {
                Toast.success('Booking confirmed successfully!');
            } else {
                alert('Booking confirmed successfully!');
            }
            
            // Hide modal and show booking details
            hideModal('bookingModal');
            
            // Show booking confirmation
            showBookingConfirmation(result.data);
            
        } else {
            if (typeof Toast !== 'undefined') {
                Toast.error(result.error || 'Booking failed');
            } else {
                alert(result.error || 'Booking failed');
            }
        }
        
    } catch (error) {
        console.error('Booking error:', error);
        if (typeof Toast !== 'undefined') {
            Toast.error('Booking failed. Please try again.');
        } else {
            alert('Booking failed. Please try again.');
        }
    } finally {
        Utils.hideLoading();
    }
}

// Show booking confirmation
function showBookingConfirmation(booking) {
    const modalHtml = `
        <div id="confirmationModal" class="modal-overlay" onclick="hideModal('confirmationModal')">
            <div class="modal-content confirmation-modal" onclick="event.stopPropagation()">
                <div class="modal-header">
                    <h2>🎉 Booking Confirmed!</h2>
                    <button class="modal-close" onclick="hideModal('confirmationModal')">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="confirmation-content">
                        <div class="booking-number">
                            <h3>Booking Reference: #${booking.bookingNumber || 'BK' + Date.now()}</h3>
                        </div>
                        
                        <div class="booking-details">
                            <h4>Booking Details</h4>
                            <p><strong>Room:</strong> Room ${booking.room?.roomNumber || 'TBA'}</p>
                            <p><strong>Check-in:</strong> ${new Date(booking.checkIn).toLocaleDateString()}</p>
                            <p><strong>Check-out:</strong> ${new Date(booking.checkOut).toLocaleDateString()}</p>
                            <p><strong>Guests:</strong> ${booking.guests.adults} Adults${booking.guests.children ? `, ${booking.guests.children} Children` : ''}</p>
                            <p><strong>Total Amount:</strong> ${Utils.formatCurrency(booking.pricing?.totalAmount || 0)}</p>
                        </div>
                        
                        <div class="confirmation-message">
                            <p>✅ Your booking has been confirmed!</p>
                            <p>📧 A confirmation email will be sent shortly.</p>
                            <p>📞 For any queries, please contact our front desk.</p>
                        </div>
                        
                        <div class="confirmation-actions">
                            <button class="btn btn-primary" onclick="hideModal('confirmationModal')">
                                <i class="fas fa-check"></i> Continue Browsing
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

// Utility functions
const Utils = {
    // Show loading spinner
    showLoading() {
        const loading = document.getElementById('loading');
        if (loading) {
            loading.classList.remove('hidden');
        }
        APP.loading = true;
    },

    // Hide loading spinner
    hideLoading() {
        const loading = document.getElementById('loading');
        if (loading) {
            loading.classList.add('hidden');
        }
        APP.loading = false;
    },

    // Format currency
    formatCurrency(amount, currency = 'INR') {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: currency,
            maximumFractionDigits: 0
        }).format(amount);
    },

    // Format date
    formatDate(date, options = {}) {
        const defaultOptions = {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        };
        return new Date(date).toLocaleDateString('en-IN', { ...defaultOptions, ...options });
    },

    // Format date and time
    formatDateTime(date, options = {}) {
        const defaultOptions = {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        };
        return new Date(date).toLocaleString('en-IN', { ...defaultOptions, ...options });
    },

    // Capitalize first letter
    capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    },

    // Debounce function
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    // Validate form data
    validateForm(formData, rules) {
        const errors = {};
        let isValid = true;

        for (const [field, value] of Object.entries(formData)) {
            if (rules[field]) {
                const validation = CONFIG.validate(field, value);
                if (!validation.valid) {
                    errors[field] = validation.message;
                    isValid = false;
                }
            }
        }

        return { isValid, errors };
    },

    // Sanitize HTML
    sanitizeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    // Generate unique ID
    generateId() {
        return Math.random().toString(36).substr(2, 9);
    },

    // Get query parameters
    getQueryParams() {
        const params = new URLSearchParams(window.location.search);
        const result = {};
        for (const [key, value] of params) {
            result[key] = value;
        }
        return result;
    },

    // Update URL without reload
    updateUrl(params) {
        const url = new URL(window.location);
        Object.entries(params).forEach(([key, value]) => {
            if (value) {
                url.searchParams.set(key, value);
            } else {
                url.searchParams.delete(key);
            }
        });
        window.history.replaceState({}, '', url);
    }
};

// Toast notification system
const Toast = {
    container: null,

    init() {
        this.container = document.getElementById('toastContainer');
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.id = 'toastContainer';
            this.container.className = 'toast-container';
            document.body.appendChild(this.container);
        }
    },

    show(message, type = 'info', duration = CONFIG.SETTINGS.TOAST_DURATION) {
        if (!this.container) this.init();

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const toastId = Utils.generateId();
        toast.id = toastId;

        toast.innerHTML = `
            <div class="toast-header">
                <span class="toast-title">${Utils.capitalize(type)}</span>
                <button class="toast-close" onclick="Toast.hide('${toastId}')">&times;</button>
            </div>
            <div class="toast-body">${Utils.sanitizeHtml(message)}</div>
        `;

        this.container.appendChild(toast);

        // Show toast with animation
        setTimeout(() => toast.classList.add('show'), 100);

        // Auto hide
        if (duration > 0) {
            setTimeout(() => this.hide(toastId), duration);
        }

        return toastId;
    },

    hide(toastId) {
        const toast = document.getElementById(toastId);
        if (toast) {
            toast.classList.remove('show');
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, CONFIG.SETTINGS.ANIMATION_NORMAL);
        }
    },

    success(message, duration) {
        return this.show(message, 'success', duration);
    },

    error(message, duration) {
        return this.show(message, 'error', duration);
    },

    warning(message, duration) {
        return this.show(message, 'warning', duration);
    },

    info(message, duration) {
        return this.show(message, 'info', duration);
    }
};

// Modal management
const Modal = {
    activeModal: null,

    show(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            // Hide current modal if any
            if (this.activeModal) {
                this.hide(this.activeModal);
            }

            modal.classList.add('active');
            this.activeModal = modalId;
            document.body.style.overflow = 'hidden';

            // Focus management for accessibility
            const firstFocusable = modal.querySelector('input, button, select, textarea, [tabindex]');
            if (firstFocusable) {
                firstFocusable.focus();
            }
        }
    },

    hide(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
            if (this.activeModal === modalId) {
                this.activeModal = null;
                document.body.style.overflow = '';
            }
        }
    },

    hideAll() {
        document.querySelectorAll('.modal.active').forEach(modal => {
            modal.classList.remove('active');
        });
        this.activeModal = null;
        document.body.style.overflow = '';
    }
};

// Navigation management
const Navigation = {
    init() {
        this.setupSmoothScrolling();
        this.setupMobileMenu();
        this.setupActiveLinks();
    },

    setupSmoothScrolling() {
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });
    },

    setupMobileMenu() {
        const navToggle = document.getElementById('navToggle');
        const navLinks = document.getElementById('navLinks');

        if (navToggle && navLinks) {
            navToggle.addEventListener('click', () => {
                navLinks.classList.toggle('active');
                navToggle.classList.toggle('active');
            });

            // Close menu when clicking outside
            document.addEventListener('click', (e) => {
                if (!navToggle.contains(e.target) && !navLinks.contains(e.target)) {
                    navLinks.classList.remove('active');
                    navToggle.classList.remove('active');
                }
            });
        }
    },

    setupActiveLinks() {
        const sections = document.querySelectorAll('section[id]');
        const navLinks = document.querySelectorAll('.nav-link');

        const observerOptions = {
            threshold: 0.3,
            rootMargin: '-50px 0px -50px 0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    navLinks.forEach(link => {
                        link.classList.remove('active');
                        if (link.getAttribute('href') === `#${entry.target.id}`) {
                            link.classList.add('active');
                        }
                    });
                }
            });
        }, observerOptions);

        sections.forEach(section => observer.observe(section));
    },

    updateAuthUI() {
        const authButtons = document.getElementById('authButtons');
        const userMenu = document.getElementById('userMenu');
        const userName = document.getElementById('userName');

        if (APP.isAuthenticated && APP.currentUser) {
            if (authButtons) authButtons.classList.add('hidden');
            if (userMenu) userMenu.classList.remove('hidden');
            if (userName) userName.textContent = APP.currentUser.firstName || 'User';
        } else {
            if (authButtons) authButtons.classList.remove('hidden');
            if (userMenu) userMenu.classList.add('hidden');
        }
    }
};

// Form handling
const Forms = {
    init() {
        this.setupFormValidation();
        this.setupDateInputs();
    },

    setupFormValidation() {
        document.querySelectorAll('form').forEach(form => {
            form.addEventListener('submit', this.handleFormSubmit.bind(this));
        });
    },

    setupDateInputs() {
        const today = new Date().toISOString().split('T')[0];
        const maxDate = new Date();
        maxDate.setFullYear(maxDate.getFullYear() + 1);
        const maxDateStr = maxDate.toISOString().split('T')[0];

        const checkInInput = document.getElementById('checkIn');
        const checkOutInput = document.getElementById('checkOut');

        if (checkInInput) {
            checkInInput.min = today;
            checkInInput.max = maxDateStr;
            checkInInput.addEventListener('change', () => {
                if (checkOutInput) {
                    const checkInDate = new Date(checkInInput.value);
                    checkInDate.setDate(checkInDate.getDate() + 1);
                    checkOutInput.min = checkInDate.toISOString().split('T')[0];
                    
                    if (checkOutInput.value && new Date(checkOutInput.value) <= new Date(checkInInput.value)) {
                        checkOutInput.value = checkInDate.toISOString().split('T')[0];
                    }
                }
            });
        }

        if (checkOutInput) {
            checkOutInput.max = maxDateStr;
        }
    },

    handleFormSubmit(e) {
        const form = e.target;
        const formData = new FormData(form);
        const data = Object.fromEntries(formData);

        // Basic validation
        const requiredFields = form.querySelectorAll('[required]');
        let isValid = true;

        requiredFields.forEach(field => {
            if (!field.value.trim()) {
                field.classList.add('error');
                isValid = false;
            } else {
                field.classList.remove('error');
            }
        });

        if (!isValid) {
            e.preventDefault();
            Toast.error('Please fill in all required fields');
            return false;
        }

        return true;
    },

    validateField(field) {
        const value = field.value.trim();
        const fieldName = field.name || field.id;
        
        if (field.hasAttribute('required') && !value) {
            this.showFieldError(field, `${Utils.capitalize(fieldName)} is required`);
            return false;
        }

        // Email validation
        if (field.type === 'email' && value && !CONFIG.SETTINGS.EMAIL_PATTERN.test(value)) {
            this.showFieldError(field, 'Please enter a valid email address');
            return false;
        }

        // Phone validation
        if (field.type === 'tel' && value && !CONFIG.SETTINGS.PHONE_PATTERN.test(value)) {
            this.showFieldError(field, 'Please enter a valid 10-digit phone number');
            return false;
        }

        // Password validation
        if (field.type === 'password' && value && value.length < CONFIG.SETTINGS.MIN_PASSWORD_LENGTH) {
            this.showFieldError(field, `Password must be at least ${CONFIG.SETTINGS.MIN_PASSWORD_LENGTH} characters`);
            return false;
        }

        this.clearFieldError(field);
        return true;
    },

    showFieldError(field, message) {
        field.classList.add('error');
        
        // Remove existing error message
        const existingError = field.parentNode.querySelector('.field-error');
        if (existingError) {
            existingError.remove();
        }

        // Add new error message
        const errorDiv = document.createElement('div');
        errorDiv.className = 'field-error';
        errorDiv.textContent = message;
        errorDiv.style.color = 'var(--error-color)';
        errorDiv.style.fontSize = 'var(--font-size-sm)';
        errorDiv.style.marginTop = 'var(--spacing-xs)';
        
        field.parentNode.appendChild(errorDiv);
    },

    clearFieldError(field) {
        field.classList.remove('error');
        const errorDiv = field.parentNode.querySelector('.field-error');
        if (errorDiv) {
            errorDiv.remove();
        }
    }
};

// Event handlers
const EventHandlers = {
    init() {
        this.setupAuthButtons();
        this.setupModalCloseButtons();
        this.setupContactForm();
        this.setupPriceRange();
    },

    setupAuthButtons() {
        const loginBtn = document.getElementById('loginBtn');
        const registerBtn = document.getElementById('registerBtn');
        const logoutBtn = document.getElementById('logoutBtn');

        if (loginBtn) {
            loginBtn.addEventListener('click', () => Modal.show('loginModal'));
        }

        if (registerBtn) {
            registerBtn.addEventListener('click', () => Modal.show('registerModal'));
        }

        if (logoutBtn) {
            logoutBtn.addEventListener('click', Auth.logout);
        }

        // Modal switching
        const showRegister = document.getElementById('showRegister');
        const showLogin = document.getElementById('showLogin');

        if (showRegister) {
            showRegister.addEventListener('click', (e) => {
                e.preventDefault();
                Modal.hide('loginModal');
                Modal.show('registerModal');
            });
        }

        if (showLogin) {
            showLogin.addEventListener('click', (e) => {
                e.preventDefault();
                Modal.hide('registerModal');
                Modal.show('loginModal');
            });
        }
    },

    setupModalCloseButtons() {
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', () => {
                const modal = btn.closest('.modal');
                if (modal) {
                    Modal.hide(modal.id);
                }
            });
        });

        // Close modal on backdrop click
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    Modal.hide(modal.id);
                }
            });
        });

        // Close modal on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && Modal.activeModal) {
                Modal.hide(Modal.activeModal);
            }
        });
    },

    setupContactForm() {
        const contactForm = document.getElementById('contactForm');
        if (contactForm) {
            contactForm.addEventListener('submit', (e) => {
                e.preventDefault();
                
                const formData = new FormData(contactForm);
                const data = Object.fromEntries(formData);

                // Simulate sending message
                Utils.showLoading();
                
                setTimeout(() => {
                    Utils.hideLoading();
                    Toast.success('Message sent successfully! We will get back to you soon.');
                    contactForm.reset();
                }, 1500);
            });
        }
    },

    setupPriceRange() {
        const priceRange = document.getElementById('priceRange');
        const priceValue = document.getElementById('priceValue');

        if (priceRange && priceValue) {
            const updatePriceDisplay = () => {
                const value = parseInt(priceRange.value);
                priceValue.textContent = Utils.formatCurrency(value).replace('₹', '');
            };

            priceRange.addEventListener('input', updatePriceDisplay);
            updatePriceDisplay(); // Initial display
        }
    }
};

// Initialization
document.addEventListener('DOMContentLoaded', function() {
    console.log('🏨 Hotel Room Booking System Initialized');
    console.log('👨‍💻 Developed by POORVAJAN G S - Final Year CSE Student at KSRIET');
    console.log('👑 Leader of Team CODE CRAFTS');
    
    // Initialize components
    Toast.init();
    Navigation.init();
    Forms.init();
    EventHandlers.init();
    
    // Check authentication status
    Auth.checkAuthStatus();
    
    // Initialize rooms if on rooms section
    if (document.getElementById('rooms')) {
        if (typeof Rooms !== 'undefined') {
            Rooms.init();
        }
    }
    
    // Hide loading spinner
    setTimeout(() => {
        Utils.hideLoading();
    }, 1000);
    
    // Setup search form
    const searchForm = document.getElementById('searchForm');
    if (searchForm) {
        searchForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const formData = new FormData(searchForm);
            const searchParams = Object.fromEntries(formData);
            
            // Store search parameters
            localStorage.setItem(CONFIG.STORAGE_KEYS.SEARCH_PARAMS, JSON.stringify(searchParams));
            
            // Scroll to rooms section
            const roomsSection = document.getElementById('rooms');
            if (roomsSection) {
                roomsSection.scrollIntoView({ behavior: 'smooth' });
                
                // Apply search filters
                if (typeof Rooms !== 'undefined') {
                    setTimeout(() => {
                        Rooms.applyFilters(searchParams);
                    }, 500);
                }
            }
        });
    }
});

// Export utilities for global use
window.Utils = Utils;
window.Toast = Toast;
window.Modal = Modal;
