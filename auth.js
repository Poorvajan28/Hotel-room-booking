/**
 * Authentication Module - Hotel Room Booking System
 * Developed by POORVAJAN G S
 * Final Year CSE Student at KSRIET
 * Leader of Team CODE CRAFTS
 */

const Auth = {
    // Check if user is authenticated
    isAuthenticated() {
        const token = localStorage.getItem(CONFIG.STORAGE_KEYS.TOKEN);
        const user = localStorage.getItem(CONFIG.STORAGE_KEYS.USER);
        return !!(token && user);
    },

    // Get current user from localStorage
    getCurrentUser() {
        try {
            const userStr = localStorage.getItem(CONFIG.STORAGE_KEYS.USER);
            return userStr ? JSON.parse(userStr) : null;
        } catch (error) {
            console.error('Error parsing user data:', error);
            return null;
        }
    },

    // Get auth token
    getToken() {
        return localStorage.getItem(CONFIG.STORAGE_KEYS.TOKEN);
    },

    // Save auth data
    saveAuthData(token, user) {
        localStorage.setItem(CONFIG.STORAGE_KEYS.TOKEN, token);
        localStorage.setItem(CONFIG.STORAGE_KEYS.USER, JSON.stringify(user));
        
        // Update global state
        APP.isAuthenticated = true;
        APP.currentUser = user;
        
        // Update UI
        Navigation.updateAuthUI();
    },

    // Clear auth data
    clearAuthData() {
        localStorage.removeItem(CONFIG.STORAGE_KEYS.TOKEN);
        localStorage.removeItem(CONFIG.STORAGE_KEYS.USER);
        
        // Update global state
        APP.isAuthenticated = false;
        APP.currentUser = null;
        
        // Update UI
        Navigation.updateAuthUI();
    },

    // Check authentication status on app load
    checkAuthStatus() {
        if (this.isAuthenticated()) {
            const user = this.getCurrentUser();
            if (user) {
                APP.isAuthenticated = true;
                APP.currentUser = user;
                Navigation.updateAuthUI();
            } else {
                this.clearAuthData();
            }
        }
    },

    // Login function
    async login(email, password) {
        try {
            Utils.showLoading();

            const response = await API.post(CONFIG.ENDPOINTS.AUTH.LOGIN, {
                email: email.trim(),
                password: password
            });

            if (response.success) {
                this.saveAuthData(response.token, response.user);
                Toast.success(CONFIG.SUCCESS_MESSAGES.LOGIN);
                Modal.hideAll();
                return true;
            } else {
                Toast.error(response.error || 'Login failed');
                return false;
            }
        } catch (error) {
            console.error('Login error:', error);
            Toast.error('Login failed. Please try again.');
            return false;
        } finally {
            Utils.hideLoading();
        }
    },

    // Register function
    async register(userData) {
        try {
            Utils.showLoading();

            // Validate data
            const validation = Utils.validateForm(userData, CONFIG.VALIDATION);
            if (!validation.isValid) {
                const firstError = Object.values(validation.errors)[0];
                Toast.error(firstError);
                return false;
            }

            // Check password confirmation
            if (userData.password !== userData.confirmPassword) {
                Toast.error('Passwords do not match');
                return false;
            }

            const response = await API.post(CONFIG.ENDPOINTS.AUTH.REGISTER, {
                firstName: userData.firstName.trim(),
                lastName: userData.lastName.trim(),
                email: userData.email.trim(),
                password: userData.password,
                phone: userData.phone.trim()
            });

            if (response.success) {
                this.saveAuthData(response.token, response.user);
                Toast.success(CONFIG.SUCCESS_MESSAGES.REGISTER);
                Modal.hideAll();
                return true;
            } else {
                Toast.error(response.error || 'Registration failed');
                return false;
            }
        } catch (error) {
            console.error('Registration error:', error);
            Toast.error('Registration failed. Please try again.');
            return false;
        } finally {
            Utils.hideLoading();
        }
    },

    // Logout function
    async logout() {
        try {
            Utils.showLoading();

            // Call logout API if available
            if (this.isAuthenticated()) {
                try {
                    await API.post(CONFIG.ENDPOINTS.AUTH.LOGOUT);
                } catch (error) {
                    console.warn('Logout API call failed:', error);
                }
            }

            // Clear local data
            this.clearAuthData();
            
            Toast.success(CONFIG.SUCCESS_MESSAGES.LOGOUT);

            // Redirect to home if on protected page
            if (window.location.hash && window.location.hash.includes('dashboard')) {
                window.location.hash = '';
                window.location.reload();
            }

        } catch (error) {
            console.error('Logout error:', error);
            // Still clear local data even if API call fails
            this.clearAuthData();
            Toast.success('Logged out successfully');
        } finally {
            Utils.hideLoading();
        }
    },

    // Update profile
    async updateProfile(profileData) {
        try {
            Utils.showLoading();

            const response = await API.put(CONFIG.ENDPOINTS.AUTH.PROFILE, profileData);

            if (response.success) {
                // Update stored user data
                const currentUser = this.getCurrentUser();
                const updatedUser = { ...currentUser, ...response.user };
                this.saveAuthData(this.getToken(), updatedUser);
                
                Toast.success(CONFIG.SUCCESS_MESSAGES.PROFILE_UPDATED);
                return true;
            } else {
                Toast.error(response.error || 'Profile update failed');
                return false;
            }
        } catch (error) {
            console.error('Profile update error:', error);
            Toast.error('Profile update failed. Please try again.');
            return false;
        } finally {
            Utils.hideLoading();
        }
    },

    // Change password
    async changePassword(currentPassword, newPassword) {
        try {
            Utils.showLoading();

            const response = await API.put(CONFIG.ENDPOINTS.AUTH.CHANGE_PASSWORD, {
                currentPassword,
                newPassword
            });

            if (response.success) {
                Toast.success(CONFIG.SUCCESS_MESSAGES.PASSWORD_CHANGED);
                return true;
            } else {
                Toast.error(response.error || 'Password change failed');
                return false;
            }
        } catch (error) {
            console.error('Password change error:', error);
            Toast.error('Password change failed. Please try again.');
            return false;
        } finally {
            Utils.hideLoading();
        }
    },

    // Get user profile
    async getProfile() {
        try {
            const response = await API.get(CONFIG.ENDPOINTS.AUTH.PROFILE);
            
            if (response.success) {
                // Update stored user data
                this.saveAuthData(this.getToken(), response.user);
                return response.user;
            } else {
                throw new Error(response.error);
            }
        } catch (error) {
            console.error('Get profile error:', error);
            // If unauthorized, logout
            if (error.status === 401) {
                this.clearAuthData();
            }
            return null;
        }
    },

    // Check if user has role
    hasRole(role) {
        const user = this.getCurrentUser();
        return user && user.role === role;
    },

    // Check if user is admin
    isAdmin() {
        return this.hasRole('admin');
    },

    // Require authentication (redirect if not authenticated)
    requireAuth() {
        if (!this.isAuthenticated()) {
            Toast.warning('Please login to access this feature');
            Modal.show('loginModal');
            return false;
        }
        return true;
    },

    // Require admin role
    requireAdmin() {
        if (!this.requireAuth()) {
            return false;
        }
        
        if (!this.isAdmin()) {
            Toast.error('Admin access required');
            return false;
        }
        
        return true;
    }
};

// Initialize authentication handlers
document.addEventListener('DOMContentLoaded', function() {
    // Login form handler
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formData = new FormData(loginForm);
            const email = formData.get('email');
            const password = formData.get('password');

            if (await Auth.login(email, password)) {
                loginForm.reset();
            }
        });
    }

    // Register form handler
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formData = new FormData(registerForm);
            const userData = {
                firstName: formData.get('firstName'),
                lastName: formData.get('lastName'),
                email: formData.get('email'),
                phone: formData.get('phone'),
                password: formData.get('password'),
                confirmPassword: formData.get('confirmPassword')
            };

            if (await Auth.register(userData)) {
                registerForm.reset();
            }
        });
    }

    // Dashboard link handler
    const dashboardLink = document.getElementById('dashboardLink');
    if (dashboardLink) {
        dashboardLink.addEventListener('click', function(e) {
            e.preventDefault();
            if (Auth.requireAuth()) {
                if (typeof Dashboard !== 'undefined') {
                    Dashboard.show();
                } else {
                    Modal.show('dashboardModal');
                }
            }
        });
    }

    // Profile link handler
    const profileLink = document.getElementById('profileLink');
    if (profileLink) {
        profileLink.addEventListener('click', function(e) {
            e.preventDefault();
            if (Auth.requireAuth()) {
                // Show profile editing interface
                Auth.showProfileEditor();
            }
        });
    }

    // Show profile editor
    Auth.showProfileEditor = function() {
        const user = Auth.getCurrentUser();
        if (!user) return;

        const profileHtml = `
            <div class="profile-editor">
                <h3>Edit Profile</h3>
                <form id="profileEditForm">
                    <div class="form-row">
                        <div class="form-group">
                            <label for="editFirstName">First Name</label>
                            <input type="text" id="editFirstName" value="${user.firstName || ''}" required>
                        </div>
                        <div class="form-group">
                            <label for="editLastName">Last Name</label>
                            <input type="text" id="editLastName" value="${user.lastName || ''}" required>
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="editPhone">Phone Number</label>
                        <input type="tel" id="editPhone" value="${user.phone || ''}" pattern="[0-9]{10}" required>
                    </div>
                    <div class="form-group">
                        <label for="editEmail">Email (Read Only)</label>
                        <input type="email" id="editEmail" value="${user.email || ''}" readonly>
                    </div>
                    <div class="form-actions">
                        <button type="submit" class="btn btn-primary">Update Profile</button>
                        <button type="button" class="btn btn-outline" onclick="Modal.hideAll()">Cancel</button>
                    </div>
                </form>
            </div>
        `;

        // Create or update dashboard modal content
        const dashboardContent = document.getElementById('dashboardContent');
        if (dashboardContent) {
            dashboardContent.innerHTML = profileHtml;
            Modal.show('dashboardModal');

            // Add form handler
            const profileEditForm = document.getElementById('profileEditForm');
            profileEditForm.addEventListener('submit', async function(e) {
                e.preventDefault();
                
                const profileData = {
                    firstName: document.getElementById('editFirstName').value.trim(),
                    lastName: document.getElementById('editLastName').value.trim(),
                    phone: document.getElementById('editPhone').value.trim()
                };

                if (await Auth.updateProfile(profileData)) {
                    Modal.hideAll();
                }
            });
        }
    };
});

// Export Auth module
window.Auth = Auth;
