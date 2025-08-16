import React, { useEffect } from 'react';
import axios from '@/bootstrap/axios';

const ClientSide = () => {

  async function testApiAuth() {
    // (CSRF cookie primes the Sanctum SPA flow for non-GETs; safe to call once)
    await axios.get('/sanctum/csrf-cookie');
    const res = await axios.get('/api/ping');
    console.log(res.data); // => { ok: true, user: { ... } } if your web session is valid
  }
  useEffect(() => {
    testApiAuth()
  }, [])
  return (
    <div>

    </div>
  );
};

export default ClientSide;