from fastapi import FastAPI
from app.routers import eye_tracking

app = FastAPI()

# Include the eye tracking router
app.include_router(eye_tracking.router)

@app.get("/")
def read_root():
    return {"message": "FastAPI is running"}
