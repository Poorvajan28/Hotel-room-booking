/**
 * Room Management Module - Hotel Room Booking System
 * Developed by POORVAJAN G S
 * Final Year CSE Student at KSRIET
 * Leader of Team CODE CRAFTS
 */

const RoomManager = {
    // Current rooms data
    rooms: [],
    filteredRooms: [],
    currentFilters: {
        type: '',
        minPrice: '',
        maxPrice: '',
        amenities: [],
        capacity: '',
        availability: true
    },
    currentPage: 1,
    roomsPerPage: 6,

    // Initialize room management
    init() {
        this.bindEvents();
        this.loadRooms();
        this.setupDatePicker();
    },

    // Bind event listeners
    bindEvents() {
        // Room filters
        const filterForm = document.getElementById('roomFilters');
        if (filterForm) {
            filterForm.addEventListener('change', () => this.handleFilterChange());
            filterForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.applyFilters();
            });
        }

        // Search functionality
        const searchInput = document.getElementById('roomSearch');
        if (searchInput) {
            searchInput.addEventListener('input', Utils.debounce(() => {
                this.handleSearch();
            }, 300));
        }

        // Reset filters
        const resetBtn = document.getElementById('resetFilters');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => this.resetFilters());
        }

        // Sort options
        const sortSelect = document.getElementById('sortRooms');
        if (sortSelect) {
            sortSelect.addEventListener('change', () => this.handleSort());
        }

        // View mode toggle
        const viewToggle = document.querySelectorAll('.view-toggle');
        viewToggle.forEach(btn => {
            btn.addEventListener('click', (e) => this.toggleView(e.target.dataset.view));
        });

        // Room card interactions
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('view-room-btn')) {
                const roomId = e.target.dataset.roomId;
                this.viewRoomDetails(roomId);
            }
            
            if (e.target.classList.contains('book-room-btn')) {
                const roomId = e.target.dataset.roomId;
                this.initiateBooking(roomId);
            }
            
            if (e.target.classList.contains('add-to-favorites')) {
                const roomId = e.target.dataset.roomId;
                this.toggleFavorite(roomId);
            }
        });

        // Pagination
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('page-btn')) {
                const page = parseInt(e.target.dataset.page);
                this.goToPage(page);
            }
        });
    },

    // Load rooms from API
    async loadRooms(params = {}) {
        try {
            Utils.showLoading();
            
            const response = await API.rooms.getAll({
                ...params,
                ...this.currentFilters
            });
            
            this.rooms = response.rooms || [];
            this.filteredRooms = [...this.rooms];
            this.currentPage = 1;
            
            this.renderRooms();
            this.renderPagination();
            
            console.log(`✅ Loaded ${this.rooms.length} rooms`);
            
        } catch (error) {
            const errorMsg = error.message || 'Failed to load rooms';
            Toast.error(errorMsg);
            console.error('Load rooms error:', error);
        } finally {
            Utils.hideLoading();
        }
    },

    // Handle filter changes
    handleFilterChange() {
        const formData = new FormData(document.getElementById('roomFilters'));
        
        this.currentFilters = {
            type: formData.get('type') || '',
            minPrice: formData.get('minPrice') || '',
            maxPrice: formData.get('maxPrice') || '',
            capacity: formData.get('capacity') || '',
            amenities: formData.getAll('amenities') || [],
            availability: formData.get('availability') === 'true'
        };
        
        this.applyFilters();
    },

    // Apply current filters
    applyFilters() {
        let filtered = [...this.rooms];
        
        // Filter by room type
        if (this.currentFilters.type) {
            filtered = filtered.filter(room => 
                room.type.toLowerCase().includes(this.currentFilters.type.toLowerCase())
            );
        }
        
        // Filter by price range
        if (this.currentFilters.minPrice) {
            filtered = filtered.filter(room => 
                room.price >= parseFloat(this.currentFilters.minPrice)
            );
        }
        
        if (this.currentFilters.maxPrice) {
            filtered = filtered.filter(room => 
                room.price <= parseFloat(this.currentFilters.maxPrice)
            );
        }
        
        // Filter by capacity
        if (this.currentFilters.capacity) {
            filtered = filtered.filter(room => 
                room.capacity >= parseInt(this.currentFilters.capacity)
            );
        }
        
        // Filter by amenities
        if (this.currentFilters.amenities.length > 0) {
            filtered = filtered.filter(room =>
                this.currentFilters.amenities.every(amenity =>
                    room.amenities.includes(amenity)
                )
            );
        }
        
        // Filter by availability
        if (this.currentFilters.availability) {
            filtered = filtered.filter(room => room.isAvailable);
        }
        
        this.filteredRooms = filtered;
        this.currentPage = 1;
        this.renderRooms();
        this.renderPagination();
        
        // Update results count
        this.updateResultsCount();
    },

    // Handle search
    handleSearch() {
        const searchTerm = document.getElementById('roomSearch')?.value?.toLowerCase() || '';
        
        if (!searchTerm) {
            this.filteredRooms = [...this.rooms];
        } else {
            this.filteredRooms = this.rooms.filter(room =>
                room.name.toLowerCase().includes(searchTerm) ||
                room.type.toLowerCase().includes(searchTerm) ||
                room.description.toLowerCase().includes(searchTerm) ||
                room.amenities.some(amenity => 
                    amenity.toLowerCase().includes(searchTerm)
                )
            );
        }
        
        this.currentPage = 1;
        this.renderRooms();
        this.renderPagination();
        this.updateResultsCount();
    },

    // Handle sorting
    handleSort() {
        const sortBy = document.getElementById('sortRooms')?.value || 'name';
        
        this.filteredRooms.sort((a, b) => {
            switch (sortBy) {
                case 'price-low':
                    return a.price - b.price;
                case 'price-high':
                    return b.price - a.price;
                case 'capacity':
                    return b.capacity - a.capacity;
                case 'rating':
                    return (b.averageRating || 0) - (a.averageRating || 0);
                case 'name':
                default:
                    return a.name.localeCompare(b.name);
            }
        });
        
        this.renderRooms();
    },

    // Reset all filters
    resetFilters() {
        document.getElementById('roomFilters')?.reset();
        document.getElementById('roomSearch').value = '';
        
        this.currentFilters = {
            type: '',
            minPrice: '',
            maxPrice: '',
            amenities: [],
            capacity: '',
            availability: true
        };
        
        this.filteredRooms = [...this.rooms];
        this.currentPage = 1;
        this.renderRooms();
        this.renderPagination();
        this.updateResultsCount();
    },

    // Render rooms
    renderRooms() {
        const container = document.getElementById('roomsContainer');
        if (!container) return;
        
        const startIndex = (this.currentPage - 1) * this.roomsPerPage;
        const endIndex = startIndex + this.roomsPerPage;
        const roomsToShow = this.filteredRooms.slice(startIndex, endIndex);
        
        if (roomsToShow.length === 0) {
            container.innerHTML = `
                <div class="no-rooms-found">
                    <i class="fas fa-bed"></i>
                    <h3>No rooms found</h3>
                    <p>Try adjusting your search criteria or filters</p>
                    <button class="btn btn-primary" onclick="RoomManager.resetFilters()">
                        Reset Filters
                    </button>
                </div>
            `;
            return;
        }
        
        container.innerHTML = roomsToShow.map(room => this.createRoomCard(room)).join('');
        
        // Initialize lazy loading for images
        this.initLazyLoading();
    },

    // Create room card HTML
    createRoomCard(room) {
        const isLoggedIn = Auth.isLoggedIn();
        const userFavorites = Auth.getCurrentUser()?.favorites || [];
        const isFavorite = userFavorites.includes(room._id);
        
        return `
            <div class="room-card" data-room-id="${room._id}">
                <div class="room-image">
                    <img src="${room.images?.[0] || '/assets/images/default-room.jpg'}" 
                         alt="${room.name}" 
                         loading="lazy">
                    ${room.specialOffers?.length > 0 ? `
                        <div class="room-badge offer">
                            ${room.specialOffers[0].title}
                        </div>
                    ` : ''}
                    ${isLoggedIn ? `
                        <button class="favorite-btn add-to-favorites ${isFavorite ? 'active' : ''}" 
                                data-room-id="${room._id}">
                            <i class="fas fa-heart"></i>
                        </button>
                    ` : ''}
                </div>
                
                <div class="room-content">
                    <div class="room-header">
                        <h3 class="room-name">${room.name}</h3>
                        <div class="room-rating">
                            ${this.renderStarRating(room.averageRating || 0)}
                            <span class="rating-count">(${room.reviews?.length || 0})</span>
                        </div>
                    </div>
                    
                    <p class="room-description">${this.truncateText(room.description, 100)}</p>
                    
                    <div class="room-details">
                        <div class="room-detail">
                            <i class="fas fa-users"></i>
                            <span>Up to ${room.capacity} guests</span>
                        </div>
                        <div class="room-detail">
                            <i class="fas fa-expand-arrows-alt"></i>
                            <span>${room.size} sq ft</span>
                        </div>
                        <div class="room-detail">
                            <i class="fas fa-bed"></i>
                            <span>${room.bedType}</span>
                        </div>
                    </div>
                    
                    <div class="room-amenities">
                        ${room.amenities.slice(0, 4).map(amenity => `
                            <span class="amenity-tag">${amenity}</span>
                        `).join('')}
                        ${room.amenities.length > 4 ? `
                            <span class="amenity-more">+${room.amenities.length - 4} more</span>
                        ` : ''}
                    </div>
                    
                    <div class="room-footer">
                        <div class="room-price">
                            <span class="currency">₹</span>
                            <span class="price">${Utils.formatPrice(room.price)}</span>
                            <span class="per-night">/night</span>
                        </div>
                        
                        <div class="room-actions">
                            <button class="btn btn-outline view-room-btn" 
                                    data-room-id="${room._id}">
                                View Details
                            </button>
                            <button class="btn btn-primary book-room-btn" 
                                    data-room-id="${room._id}"
                                    ${!room.isAvailable ? 'disabled' : ''}>
                                ${room.isAvailable ? 'Book Now' : 'Not Available'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    // Render star rating
    renderStarRating(rating) {
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 >= 0.5;
        const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
        
        return `
            <div class="star-rating">
                ${'<i class="fas fa-star"></i>'.repeat(fullStars)}
                ${hasHalfStar ? '<i class="fas fa-star-half-alt"></i>' : ''}
                ${'<i class="far fa-star"></i>'.repeat(emptyStars)}
                <span class="rating-value">${rating.toFixed(1)}</span>
            </div>
        `;
    },

    // Truncate text with ellipsis
    truncateText(text, maxLength) {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    },

    // Render pagination
    renderPagination() {
        const container = document.getElementById('roomsPagination');
        if (!container) return;
        
        const totalPages = Math.ceil(this.filteredRooms.length / this.roomsPerPage);
        
        if (totalPages <= 1) {
            container.innerHTML = '';
            return;
        }
        
        let paginationHTML = `
            <button class="page-btn prev" 
                    data-page="${this.currentPage - 1}"
                    ${this.currentPage === 1 ? 'disabled' : ''}>
                <i class="fas fa-chevron-left"></i>
            </button>
        `;
        
        // Page numbers
        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || 
                (i >= this.currentPage - 2 && i <= this.currentPage + 2)) {
                paginationHTML += `
                    <button class="page-btn ${i === this.currentPage ? 'active' : ''}" 
                            data-page="${i}">
                        ${i}
                    </button>
                `;
            } else if (i === this.currentPage - 3 || i === this.currentPage + 3) {
                paginationHTML += '<span class="page-ellipsis">...</span>';
            }
        }
        
        paginationHTML += `
            <button class="page-btn next" 
                    data-page="${this.currentPage + 1}"
                    ${this.currentPage === totalPages ? 'disabled' : ''}>
                <i class="fas fa-chevron-right"></i>
            </button>
        `;
        
        container.innerHTML = paginationHTML;
    },

    // Go to specific page
    goToPage(page) {
        const totalPages = Math.ceil(this.filteredRooms.length / this.roomsPerPage);
        
        if (page < 1 || page > totalPages) return;
        
        this.currentPage = page;
        this.renderRooms();
        this.renderPagination();
        
        // Scroll to rooms section
        document.getElementById('roomsContainer')?.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start' 
        });
    },

    // Update results count
    updateResultsCount() {
        const countElement = document.getElementById('roomsCount');
        if (countElement) {
            countElement.textContent = `${this.filteredRooms.length} room${this.filteredRooms.length !== 1 ? 's' : ''} found`;
        }
    },

    // Toggle view mode
    toggleView(viewMode) {
        const container = document.getElementById('roomsContainer');
        if (!container) return;
        
        container.className = `rooms-grid ${viewMode}-view`;
        
        // Update active toggle button
        document.querySelectorAll('.view-toggle').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === viewMode);
        });
    },

    // View room details
    async viewRoomDetails(roomId) {
        try {
            Loading.show('Loading room details...');
            
            const room = await API.rooms.getById(roomId);
            
            // Open room details modal
            Modal.show('roomDetailsModal');
            this.populateRoomDetails(room);
            
        } catch (error) {
            const errorMsg = API.handleError(error, 'Failed to load room details');
            Toast.error(errorMsg);
        } finally {
            Loading.hide();
        }
    },

    // Populate room details modal
    populateRoomDetails(room) {
        const modal = document.getElementById('roomDetailsModal');
        if (!modal) return;
        
        // Update modal content
        const content = modal.querySelector('.modal-content');
        content.innerHTML = `
            <div class="modal-header">
                <h2>${room.name}</h2>
                <button class="modal-close">&times;</button>
            </div>
            
            <div class="modal-body">
                <div class="room-details-content">
                    <div class="room-gallery">
                        ${room.images?.length > 0 ? `
                            <div class="main-image">
                                <img src="${room.images[0]}" alt="${room.name}">
                            </div>
                            ${room.images.length > 1 ? `
                                <div class="image-thumbnails">
                                    ${room.images.slice(1, 5).map(img => `
                                        <img src="${img}" alt="${room.name}" 
                                             onclick="this.parentElement.previousElementSibling.querySelector('img').src = this.src">
                                    `).join('')}
                                </div>
                            ` : ''}
                        ` : ''}
                    </div>
                    
                    <div class="room-info">
                        <div class="room-header">
                            <div class="room-rating">
                                ${this.renderStarRating(room.averageRating || 0)}
                                <span class="rating-count">(${room.reviews?.length || 0} reviews)</span>
                            </div>
                            <div class="room-price">
                                <span class="currency">₹</span>
                                <span class="price">${Utils.formatPrice(room.price)}</span>
                                <span class="per-night">/night</span>
                            </div>
                        </div>
                        
                        <p class="room-description">${room.description}</p>
                        
                        <div class="room-specs">
                            <div class="spec-item">
                                <i class="fas fa-users"></i>
                                <span>Capacity: ${room.capacity} guests</span>
                            </div>
                            <div class="spec-item">
                                <i class="fas fa-expand-arrows-alt"></i>
                                <span>Size: ${room.size} sq ft</span>
                            </div>
                            <div class="spec-item">
                                <i class="fas fa-bed"></i>
                                <span>Bed: ${room.bedType}</span>
                            </div>
                            <div class="spec-item">
                                <i class="fas fa-bath"></i>
                                <span>Bathroom: ${room.bathroom || 'Private'}</span>
                            </div>
                        </div>
                        
                        <div class="room-amenities-full">
                            <h4>Amenities</h4>
                            <div class="amenities-grid">
                                ${room.amenities.map(amenity => `
                                    <div class="amenity-item">
                                        <i class="fas fa-check"></i>
                                        <span>${amenity}</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                        
                        ${room.specialOffers?.length > 0 ? `
                            <div class="special-offers">
                                <h4>Special Offers</h4>
                                ${room.specialOffers.map(offer => `
                                    <div class="offer-item">
                                        <strong>${offer.title}</strong>
                                        <p>${offer.description}</p>
                                        <span class="offer-discount">${offer.discountPercentage}% OFF</span>
                                    </div>
                                `).join('')}
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
            
            <div class="modal-footer">
                <button class="btn btn-outline" onclick="Modal.hide('roomDetailsModal')">
                    Close
                </button>
                <button class="btn btn-primary book-room-btn" 
                        data-room-id="${room._id}">
                    Book This Room
                </button>
            </div>
        `;
    },

    // Initiate booking
    initiateBooking(roomId) {
        if (!Auth.isLoggedIn()) {
            Toast.info('Please login to book a room');
            Modal.show('loginModal');
            return;
        }
        
        // Pre-fill booking form with room info
        const room = this.rooms.find(r => r._id === roomId);
        if (room && typeof BookingManager !== 'undefined') {
            BookingManager.startBooking(room);
        }
    },

    // Toggle favorite room
    async toggleFavorite(roomId) {
        if (!Auth.isLoggedIn()) {
            Toast.info('Please login to add favorites');
            Modal.show('loginModal');
            return;
        }
        
        try {
            const user = Auth.getCurrentUser();
            const favorites = user.favorites || [];
            const isFavorite = favorites.includes(roomId);
            
            let updatedFavorites;
            if (isFavorite) {
                updatedFavorites = favorites.filter(id => id !== roomId);
                Toast.success('Removed from favorites');
            } else {
                updatedFavorites = [...favorites, roomId];
                Toast.success('Added to favorites');
            }
            
            // Update user profile
            await API.auth.updateProfile({ favorites: updatedFavorites });
            
            // Update local user data
            Auth.updateUserData({ favorites: updatedFavorites });
            
            // Update UI
            const favoriteBtn = document.querySelector(`[data-room-id="${roomId}"].add-to-favorites`);
            if (favoriteBtn) {
                favoriteBtn.classList.toggle('active', !isFavorite);
            }
            
        } catch (error) {
            const errorMsg = API.handleError(error, 'Failed to update favorites');
            Toast.error(errorMsg);
        }
    },

    // Setup date picker for availability checking
    setupDatePicker() {
        const checkInInput = document.getElementById('checkIn');
        const checkOutInput = document.getElementById('checkOut');
        
        if (checkInInput && checkOutInput) {
            // Set minimum date to today
            const today = new Date().toISOString().split('T')[0];
            checkInInput.min = today;
            checkOutInput.min = today;
            
            // Update checkout minimum when checkin changes
            checkInInput.addEventListener('change', () => {
                const checkInDate = new Date(checkInInput.value);
                checkInDate.setDate(checkInDate.getDate() + 1);
                checkOutInput.min = checkInDate.toISOString().split('T')[0];
                
                if (checkOutInput.value && new Date(checkOutInput.value) <= new Date(checkInInput.value)) {
                    checkOutInput.value = '';
                }
            });
        }
    },

    // Initialize lazy loading for room images
    initLazyLoading() {
        const images = document.querySelectorAll('img[loading="lazy"]');
        
        if ('IntersectionObserver' in window) {
            const imageObserver = new IntersectionObserver((entries, observer) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        img.src = img.src;
                        img.classList.remove('lazy');
                        observer.unobserve(img);
                    }
                });
            });
            
            images.forEach(img => imageObserver.observe(img));
        }
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Initialize room manager after a short delay to ensure other modules are loaded
    setTimeout(() => {
        RoomManager.init();
    }, 100);
});

// Export for global access
window.RoomManager = RoomManager;
