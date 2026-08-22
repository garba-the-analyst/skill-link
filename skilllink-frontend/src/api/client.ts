// skilllink-frontend/src/api/client.ts
import axios from 'axios';

// Vite exposes any VITE_-prefixed .env variable on import.meta.env at build
// time. Falls back to localhost so a fresh clone still works before you've
// set up .env — see the frontend README for how to point this at a
// deployed backend.
const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const client = axios.create({ baseURL });

// Automatically attach the Authorization Bearer token to every request
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('skilllink_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default client;
