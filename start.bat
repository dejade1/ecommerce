@echo off
echo ========================================
echo   INICIANDO PROYECTO E-COMMERCE
echo ========================================
echo.

echo [1/3] Verificando variables de entorno...
if not exist "backend\.env" (
    echo ERROR: No existe backend\.env
    echo Por favor, copia backend\.env.example a backend\.env
    echo y configura JWT_SECRET y JWT_REFRESH_SECRET
    pause
    exit /b 1
)

echo [2/3] Iniciando BACKEND en puerto 3000...
start "Backend Server" cmd /k "cd backend && npm run dev"

timeout /t 3 /nobreak > nul

echo [3/3] Iniciando FRONTEND en puerto 5173...
start "Frontend Vite" cmd /k "npm run dev"

timeout /t 2 /nobreak > nul

echo.
echo ========================================
echo   PROYECTO INICIADO CORRECTAMENTE
echo ========================================
echo.
echo Backend:  http://localhost:3000
echo Frontend: http://localhost:5173
echo.
echo Presiona Ctrl+C en cada ventana para detener los servidores
echo.

start http://localhost:5173

pause
