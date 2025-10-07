# IT Tracker Application

A Next.js application with WebSocket support for real-time issue tracking.

## Prerequisites

- Docker
- Docker Compose

## Quick Start

### Local Development

1. **Clone the repository:**
   ```bash
   git clone https://github.com/chaiwatkang007/ittackerv1.git
   cd ittackerv1
   ```

2. **Run the application:**
   ```bash
   docker-compose up --build
   ```

3. **Wait for the build to complete** (this may take 5-10 minutes on first run)

4. **Access the application:**
   - Web App: http://localhost:3000
   - Database: port 5432

### Play with Docker (PWD)

1. **Go to [Play with Docker](https://labs.play-with-docker.com/)**

2. **Start a new session** Add New Instance
   <img width="1919" height="952" alt="image" src="https://github.com/user-attachments/assets/f914b372-9daf-49c3-8b68-548f2b6fc6de" />


4. git clone https://github.com/chaiwatkang007/ittackerv1.git
   <img width="671" height="196" alt="image" src="https://github.com/user-attachments/assets/4be2cbed-b7aa-428b-ade6-bf65aee7a52e" />
   
   cd ittackerv1

6. **Run Docker compose:**
   ```bash
   docker-compose up --build
   ```

7. **Access the application** using the provided URL
   <img width="1599" height="952" alt="image" src="https://github.com/user-attachments/assets/53df0a9e-4e3d-4043-a12b-998880c9cf54" />
   click port 3000
   <img width="1919" height="945" alt="image" src="https://github.com/user-attachments/assets/b14dce0d-2ce9-49c4-8ffa-ad5201a2904b" />


# How to Register
1.if Sing up on Web application role = user   
2.create via /api/auth/register can fix role user support admin
# Login
Login via Web App with username & password

Login via API
POST /api/auth/login
{
  "username": "admin",
  "password": "admin"
}

# 📡 WebSocket Connection Test
Login to the web app

Press F12 → open Console

Type:
```bash
console.log("Socket Connected:", window.socket?.connected);
```
If you see true, WebSocket is connected successfully.
<img width="1919" height="950" alt="image" src="https://github.com/user-attachments/assets/61ec7433-7f87-4ec9-b2a3-e3cb684f9e96" />


# Example Webhook Logs
   <img width="250" height="132" alt="image" src="https://github.com/user-attachments/assets/ba5efec4-09d4-4c67-acc5-1f73f5f24055" />
   
   <img width="226" height="136" alt="image" src="https://github.com/user-attachments/assets/3f876381-459b-4107-8094-99691d7f6022" />


# Postman Collection
1.POST /api/auth/register
   Body (JSON)
   {
     "username": "admin",
     "password": "admin",
     "role": "admin"
   }

2.POST /api/auth/login
   Body (JSON)
   {
     "username": "admin",
     "password": "admin"
   }

3.GET /api/users – Admin only. Requires logging in via API to obtain a token and using Bearer authentication.

4.GET /api/issues/iss – Admin only. Requires logging in via API to obtain a token and using Bearer authentication.
