const BASE_URL = 'https://sydexbackend-production.up.railway.app/api';
const WS_URL = 'https://sydexbackend-production.up.railway.app';

class ApiService {
  constructor() {
    this.token = localStorage.getItem('sydex_token');
    this.socket = null;
    this._onBoardUpdatedCallback = null;
  }

  connectSocket() {
    if (this.socket) return; // Already connected
    if (!this.token) return;

    this.socket = io(WS_URL, {
      auth: { token: this.token },
      transports: ['websocket', 'polling']
    });

    this.socket.on('connect', () => {
      console.log('WebSocket connected');
    });

    this.socket.on('board-updated', (data) => {
      console.log('Board updated by:', data.updatedBy);
      if (this._onBoardUpdatedCallback) {
        this._onBoardUpdatedCallback(data);
      }
    });

    this.socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
    });
  }

  disconnectSocket() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  onBoardUpdated(callback) {
    this._onBoardUpdatedCallback = callback;
  }

  setToken(token, user) {
    this.token = token;
    if (token) {
      localStorage.setItem('sydex_token', token);
      if (user) localStorage.setItem('sydex_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('sydex_token');
      localStorage.removeItem('sydex_user');
    }
  }

  getHeaders() {
    const headers = { 'Content-Type': 'application/json' };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    return headers;
  }

  async _fetch(url, options = {}) {
    const res = await fetch(url, options);
    if (res.status === 401) {
      this._handleSessionExpired();
      throw new Error('Session expired. Please log in again.');
    }
    return res;
  }

  _handleSessionExpired() {
    if (this._sessionExpiredHandled) return;
    this._sessionExpiredHandled = true;

    this.setToken(null);
    this.disconnectSocket();

    const authScreen = document.getElementById('auth-screen');
    if (authScreen) authScreen.classList.remove('hidden');

    const boardView = document.getElementById('board-view');
    if (boardView) boardView.classList.add('hidden');
    const homeView = document.getElementById('home-view');
    if (homeView) homeView.classList.add('hidden');

    if (typeof notify === 'function') {
      notify('Your session has expired. Please log in again.', 'warning', 6000);
    }

    setTimeout(() => { this._sessionExpiredHandled = false; }, 3000);
  }

  async login(email, password) {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Login failed');
    this.setToken(data.token, data.user);
    return data;
  }

  async checkUser(username, email) {
    const res = await fetch(`${BASE_URL}/auth/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Validation failed');
    return data;
  }

  async register(username, email, password, { theme, permEmails, permTelemetry } = {}) {
    const res = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password, theme, permEmails, permTelemetry })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Registration failed');
    this.setToken(data.token, data.user);
    return data;
  }

  async changePassword(currentPassword, newPassword) {
    const res = await this._fetch(`${BASE_URL}/auth/password`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify({ currentPassword, newPassword })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to change password');
    return data;
  }

  async getPermissions() {
    const res = await this._fetch(`${BASE_URL}/auth/permissions`, {
      headers: this.getHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to fetch permissions');
    return data;
  }

  async updatePermissions(perms) {
    const res = await this._fetch(`${BASE_URL}/auth/permissions`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(perms)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to update permissions');
    return data;
  }

  async getBoardData() {
    const res = await this._fetch(`${BASE_URL}/data`, {
      headers: this.getHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to fetch data');
    return data;
  }

  async saveBoardData(boardData) {
    const res = await this._fetch(`${BASE_URL}/data`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(boardData)
    });
    if (!res.ok) throw new Error('Failed to save data');
    return await res.json();
  }

  async generateInvite(boardId, forceNew = false) {
    const res = await this._fetch(`${BASE_URL}/data/invite`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ boardId, forceNew })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to generate invite');
    return data;
  }

  async joinBoard(code) {
    const res = await this._fetch(`${BASE_URL}/data/join`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ code })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to join board');
    return data;
  }

  async leaveBoard(boardId) {
    const res = await this._fetch(`${BASE_URL}/data/leave`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ boardId })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to leave board');
    return data;
  }

  async updateAvatar(base64Image) {
    const res = await this._fetch(`${BASE_URL}/auth/avatar`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify({ avatar: base64Image })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to update avatar');

    // Update local storage user with new avatar
    if (data.user) {
      this.setToken(this.token, data.user);
    }
    return data;
  }

  async getCollaborators(boardId) {
    const res = await this._fetch(`${BASE_URL}/data/collaborators/${boardId}`, {
      headers: this.getHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to fetch collaborators');
    return data;
  }

  async kickCollaborator(boardId, userId) {
    const res = await this._fetch(`${BASE_URL}/data/kick`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ boardId, userId })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to remove collaborator');
    return data;
  }

  async banCollaborator(boardId, userId) {
    const res = await this._fetch(`${BASE_URL}/data/ban`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ boardId, userId })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to ban collaborator');
    return data;
  }

  async getBannedUsers(boardId) {
    const res = await this._fetch(`${BASE_URL}/data/banned/${boardId}`, {
      headers: this.getHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to fetch banned users');
    return data;
  }

  async unbanUser(boardId, userId) {
    const res = await this._fetch(`${BASE_URL}/data/unban`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ boardId, userId })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to unban user');
    return data;
  }
}

const api = new ApiService();
window.api = api; // Make it available globally
