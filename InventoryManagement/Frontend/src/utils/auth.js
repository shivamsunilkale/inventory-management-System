export const checkAuth = () => {
    try {
        const user = localStorage.getItem('user');
        const tokens = localStorage.getItem('tokens');
        
        if (!user || !tokens) {
            console.log('Auth check: Missing user or tokens in localStorage');
            return false;
        }
        
        try {
            const parsedUser = JSON.parse(user);
            const parsedTokens = JSON.parse(tokens);
            const isAuthenticated = !!(parsedUser && parsedTokens && parsedTokens.access_token);
            console.log('Auth check:', isAuthenticated ? 'Authenticated' : 'Not authenticated');
            return isAuthenticated;
        } catch (parseError) {
            console.error('Error parsing auth data:', parseError);
            return false;
        }
    } catch (error) {
        console.error('Error checking auth:', error);
        return false;
    }
};

export const setAuth = (userData, tokens) => {
    console.log('Setting auth data:', { userData, tokens });
    
    if (!userData) {
        console.error('Invalid user data provided');
        return false;
    }
    
    if (!tokens || !tokens.access_token) {
        console.error('Invalid tokens provided');
        return false;
    }
    
    try {
        // Store items individually with error handling
        try {
            const userStr = JSON.stringify(userData);
            localStorage.setItem('user', userStr);
            console.log('User data saved:', userStr);
        } catch (userError) {
            console.error('Failed to save user data:', userError);
            return false;
        }
        
        try {
            const tokensStr = JSON.stringify(tokens);
            localStorage.setItem('tokens', tokensStr);
            console.log('Tokens saved:', tokensStr);
        } catch (tokenError) {
            console.error('Failed to save tokens:', tokenError);
            return false;
        }
        
        console.log('Auth data saved successfully');
        return true;
    } catch (error) {
        console.error('Failed to save auth data:', error);
        return false;
    }
};

export const logout = () => {
    console.log('Logging out user');
    localStorage.removeItem('user');
    localStorage.removeItem('tokens');
    
    // Also try to clear potential HTTP-only cookies by making a logout request
    try {
        fetch('http://localhost:8000/auth/logout', {
            method: 'POST',
            credentials: 'include'
        }).catch(e => console.log('Logout request error (can be ignored):', e));
    } catch (e) {
        // Ignore errors during logout request
    }
    
    window.location.href = '/';
};

export const getUser = () => {
    try {
        const user = JSON.parse(localStorage.getItem('user'));
        return user;
    } catch (error) {
        console.error('Error getting user data:', error);
        return null;
    }
};
