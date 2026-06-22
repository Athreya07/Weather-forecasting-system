import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
});

export const weatherAPI = {
  getCurrentWeather: () => api.get('/weather/current'),
  getForecast: (hours = 6) => api.get(`/forecast?hours=${hours}`),
  getHourlyForecast: (hours = 24) => api.get(`/forecast/hourly?hours=${hours}`),
  getHistorical: () => api.get('/analytics/historical'),
  getMetrics: () => api.get('/metrics'),
  predict: (data) => api.post('/predict', data),
};

export default api;
