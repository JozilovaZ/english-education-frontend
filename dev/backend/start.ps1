# Lokal backendni ishga tushiradi: Redis, Django (8000) va Celery worker — har biri alohida oynada.
# Ishlatish (frontend papkasidan):  powershell -ExecutionPolicy Bypass -File dev\backend\start.ps1

$backend = Resolve-Path (Join-Path $PSScriptRoot '..\..\..\english-education')
$python = Join-Path $backend '.venv\Scripts\python.exe'
$celery = Join-Path $backend '.venv\Scripts\celery.exe'
$redis = Join-Path $env:LOCALAPPDATA 'Programs\Redis\redis-server.exe'

foreach ($path in @($python, $redis)) {
    if (-not (Test-Path $path)) {
        Write-Error "Topilmadi: $path (dev\backend\README.md dagi o'rnatish bosqichlarini bajaring)"
        exit 1
    }
}

if (-not (Get-Process redis-server -ErrorAction SilentlyContinue)) {
    Start-Process $redis -ArgumentList '--port', '6379', '--bind', '127.0.0.1', '--save', '""', '--appendonly', 'no' -WindowStyle Minimized
    Write-Host 'Redis ishga tushdi (6379)'
} else {
    Write-Host 'Redis allaqachon ishlayapti'
}

Start-Process powershell -WorkingDirectory $backend -ArgumentList '-NoExit', '-Command', "& '$python' manage.py runserver 127.0.0.1:8000"
Start-Process powershell -WorkingDirectory $backend -ArgumentList '-NoExit', '-Command', "& '$celery' -A core worker -l info --pool=solo"

Write-Host 'Django: http://127.0.0.1:8000  (Swagger: http://localhost:8000/api/docs/)'
Write-Host 'Frontend uchun alohida: npm run dev  ->  http://niners.localhost:5173'
