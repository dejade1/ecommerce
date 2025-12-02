import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';

// Nota: Necesitarás exportar 'app' desde server.ts para poder testearlo
// Aquí asumo que tienes una variable 'app' exportada

const API_URL = 'http://localhost:3000';

describe('API de Autenticación', () => {
  let accessToken: string;
  let refreshToken: string;

  describe('POST /api/auth/register', () => {
    it('debe registrar un nuevo usuario', async () => {
      const response = await request(API_URL)
        .post('/api/auth/register')
        .send({
          username: 'testuser',
          email: 'test@example.com',
          password: 'Password123!',
        });

      expect(response.status).toBe(201);
      expect(response.body.user).toBeDefined();
      expect(response.body.user.username).toBe('testuser');
    });

    it('debe rechazar usuario duplicado', async () => {
      // Intentar registrar el mismo usuario otra vez
      const response = await request(API_URL)
        .post('/api/auth/register')
        .send({
          username: 'testuser',
          email: 'test@example.com',
          password: 'Password123!',
        });

      expect(response.status).toBe(409);
      expect(response.body.error).toContain('ya existe');
    });

    it('debe rechazar contraseña débil', async () => {
      const response = await request(API_URL)
        .post('/api/auth/register')
        .send({
          username: 'testuser2',
          email: 'test2@example.com',
          password: 'weak', // Contraseña débil
        });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/auth/login', () => {
    it('debe hacer login correctamente', async () => {
      const response = await request(API_URL)
        .post('/api/auth/login')
        .send({
          username: 'testuser',
          password: 'Password123!',
        });

      expect(response.status).toBe(200);
      expect(response.body.user).toBeDefined();

      // ✅ CRÍTICO: Verificar que las cookies httpOnly se establecen
      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();

      const accessTokenCookie = cookies.find((c: string) => c.startsWith('accessToken'));
      const refreshTokenCookie = cookies.find((c: string) => c.startsWith('refreshToken'));

      expect(accessTokenCookie).toBeDefined();
      expect(refreshTokenCookie).toBeDefined();
      expect(accessTokenCookie).toContain('HttpOnly');
      expect(refreshTokenCookie).toContain('HttpOnly');
    });

    it('debe rechazar credenciales incorrectas', async () => {
      const response = await request(API_URL)
        .post('/api/auth/login')
        .send({
          username: 'testuser',
          password: 'WrongPassword!',
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('inválidas');
    });

    // ✅ CRÍTICO: Verificar rate limiting
    it('debe aplicar rate limiting después de 5 intentos', async () => {
      const requests = [];

      for (let i = 0; i < 6; i++) {
        requests.push(
          request(API_URL)
            .post('/api/auth/login')
            .send({
              username: 'testuser',
              password: 'wrong',
            })
        );
      }

      const responses = await Promise.all(requests);
      const lastResponse = responses[responses.length - 1];

      expect(lastResponse.status).toBe(429); // Too Many Requests
    }, 20000); // Timeout mayor porque hace 6 requests
  });

  // ✅ CRÍTICO: Verificar que refreshToken funciona
  describe('POST /api/auth/refresh', () => {
    it('debe refrescar el access token', async () => {
      // Primero hacer login
      const loginResponse = await request(API_URL)
        .post('/api/auth/login')
        .send({
          username: 'testuser',
          password: 'Password123!',
        });

      const cookies = loginResponse.headers['set-cookie'];

      // Llamar al endpoint de refresh
      const refreshResponse = await request(API_URL)
        .post('/api/auth/refresh')
        .set('Cookie', cookies);

      expect(refreshResponse.status).toBe(200);

      // Debe retornar un nuevo accessToken en las cookies
      const newCookies = refreshResponse.headers['set-cookie'];
      expect(newCookies).toBeDefined();
      const newAccessToken = newCookies.find((c: string) => c.startsWith('accessToken'));
      expect(newAccessToken).toBeDefined();
    });

    it('debe rechazar refresh sin token', async () => {
      const response = await request(API_URL)
        .post('/api/auth/refresh');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/auth/me', () => {
    it('debe retornar usuario autenticado', async () => {
      // Primero hacer login
      const loginResponse = await request(API_URL)
        .post('/api/auth/login')
        .send({
          username: 'testuser',
          password: 'Password123!',
        });

      const cookies = loginResponse.headers['set-cookie'];

      // Obtener usuario actual
      const response = await request(API_URL)
        .get('/api/auth/me')
        .set('Cookie', cookies);

      expect(response.status).toBe(200);
      expect(response.body.user).toBeDefined();
      expect(response.body.user.username).toBe('testuser');
    });

    it('debe rechazar sin autenticación', async () => {
      const response = await request(API_URL)
        .get('/api/auth/me');

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('debe cerrar sesión correctamente', async () => {
      // Primero hacer login
      const loginResponse = await request(API_URL)
        .post('/api/auth/login')
        .send({
          username: 'testuser',
          password: 'Password123!',
        });

      const cookies = loginResponse.headers['set-cookie'];

      // Hacer logout
      const logoutResponse = await request(API_URL)
        .post('/api/auth/logout')
        .set('Cookie', cookies);

      expect(logoutResponse.status).toBe(200);

      // Intentar acceder a /me con las cookies antiguas debe fallar
      const meResponse = await request(API_URL)
        .get('/api/auth/me')
        .set('Cookie', cookies);

      expect(meResponse.status).toBe(401);
    });
  });
});
