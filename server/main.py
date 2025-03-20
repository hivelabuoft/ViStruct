from typing import Dict
from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from openCVdetectBar import detect_multiple_colors, detect_axes_and_title_with_legends, detect_legend_items
# from app.routers import eye_tracking
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
# app.include_router(eye_tracking.router)

@app.get("/")
def read_root():
    return {"message": "FastAPI is running"}

# the LLM/VLM system is fed with DVL-FW Typology by Katy Börner, whenever there is a chart, is breaksdown the typology to map the chart
# into 3 categories: Visualization Type, Graphic Symbols Used
# for example 100% stacked bar would be Chart, Area, Rectangular
# so if a chart that is chart, area, and rectangular, we put it with the below api

async def analyze_chart_surface_rectangular(file: UploadFile) -> Dict:
    contents = await file.read()
    np_arr = np.frombuffer(contents, np.uint8)
    image = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

    # 1. Detect bar segments by color
    colors = ['#cd7f32', '#bec36f', '#feb24c']
    color_result = detect_multiple_colors(image, "rectangular", colors, expected_count=4)

    # 2. Detect axes and title
    axes_title_result = detect_axes_and_title_with_legends(image)

    # 3. Detect legend items
    legend_items_result = detect_legend_items(image)

    # Combine all regions from the results
    combined_regions = []
    if "regions" in color_result:
        combined_regions.extend(color_result["regions"])
    if "regions" in axes_title_result:
        combined_regions.extend(axes_title_result["regions"])
    if "regions" in legend_items_result:
        combined_regions.extend(legend_items_result["regions"])

    return {
        "regions": combined_regions
    }

async def analyze_chart_line_line(file: UploadFile) -> Dict:
    return {"message": "Processed chart-line-line"}

async def analyze_chart_area_vary(file: UploadFile) -> Dict:
    return {"message": "Processed chart-area-vary"}

async def analyze_chart_point_circle(file: UploadFile) -> Dict:
    return {"message": "Processed chart-point-circle"}

async def analyze_map_area_vary(file: UploadFile) -> Dict:
    return {"message": "Processed map-area-vary"}

async def analyze_chart_area_circle(file: UploadFile) -> Dict:
    return {"message": "Processed chart-area-circle"}

async def analyze_chart_area_sector(file: UploadFile) -> Dict:
    return {"message": "Processed chart-area-sector"}



@app.post("/breakdown_image_for_chart_surface_rectangular")
async def endpoint_chart_surface_rectangular(file: UploadFile = File(...)):
    result = await analyze_chart_surface_rectangular(file)
    return result

@app.post("/breakdown_image_for_chart_line_line")
async def endpoint_chart_line_line(file: UploadFile = File(...)):
    result = await analyze_chart_line_line(file)
    return result

@app.post("/breakdown_image_for_chart_area_vary")
async def endpoint_chart_area_vary(file: UploadFile = File(...)):
    result = await analyze_chart_area_vary(file)
    return result

@app.post("/breakdown_image_for_chart_point_circle")
async def endpoint_chart_point_circle(file: UploadFile = File(...)):
    result = await analyze_chart_point_circle(file)
    return result

@app.post("/breakdown_image_for_map_area_vary")
async def endpoint_map_area_vary(file: UploadFile = File(...)):
    result = await analyze_map_area_vary(file)
    return result

@app.post("/breakdown_image_for_chart_area_circle")
async def endpoint_chart_area_circle(file: UploadFile = File(...)):
    result = await analyze_chart_area_circle(file)
    return result

@app.post("/breakdown_image_for_chart_area_sector")
async def endpoint_chart_area_sector(file: UploadFile = File(...)):
    result = await analyze_chart_area_sector(file)
    return result

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)



