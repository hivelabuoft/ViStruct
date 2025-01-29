from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import eye_tracking

app = FastAPI()

# Enable CORS for frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins (Use a specific origin in production)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include the eye tracking router
app.include_router(eye_tracking.router)

@app.get("/")
def read_root():
    return {"message": "FastAPI is running"}



