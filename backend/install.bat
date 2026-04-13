@echo off
echo ============================================
echo   CivicImpact Backend - Windows Setup
echo ============================================
echo.

echo [1/4] Creating virtual environment...
python -m venv venv
echo.

echo [2/4] Activating virtual environment...
call venv\Scripts\activate.bat
echo.

echo [3/4] Upgrading pip...
python -m pip install --upgrade pip --quiet
echo.

echo [4/4] Installing all dependencies...
pip install -r requirements.txt
echo.

echo ============================================
echo   Setup complete!
echo   Now edit .env with your credentials
echo   Then run: python run.py
echo ============================================
pause
