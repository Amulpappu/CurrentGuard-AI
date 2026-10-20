@echo off
setlocal
title CurrentGuard AI - Deploy to Zoho Catalyst
cd /d "%~dp0"
echo ============================================================
echo   CurrentGuard AI - Deploy to Zoho Catalyst (AppSail)
echo ============================================================
echo.

where node >nul 2>nul || (echo [X] Node.js is not installed. Install it from https://nodejs.org and run again. & goto :fail)
where python >nul 2>nul || (echo [X] Python is not installed. Install it from https://python.org and run again. & goto :fail)

where catalyst >nul 2>nul
if errorlevel 1 (
  echo [1/6] Installing Zoho Catalyst CLI...
  call npm install -g zcatalyst-cli || goto :fail
) else (
  echo [1/6] Catalyst CLI found.
)

echo [2/6] Building the React dashboard...
pushd frontend
call npm install --silent || (popd & goto :fail)
call npm run build || (popd & goto :fail)
popd

echo [3/6] Preparing the deploy folder...
if exist catalyst_build rmdir /s /q catalyst_build
mkdir catalyst_build
xcopy backend\app catalyst_build\app /E /I /Y /Q >nul || goto :fail
copy /Y backend\run.py catalyst_build\ >nul || goto :fail
xcopy frontend\dist catalyst_build\static /E /I /Y /Q >nul || goto :fail
for /d /r catalyst_build %%d in (__pycache__) do if exist "%%d" rmdir /s /q "%%d"

echo [4/6] Downloading Linux Python packages for Catalyst (Python 3.11)...
python -m pip install -r backend\requirements-deploy.txt --platform manylinux2014_x86_64 --python-version 3.11 --implementation cp --only-binary=:all: --target catalyst_build --upgrade --quiet --disable-pip-version-check || goto :fail

echo [5/6] Checking your Zoho login and project...
if not exist .catalystrc (
  echo     A browser window will open. Sign in with your Zoho account.
  call catalyst login || goto :fail
)
if not exist .catalystrc (
  echo     Pick your Catalyst project from the list:
  call catalyst project:use || goto :fail
)

echo [6/6] Deploying to Catalyst...
call catalyst deploy appsail || goto :fail

echo.
echo ============================================================
echo   Done! Copy the AppSail URL shown above - that is your
echo   live CurrentGuard AI link.
echo ============================================================
pause
exit /b 0

:fail
echo.
echo [X] Deploy stopped because of the error above.
echo     Take a screenshot of this window and send it for help.
pause
exit /b 1
