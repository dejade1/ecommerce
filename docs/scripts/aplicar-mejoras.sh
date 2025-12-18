#!/bin/bash

# Script para aplicar mejoras de seguridad y optimización
# Rama: revisionesclaude
# Autor: Claude AI
# Fecha: 18 Diciembre 2025

set -e  # Salir si hay algún error

echo "🚀 Iniciando aplicación de mejoras de seguridad y optimización..."
echo ""

# Colores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Función para imprimir mensajes
print_step() {
    echo -e "${BLUE}==>${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Verificar que estamos en un repositorio git
if [ ! -d ".git" ]; then
    print_error "No estás en la raíz de un repositorio git"
    exit 1
fi

# Paso 1: Actualizar rama base
print_step "Paso 1: Actualizando rama integration-correcciones-debug..."
git fetch origin
git checkout integration-correcciones-debug
git pull origin integration-correcciones-debug
print_success "Rama base actualizada"
echo ""

# Paso 2: Crear nueva rama
print_step "Paso 2: Creando nueva rama 'revisionesclaude'..."
if git show-ref --verify --quiet refs/heads/revisionesclaude; then
    print_warning "La rama 'revisionesclaude' ya existe. ¿Deseas eliminarla? (s/n)"
    read -r response
    if [[ "$response" =~ ^[Ss]$ ]]; then
        git branch -D revisionesclaude
        print_success "Rama eliminada"
    else
        print_error "Operación cancelada"
        exit 1
    fi
fi

git checkout -b revisionesclaude
print_success "Nueva rama creada y activa: revisionesclaude"
echo ""

# Paso 3: Crear estructura de directorios
print_step "Paso 3: Creando estructura de directorios..."
mkdir -p server/middleware
mkdir -p server/services
mkdir -p server/config
mkdir -p docs/auditoria
mkdir -p scripts
print_success "Directorios creados"
echo ""

# Paso 4: Instalar dependencias
print_step "Paso 4: Instalando nuevas dependencias..."
print_warning "Esto instalará: zod, argon2, isomorphic-dompurify, node-cache"
npm install zod argon2 isomorphic-dompurify node-cache ioredis

print_warning "Instalando dependencias de desarrollo..."
npm install --save-dev @types/node-cache @typescript-eslint/parser @typescript-eslint/eslint-plugin eslint prettier
print_success "Dependencias instaladas"
echo ""

# Paso 5: Verificar archivos necesarios
print_step "Paso 5: Verificando archivos de mejoras..."
required_files=(
    "INFORME_AUDITORIA_SEGURIDAD_OPTIMIZACION.md"
    "CODIGO_CORREGIDO_VALIDACION.ts"
    "CODIGO_CORREGIDO_AUTENTICACION.ts"
    "CODIGO_CORREGIDO_SQL_SEGURO.ts"
)

missing_files=()
for file in "${required_files[@]}"; do
    if [ ! -f "$file" ]; then
        missing_files+=("$file")
    fi
done

if [ ${#missing_files[@]} -gt 0 ]; then
    print_error "Faltan los siguientes archivos:"
    for file in "${missing_files[@]}"; do
        echo "  - $file"
    done
    print_warning "Por favor, descarga estos archivos antes de continuar"
    exit 1
fi
print_success "Todos los archivos necesarios están presentes"
echo ""

# Paso 6: Mover archivos a sus ubicaciones
print_step "Paso 6: Moviendo archivos a sus ubicaciones..."

# Documentación
cp INFORME_AUDITORIA_SEGURIDAD_OPTIMIZACION.md docs/auditoria/
print_success "Informe de auditoría copiado"

# Middleware de validación
cp CODIGO_CORREGIDO_VALIDACION.ts server/middleware/validation.ts
print_success "Sistema de validación copiado"

# Servicio de autenticación
cp CODIGO_CORREGIDO_AUTENTICACION.ts server/services/authService.ts
print_success "Sistema de autenticación copiado"

# Consultas de base de datos
cp CODIGO_CORREGIDO_SQL_SEGURO.ts server/services/databaseQueries.ts
print_success "Consultas SQL seguras copiadas"

echo ""

# Paso 7: Crear archivo de configuración de entorno
print_step "Paso 7: Creando archivo de configuración de entorno..."
cat > server/config/env.ts << 'EOF'
import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default('3000'),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET debe tener al menos 32 caracteres'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET debe tener al menos 32 caracteres'),
  RESEND_API_KEY: z.string().optional(),
  STRIPE_SECRET_KEY: z.string().optional(),
  ADMIN_EMAIL: z.string().email(),
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),
  REDIS_URL: z.string().url().optional(),
});

function validateEnv() {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Error en variables de entorno:');
      error.errors.forEach(err => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`);
      });
      process.exit(1);
    }
    throw error;
  }
}

export const env = validateEnv();
EOF
print_success "Archivo de configuración creado"
echo ""

# Paso 8: Crear script para generar secretos
print_step "Paso 8: Creando script para generar secretos..."
cat > scripts/generate-secrets.ts << 'EOF'
import { randomBytes } from 'crypto';
import fs from 'fs';
import path from 'path';

function generateSecret(length: number = 32): string {
  return randomBytes(length).toString('base64');
}

function generateEnvFile() {
  const envContent = `# Generated secrets - ${new Date().toISOString()}

# JWT Secrets (generados automáticamente)
JWT_SECRET=${generateSecret(32)}
JWT_REFRESH_SECRET=${generateSecret(32)}

# Session Secret
SESSION_SECRET=${generateSecret(32)}

# Encryption Key
ENCRYPTION_KEY=${generateSecret(32)}

# ⚠️ IMPORTANTE: Completa manualmente las siguientes variables:

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/ecommerce

# Email
ADMIN_EMAIL=admin@tu-tienda.com
RESEND_API_KEY=

# Payment (opcional)
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# Frontend
FRONTEND_URL=http://localhost:5173

# Redis (opcional - para caché en producción)
# REDIS_URL=redis://localhost:6379

# Node Environment
NODE_ENV=development
PORT=3000
`;

  const envPath = path.join(process.cwd(), '.env');
  
  if (fs.existsSync(envPath)) {
    const backupPath = envPath + '.backup.' + Date.now();
    console.warn(`⚠️ El archivo .env ya existe. Creando backup: ${backupPath}`);
    fs.copyFileSync(envPath, backupPath);
  }
  
  fs.writeFileSync(envPath, envContent);
  console.log('✅ Archivo .env generado correctamente');
  console.log('📝 Completa manualmente las variables que faltan');
}

generateEnvFile();
EOF
print_success "Script de generación de secretos creado"
echo ""

# Paso 9: Actualizar .gitignore
print_step "Paso 9: Actualizando .gitignore..."
cat >> .gitignore << 'EOF'

# Security
.env
.env.local
.env.*.local
secrets/
*.key
*.pem
*.crt

# Logs
logs/
*.log

# Database
*.db-journal
*.sqlite-journal

# Backups
*.backup
*.backup.*
EOF
print_success ".gitignore actualizado"
echo ""

# Paso 10: Crear README de auditoría
print_step "Paso 10: Creando documentación de auditoría..."
cat > docs/auditoria/README.md << 'EOF'
# 🔒 Auditoría de Seguridad y Optimización

## Fecha de Auditoría
18 de Diciembre, 2025

## Archivos Implementados

### 1. Documentación
- `INFORME_AUDITORIA_SEGURIDAD_OPTIMIZACION.md` - Informe completo de auditoría

### 2. Código de Seguridad
- `server/middleware/validation.ts` - Sistema de validación con Zod
- `server/services/authService.ts` - Sistema de autenticación con Argon2
- `server/services/databaseQueries.ts` - Consultas SQL parametrizadas
- `server/config/env.ts` - Configuración de variables de entorno

### 3. Scripts
- `scripts/generate-secrets.ts` - Generador de secretos seguros

## Vulnerabilidades Críticas Identificadas

1. ⚠️ Inyección SQL
2. ⚠️ Contraseñas sin hash seguro
3. ⚠️ Secretos hardcodeados
4. ⚠️ Problema N+1 en queries
5. ⚠️ XSS (Cross-Site Scripting)
6. ⚠️ Falta de autorización
7. ⚠️ Sesiones inseguras
8. ⚠️ Validación insuficiente

## Plan de Implementación

### Fase 1: Seguridad Crítica (Semanas 1-2)
- [ ] Implementar validación con Zod en todas las rutas
- [ ] Parametrizar todas las queries SQL
- [ ] Configurar variables de entorno
- [ ] Implementar hash seguro de contraseñas

### Fase 2: Autenticación y Autorización (Semanas 3-4)
- [ ] Implementar JWT con refresh tokens
- [ ] Configurar cookies seguras
- [ ] Crear sistema de roles y permisos
- [ ] Desarrollar middleware de autorización

### Fase 3: Optimización (Semanas 5-6)
- [ ] Resolver problemas N+1
- [ ] Agregar índices a la base de datos
- [ ] Implementar sistema de caché
- [ ] Optimizar algoritmos ineficientes

### Fase 4: Refactorización (Semanas 7-8)
- [ ] Modularizar código
- [ ] Implementar manejo centralizado de errores
- [ ] Agregar tests unitarios
- [ ] Documentar APIs

## Próximos Pasos

1. Revisar el informe completo de auditoría
2. Ejecutar `npm run generate-secrets` para crear .env
3. Completar las variables de entorno faltantes
4. Comenzar implementación por fases
5. Ejecutar pruebas después de cada cambio

## Notas Importantes

- Todos los archivos contienen código de producción
- El código sigue las mejores prácticas de la industria
- Se incluyen comentarios explicativos en español
- Los ejemplos de uso están documentados

## Soporte

Para preguntas sobre la implementación, revisar:
- El informe principal de auditoría
- Los comentarios en cada archivo de código
- La documentación inline en TypeScript
EOF
print_success "README de auditoría creado"
echo ""

# Paso 11: Actualizar package.json con scripts
print_step "Paso 11: Actualizando package.json con scripts de seguridad..."

# Crear archivo temporal con los scripts
cat > /tmp/package_scripts.json << 'EOF'
{
  "lint": "eslint . --ext .ts,.tsx",
  "lint:fix": "eslint . --ext .ts,.tsx --fix",
  "format": "prettier --write \"**/*.{ts,tsx,json,md}\"",
  "type-check": "tsc --noEmit",
  "security:audit": "npm audit",
  "security:check": "npm audit --audit-level=moderate",
  "generate-secrets": "tsx scripts/generate-secrets.ts"
}
EOF

print_warning "Agrega manualmente estos scripts a package.json:"
cat /tmp/package_scripts.json
echo ""

# Paso 12: Hacer commits
print_step "Paso 12: Preparando commits..."

# Commit 1: Documentación
git add docs/auditoria/
git commit -m "docs: agregar auditoría completa de seguridad y optimización

- Informe detallado de vulnerabilidades críticas
- Identificadas 8 vulnerabilidades de seguridad
- Identificados 6 problemas de rendimiento
- Plan de implementación por fases
- Código de ejemplo para todas las mejoras"

# Commit 2: Dependencias
git add package.json package-lock.json
git commit -m "chore: instalar dependencias de seguridad y validación

Dependencias agregadas:
- zod: Validación de esquemas
- argon2: Hash seguro de contraseñas
- isomorphic-dompurify: Sanitización XSS
- node-cache: Sistema de caché
- ioredis: Cliente Redis para caché distribuido

Dev dependencies:
- @typescript-eslint/parser
- @typescript-eslint/eslint-plugin
- prettier
- @types/node-cache"

# Commit 3: Configuración
git add server/config/ .gitignore scripts/
git commit -m "feat: agregar configuración segura de entorno

- Validación de variables de entorno con Zod
- Script para generar secretos criptográficos
- Actualizar .gitignore para excluir archivos sensibles
- Configuración de JWT y base de datos"

# Commit 4: Validación
git add server/middleware/validation.ts
git commit -m "feat: implementar sistema de validación robusto

- Esquemas Zod para todos los endpoints
- Validación de body, query y params
- Sanitización anti-XSS con DOMPurify
- Middleware reutilizable
- Validadores personalizados para Ecuador

Previene:
- Inyección SQL
- XSS
- Datos malformados
- Overflow de buffers"

# Commit 5: Autenticación
git add server/services/authService.ts
git commit -m "feat: implementar sistema de autenticación seguro

Características:
- Hash Argon2id para contraseñas
- JWT con access y refresh tokens
- Gestión de sesiones con revocación
- Protección contra timing attacks
- Bloqueo después de intentos fallidos
- Reset de contraseña con tokens seguros
- Auditoría de eventos de autenticación

Seguridad:
- Cookies HTTP-only y Secure
- Tokens de corta duración (15min)
- Refresh tokens de 7 días
- Sesiones revocables
- Prevención de ataques de fuerza bruta"

# Commit 6: Consultas seguras
git add server/services/databaseQueries.ts
git commit -m "feat: implementar consultas SQL seguras y optimizadas

Mejoras de seguridad:
- Todas las queries parametrizadas
- Prevención de inyección SQL
- Validación de inputs

Mejoras de rendimiento:
- Resolución de problemas N+1
- Queries optimizadas con includes
- Paginación eficiente con cursor
- Agregaciones paralelas
- Sistema FIFO para inventario
- Índices sugeridos para Prisma

Funcionalidades:
- Búsqueda avanzada de productos
- Reportes de ventas e inventario
- Dashboard con métricas
- Importación masiva segura
- Actualización atómica con locks"

print_success "Todos los commits realizados"
echo ""

# Paso 13: Push a GitHub
print_step "Paso 13: Subiendo cambios a GitHub..."
print_warning "Ejecutando: git push origin revisionesclaude"

if git push origin revisionesclaude; then
    print_success "✅ Cambios subidos exitosamente a GitHub"
else
    print_error "Error al subir cambios. Por favor, verifica tus credenciales de GitHub"
    exit 1
fi

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                                                        ║${NC}"
echo -e "${GREEN}║  ✅ ¡Mejoras aplicadas exitosamente!                   ║${NC}"
echo -e "${GREEN}║                                                        ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}📊 Resumen:${NC}"
echo "  • Rama creada: revisionesclaude"
echo "  • Commits realizados: 6"
echo "  • Archivos agregados: 8"
echo "  • Dependencias instaladas: 9"
echo ""
echo -e "${BLUE}📝 Próximos pasos:${NC}"
echo "  1. Ejecutar: npm run generate-secrets"
echo "  2. Completar variables en .env"
echo "  3. Revisar: docs/auditoria/INFORME_AUDITORIA_SEGURIDAD_OPTIMIZACION.md"
echo "  4. Comenzar implementación por fases"
echo "  5. Crear Pull Request en GitHub"
echo ""
echo -e "${YELLOW}⚠️  Importante:${NC}"
echo "  • No olvides completar las variables de entorno en .env"
echo "  • Revisa el plan de implementación por fases"
echo "  • Ejecuta las pruebas después de cada cambio"
echo ""
print_success "Script completado. ¡Buena suerte con la implementación!"
