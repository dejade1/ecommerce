import { describe, it, expect } from 'vitest';
import {
  isStrongPassword,
  getPasswordStrength,
  sanitizeString,
  isValidEmail,
  isValidUsername
} from './validation';

describe('Validación de Contraseñas', () => {
  describe('isStrongPassword', () => {
    it('debe aceptar contraseña fuerte', () => {
      expect(isStrongPassword('Password123!')).toBe(true);
      expect(isStrongPassword('MyP@ssw0rd')).toBe(true);
      expect(isStrongPassword('Str0ng!Pass')).toBe(true);
    });

    it('debe rechazar contraseña sin mayúscula', () => {
      expect(isStrongPassword('password123!')).toBe(false);
    });

    it('debe rechazar contraseña sin minúscula', () => {
      expect(isStrongPassword('PASSWORD123!')).toBe(false);
    });

    it('debe rechazar contraseña sin número', () => {
      expect(isStrongPassword('Password!')).toBe(false);
    });

    it('debe rechazar contraseña sin símbolo', () => {
      expect(isStrongPassword('Password123')).toBe(false);
    });

    it('debe rechazar contraseña muy corta', () => {
      expect(isStrongPassword('Pa1!')).toBe(false);
    });

    it('debe rechazar contraseña muy larga', () => {
      const longPassword = 'A'.repeat(130) + '1!';
      expect(isStrongPassword(longPassword)).toBe(false);
    });

    // ✅ TEST CRÍTICO: Verificar que no hay ReDoS
    it('debe validar contraseñas largas sin timeout (ReDoS fix)', () => {
      const start = Date.now();
      const longPassword = 'A'.repeat(100) + 'a1!';
      isStrongPassword(longPassword);
      const duration = Date.now() - start;

      // Si tarda más de 100ms, hay ReDoS
      expect(duration).toBeLessThan(100);
    });
  });

  describe('getPasswordStrength', () => {
    it('debe dar score 6/6 a contraseña muy fuerte', () => {
      const result = getPasswordStrength('MyVeryStr0ng!Password');
      expect(result.score).toBe(6);
      expect(result.feedback).toHaveLength(0);
    });

    it('debe dar feedback para contraseña débil', () => {
      const result = getPasswordStrength('weak');
      expect(result.score).toBeLessThan(6);
      expect(result.feedback.length).toBeGreaterThan(0);
    });
  });
});

describe('Sanitización', () => {
  it('debe eliminar tags peligrosos', () => {
    expect(sanitizeString('<script>alert("xss")</script>')).toBe('alert("xss")');
    expect(sanitizeString('Hello<script>bad</script>World')).toBe('HellobadWorld');
  });

  it('debe eliminar eventos inline', () => {
    expect(sanitizeString('onclick="alert(1)"')).toBe('');
  });

  it('debe eliminar javascript: URLs', () => {
    expect(sanitizeString('javascript:alert(1)')).toBe(':alert(1)');
  });
});

describe('Validación de Email', () => {
  it('debe aceptar emails válidos', () => {
    expect(isValidEmail('test@example.com')).toBe(true);
    expect(isValidEmail('user.name@domain.co.uk')).toBe(true);
  });

  it('debe rechazar emails inválidos', () => {
    expect(isValidEmail('invalid')).toBe(false);
    expect(isValidEmail('@example.com')).toBe(false);
    expect(isValidEmail('test@')).toBe(false);
  });
});

describe('Validación de Username', () => {
  it('debe aceptar usernames válidos', () => {
    expect(isValidUsername('john_doe')).toBe(true);
    expect(isValidUsername('user123')).toBe(true);
    expect(isValidUsername('test-user')).toBe(true);
  });

  it('debe rechazar usernames inválidos', () => {
    expect(isValidUsername('a')).toBe(false); // muy corto
    expect(isValidUsername('user@domain')).toBe(false); // carácter inválido
    expect(isValidUsername('user name')).toBe(false); // espacio
  });
});
