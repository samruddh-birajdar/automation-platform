import http from 'k6/http';
import { check } from 'k6';

export const options = {
  // Simulate 50 virtual users hitting the API for 10 seconds
  vus: 50, 
  duration: '10s',
};

export default function () {
  // We target the EXACT SAME workflow ID to trigger the lock
  const url = 'http://localhost:8000/webhook/1'; 
  const payload = JSON.stringify({
    data: { test: "k6 load test" }
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const res = http.post(url, payload, params);
  
  check(res, {
    'is status 200': (r) => r.status === 200,
  });
}
