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
echo [3/4] Upgrading pip and removing old packages...
python -m pip install --upgrade pip
pip uninstall motor pymongo beanie pydantic pydantic-settings fastapi -y 2>nul
echo.
echo [4/4] Installing all dependencies...
pip install -r requirements.txt
echo.
echo ============================================
echo   Starting server on http://localhost:8000
echo   API Docs: http://localhost:8000/docs
echo ============================================
python run.py
