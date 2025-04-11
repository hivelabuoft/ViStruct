from typing import Dict
from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from openCVdetectBar import detect_title, detect_multiple_colors, detect_axes_and_title_with_legends, detect_legend_items
# from app.routers import eye_tracking
from openCVdetectComponent import detect_treemap_labels, detect_chart_title, detect_multiple_colors_tree
from openCVdetectDots import detect_scatterplot_dots, detect_colored_bubbles, detect_bubble_labels, detect_bubble_legend_items
import cv2
import numpy as np
from openCVmapContinous import extract_specific_axis_labels, find_intersection_bounding_boxes, extract_axis_labels_advanced
from openCVdetectShape import detect_pie_slices
from openCVmapIrregular import detect_legend_colors,detect_stacked_boundaries, detect_abbreviations
from typing import Dict, List, Tuple, Optional

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
# for example 100% stacked bar would be Chart, Surface, Rectangular
# so if a chart that is chart, area, and rectangular, we put it with the below api

async def analyze_100_stacked_bar_chart(file: UploadFile) -> Dict:
    contents = await file.read()
    np_arr = np.frombuffer(contents, np.uint8)
    image = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

    # 1. Detect area segments by color
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

async def analyze_bar_chart(file: UploadFile) -> Dict:
    contents = await file.read()
    np_arr = np.frombuffer(contents, np.uint8)
    image = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

    # 1. Detect bar segments by color
    colors = ['#3182bd']
    color_result = detect_multiple_colors(image, "rectangular", colors, expected_count=14)

    # 2. Detect axes and title
    axes_title_result = detect_axes_and_title_with_legends(image)

    # 3. Detect legend items
    # legend_items_result = detect_legend_items(image)

    # Combine all regions from the results
    combined_regions = []
    if "regions" in color_result:
        combined_regions.extend(color_result["regions"])
    if "regions" in axes_title_result:
        combined_regions.extend(axes_title_result["regions"])
    return {
        "regions": combined_regions
    }

async def analyze_stacked_bar_chart(file: UploadFile) -> Dict:
    contents = await file.read()
    np_arr = np.frombuffer(contents, np.uint8)
    image = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

    # 1. Detect bar segments by color
    colors = ['#386cb0', '#fb9a99', '#fdc086', '#beaed4', '#7fc97f']
    color_result = detect_multiple_colors(image, "rectangular", colors, expected_count=11)

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

async def analyze_scatter_plot(file: UploadFile) -> Dict:
    contents = await file.read()
    np_arr = np.frombuffer(contents, np.uint8)
    image = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

    # 1. Detect bar segments by color
    colors = ['#3182bd']
    color_result = detect_scatterplot_dots(image, colors)

    # 2. Detect axes and title
    axes_title_result = detect_axes_and_title_with_legends(image)


    # Combine all regions from the results
    combined_regions = []
    if "regions" in color_result:
        combined_regions.extend(color_result["regions"])
    if "regions" in axes_title_result:
        combined_regions.extend(axes_title_result["regions"])
    return {
        "regions": combined_regions
    }

async def analyze_bubble_chart(file: UploadFile) -> Dict:
    contents = await file.read()
    np_arr = np.frombuffer(contents, np.uint8)
    image = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

    # 1. Detect bar segments by color
    colors = '#6ea7d1'
    color_result = detect_colored_bubbles(image, colors, expected_count=1)
    # bubble_labels_result = detect_bubble_labels(image, color_result["regions"])
    # 2. Detect axes and title
    # axes_title_result = detect_axes_and_title_with_legends(image)
    axes_title_result = extract_axis_labels_advanced(image)

    # 3. Detect legend items
    legend_items_result = detect_bubble_legend_items(image, 3)

    # Combine all regions from the results
    combined_regions = []
    if "regions" in color_result:
        combined_regions.extend(color_result["regions"])
        # combined_regions.extend(bubble_labels_result["regions"])
    # if "regions" in axes_title_result:
    combined_regions.extend(axes_title_result)
    if "regions" in legend_items_result:
        combined_regions.extend(legend_items_result["regions"])
    return {
        "regions": combined_regions
    }

async def analyze_line_chart(file: UploadFile) -> Dict:
    contents = await file.read()
    np_arr = np.frombuffer(contents, np.uint8)
    image = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

    combined_regions = extract_specific_axis_labels(image)

    middle_x = get_x_axis_tick_centers(combined_regions)

    intersection_regions = find_intersection_bounding_boxes(image, middle_x)

    return {
        "regions": combined_regions + intersection_regions
    }
    

async def analyze_histogram(file: UploadFile) -> Dict:
    contents = await file.read()
    np_arr = np.frombuffer(contents, np.uint8)
    image = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

    # 1. Detect bar segments by color
    colors = ['#3182bd']
    color_result = detect_multiple_colors(image, "rectangular", colors, expected_count=11)

    # 2. Detect axes and title
    axes_title_result = detect_axes_and_title_with_legends(image)

    # 3. Detect legend items
    # legend_items_result = detect_legend_items(image)

    # Combine all regions from the results
    combined_regions = []
    if "regions" in color_result:
        combined_regions.extend(color_result["regions"])
    if "regions" in axes_title_result:
        combined_regions.extend(axes_title_result["regions"])
    return {
        "regions": combined_regions
    }

async def analyze_area_chart(file: UploadFile) -> Dict:
    contents = await file.read()
    np_arr = np.frombuffer(contents, np.uint8)
    image = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

    combined_regions = extract_specific_axis_labels(image)

    middle_x = get_x_axis_tick_centers(combined_regions)

    intersection_regions = find_intersection_bounding_boxes(image, middle_x)

    return {
        "regions": combined_regions + intersection_regions
    }

def get_x_axis_tick_centers(regions: List[Dict]) -> List[int]:

    centers = []
    for region in regions:
        if region.get("label") == "x_axis_tick":
            rect = region.get("rectangular", {})
            xmin = rect.get("xmin", 0)
            xmax = rect.get("xmax", 0)
            center_x = (xmin + xmax) / 2
            centers.append(int(center_x))
    return centers



async def analyze_stacked_area_chart(file: UploadFile) -> Dict:
    contents = await file.read()
    np_arr = np.frombuffer(contents, np.uint8)
    image = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
    H, W, _ = image.shape
    
    # Define the areas:
    # Axis detection: left 80% of the image.
    axis_area = image[:, :int(0.8 * W)]
    # Legend detection: right 20% of the image.
    legend_area = image[:, int(0.8 * W):]
    
    # 1) Process the axis area (ensuring that the right 20% is NOT considered).
    axis_regions = extract_specific_axis_labels(axis_area)

    target_colors = ["#3282bd", "#9ecae1", "#deebf7"] 
    
    # legend_regions = detect_legend_colors(image, target_colors, x_extend=80, color_tol=20)
    

    middle_x = get_x_axis_tick_centers(axis_regions)
    for x in middle_x:
        axis_regions.extend(detect_stacked_boundaries(image, x, target_colors, tolerance=30, white_thresh=240, box_offset=20))


    # intersection_regions = find_intersection_bounding_boxes(image, middle_x)

    return {
        "regions": axis_regions
    }

async def analyze_pie_chart(file: UploadFile) -> Dict:
    contents = await file.read()
    np_arr = np.frombuffer(contents, np.uint8)
    image = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

    # 1. Detect bar segments by color
    colors = ['#9e97c8', '#5295c4', '#f47562', '#fec981', '#a9daaa', '#ffffc9']
    color_result = detect_pie_slices(image, colors, expected_count=6)

    # 2. Detect axes and title
    axes_title_result = detect_title(image)

    # 3. Detect legend items
    # legend_items_result = detect_legend_items(image)

    # Combine all regions from the results
    combined_regions = []
    if "regions" in color_result:
        combined_regions.extend(color_result["regions"])
    if "regions" in axes_title_result:
        combined_regions.extend(axes_title_result["regions"])
    # if "regions" in legend_items_result:
    #     combined_regions.extend(legend_items_result["regions"])
    return {
        "regions": combined_regions
    }

async def analyze_map(file: UploadFile) -> Dict:
    contents = await file.read()
    np_arr = np.frombuffer(contents, np.uint8)
    image = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

    regions = detect_abbreviations(image)

    return {
        "regions": regions
    }

async def analyze_treemap(file) -> Dict:
    # Read the file contents and decode the image
    contents = await file.read()
    np_arr = np.frombuffer(contents, np.uint8)
    image = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
    
    # Define parameters for the treemap detection
    colors = ['#a5d9a5', '#fed3aa', '#fcb8b7', '#d1c6e1', '#7398c8']
    expected = [4, 5, 5, 4, 3]
    
    # Detect treemap segments based on color
    segments_result = detect_multiple_colors_tree(image, "rectangular", colors, expected)
    segment_regions = segments_result.get("regions", [])
    
    # Detect labels for each region
    labels_result = detect_treemap_labels(image, segment_regions, label_height=30)
    label_regions = labels_result.get("labels", [])
    
    # Detect the title of the chart
    title_region = detect_chart_title(image)
    
    # Combine all regions together
    combined_regions = []
    combined_regions.extend(segment_regions)
    combined_regions.extend(label_regions)
    combined_regions.append(title_region)
    
    return {
        "regions": combined_regions
    }


@app.post("/analyze/100_stacked_bar_chart")
async def endpoint_chart_surface_rectangular(file: UploadFile = File(...)):
    result = await analyze_100_stacked_bar_chart(file)
    return result

@app.post("/analyze/line_chart")
async def endpoint_chart_line_line(file: UploadFile = File(...)):
    result = await analyze_line_chart(file)
    return result

@app.post("/analyze/area_chart")
async def endpoint_chart_area_vary(file: UploadFile = File(...)):
    result = await analyze_area_chart(file)
    return result

@app.post("/analyze/scatter_plot")
async def endpoint_chart_point_circle(file: UploadFile = File(...)):
    result = await analyze_scatter_plot(file)
    return result

@app.post("/analyze/bubble_chart")
async def endpoint_chart_point_circle(file: UploadFile = File(...)):
    result = await analyze_bubble_chart(file)
    return result

@app.post("/analyze/bar_chart")
async def endpoint_chart_rectangular_rectangular(file: UploadFile = File(...)):
    result = await analyze_bar_chart(file)
    return result

@app.post("/analyze/stacked_bar_chart")
async def endpoint_chart_rectangular_rectangular(file: UploadFile = File(...)):
    result = await analyze_stacked_bar_chart(file)
    return result

@app.post("/analyze/histogram")
async def endpoint_chart_rectangular_rectangular(file: UploadFile = File(...)):
    result = await analyze_histogram(file)
    return result

@app.post("/analyze/stacked_area_chart")
async def endpoint_chart_rectangular_rectangular(file: UploadFile = File(...)):
    result = await analyze_stacked_area_chart(file)
    return result

@app.post("/analyze/pie_chart")
async def endpoint_chart_rectangular_rectangular(file: UploadFile = File(...)):
    result = await analyze_pie_chart(file)
    return result

@app.post("/analyze/map")
async def endpoint_chart_rectangular_rectangular(file: UploadFile = File(...)):
    result = await analyze_map(file)
    return result

@app.post("/analyze/treemap")
async def endpoint_chart_rectangular_rectangular(file: UploadFile = File(...)):
    result = await analyze_treemap(file)
    return result

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)



