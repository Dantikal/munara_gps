# АСКА

## Backend

```powershell
cd backend
..\venv\Scripts\python.exe -m pip install -r requirements.txt
```

По умолчанию backend использует SQLite: `backend/db.sqlite3`.

```powershell
..\venv\Scripts\python.exe manage.py makemigrations
..\venv\Scripts\python.exe manage.py migrate
..\venv\Scripts\python.exe manage.py createsuperuser
..\venv\Scripts\python.exe manage.py runserver
```

Для PostgreSQL создайте базу `munara`, задайте `USE_POSTGRES=1` и параметры подключения:

```powershell
Copy-Item .env.example .env
$env:USE_POSTGRES="1"
$env:POSTGRES_DB="munara"
$env:POSTGRES_USER="postgres"
$env:POSTGRES_PASSWORD="postgres"
$env:POSTGRES_HOST="localhost"
$env:POSTGRES_PORT="5432"
```

Для PostgreSQL база должна существовать заранее. Пример через `psql`:

```powershell
psql -U postgres -c "CREATE DATABASE munara WITH ENCODING 'UTF8';"
```

```powershell
..\venv\Scripts\python.exe manage.py makemigrations
..\venv\Scripts\python.exe manage.py migrate
..\venv\Scripts\python.exe manage.py createsuperuser
..\venv\Scripts\python.exe manage.py runserver
```

API будет доступен на `http://127.0.0.1:8000/api/`.

## Frontend

В PowerShell на Windows используйте `npm.cmd`, если выполнение `npm.ps1` запрещено политикой системы.

```powershell
cd frontend
npm.cmd install
npm.cmd run dev
```

Frontend будет доступен на `http://localhost:5173/`.

## Основные endpoints

- `POST /api/auth/register/` - регистрация заявки с `multipart/form-data`.
- `POST /api/auth/login/` - JWT-вход только для пользователей `active`.
- `GET /api/auth/me/` - текущий пользователь.
- `GET /api/auth/users/` - пользователи с фильтрацией по роли/области/заставе.
- `GET /api/auth/admin/requests/` - заявки `pending`, только администратор.
- `GET /api/auth/admin/requests/<id>/` - карточка заявки, только администратор.
- `POST /api/auth/admin/requests/<id>/moderate/` - `approve` или `reject`.
