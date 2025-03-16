from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from cor import analyze_bar_chart
from app.routers import eye_tracking
import cv2
import numpy as np

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

@app.post("/breakdown_image")
async def analyze_image(file: UploadFile = File(...)):
    contents = await file.read()
    # 🔥 Decode bytes to NumPy array
    np_arr = np.frombuffer(contents, np.uint8)
    image = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

    # 🔥 Now pass NumPy array to your analysis function
    result = analyze_bar_chart(image, expected_bars=4)
    return result

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)



