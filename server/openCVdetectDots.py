import cv2
import numpy as np
import math

def detect_scatterplot_dots(image: np.ndarray, color_list, min_area=10, max_area=200, offsetX=0):
    """
    Detects small colored dots in a scatterplot based on a list of target color hex codes.

    Parameters:
      - image: Input image as a NumPy array (BGR format).
      - color_list: List of color hex strings (e.g., ['#ff0000', '#00ff00', '#0000ff']).
      - min_area: Minimum contour area to be considered a dot.
      - max_area: Maximum contour area to be considered a dot.
      - offsetX: Offset to add to the x coordinates (if needed).

    Returns:
      A dictionary with a "regions" key containing a list of detected regions in JSON format.
    """
    regions = []
    color_tolerance = 30  # Adjust tolerance as needed

    # Process each target color from the list
    for color_hex in color_list:
        # Convert hex to BGR (cv2 uses BGR format)
        target_rgb = tuple(int(color_hex[i:i+2], 16) for i in (1, 3, 5))
        target_bgr = target_rgb[::-1]  # reverse RGB to BGR

        # Define lower and upper bounds for color thresholding
        lower_bound = np.array([max(0, c - color_tolerance) for c in target_bgr], dtype=np.uint8)
        upper_bound = np.array([min(255, c + color_tolerance) for c in target_bgr], dtype=np.uint8)

        # Create a mask for the target color
        mask = cv2.inRange(image, lower_bound, upper_bound)
        
        # Optional: clean up noise with a morphological opening
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
        mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel, iterations=1)
        
        # Find contours from the mask
        contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        # Iterate over contours and filter by area (to find small dots)
        for cnt in contours:
            area = cv2.contourArea(cnt)
            if area < min_area or area > max_area:
                continue
            x, y, w, h = cv2.boundingRect(cnt)
            region = {
                "label": "series-legend-item",
                "rectangular": {
                    "xmin": int(x + offsetX),
                    "ymin": int(y),
                    "xmax": int(x + w + offsetX),
                    "ymax": int(y + h)
                },
                "color": color_hex
            }
            regions.append(region)

    return {"regions": regions}

# Example usage:
# image = cv2.imread("scatterplot.png")
# colors = ['#ff0000', '#00ff00', '#0000ff']  # Example: red, green, blue
# result = detect_scatterplot_dots(image, colors)
# print(result)
def detect_colored_bubbles(image: np.ndarray, target_hex: str, expected_count=None,
                             color_tolerance=30, circularity_thresh=0.7, min_area=1):
    """
    Detect bubbles of a specific color in a bubble chart.
    
    Parameters:
      - image: Input image in BGR format as a NumPy array.
      - target_hex: The target bubble color in hex (e.g., '#ff0000').
      - expected_count: Expected number of bubbles (optional).
      - color_tolerance: Tolerance value for color thresholding.
      - circularity_thresh: Minimum circularity (1.0 is a perfect circle) to consider a contour a bubble.
      - min_area: Minimum area to filter out noise.
    
    Returns:
      A dictionary with:
         - "regions": A list of detected bubble regions in JSON format.
         - "detected_count": Number of bubbles detected.
         - "expected_count": The provided expected count.
         - "match": Boolean indicating if detected_count equals expected_count (if provided).
    """
    # Convert the target hex color to BGR
    target_rgb = tuple(int(target_hex[i:i+2], 16) for i in (1, 3, 5))
    target_bgr = target_rgb[::-1]  # OpenCV uses BGR ordering
    
    # Define lower and upper bounds for the target color
    lower_bound = np.array([max(0, c - color_tolerance) for c in target_bgr], dtype=np.uint8)
    upper_bound = np.array([min(255, c + color_tolerance) for c in target_bgr], dtype=np.uint8)
    
    # Create a mask that isolates the target color regions
    mask = cv2.inRange(image, lower_bound, upper_bound)
    
    # Clean up noise with a morphological opening
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel, iterations=2)
    
    # Find contours from the mask
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    regions = []
    
    for cnt in contours:
        area = cv2.contourArea(cnt)
        if area < min_area:
            continue  # Filter out very small regions
        
        perimeter = cv2.arcLength(cnt, True)
        if perimeter == 0:
            continue
        # Compute circularity: 4π * (Area / Perimeter²)
        circularity = 4 * math.pi * area / (perimeter ** 2)
        if circularity < circularity_thresh:
            continue  # Skip contours that are not circular enough
        
        # Compute a bounding box around the bubble
        x, y, w, h = cv2.boundingRect(cnt)
        region = {
            "label": "bubble",
            "rectangular": {
                "xmin": int(x),
                "ymin": int(y),
                "xmax": int(x + w),
                "ymax": int(y + h)
            },
            "color": target_hex
        }
        regions.append(region)
    
    return {
         "regions": regions,
         "detected_count": len(regions),
         "expected_count": expected_count,
         "match": (expected_count is None or len(regions) == expected_count)
    }

    
def detect_text_boxes(image: np.ndarray):
    """
    Detect potential text regions in an image using adaptive thresholding and contour detection.
    Returns a list of bounding boxes (x, y, width, height) for candidate text areas.
    """
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    thresh = cv2.adaptiveThreshold(
        gray, 255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY_INV,
        15, 4
    )
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
    closed = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel, iterations=1)
    contours, _ = cv2.findContours(closed, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    boxes = []
    for cnt in contours:
        x, y, w, h = cv2.boundingRect(cnt)
        if w < 5 or h < 5:
            continue
        boxes.append((x, y, w, h))
    return boxes


def detect_bubble_labels(image: np.ndarray, bubbles: list, y_tolerance=30, x_margin=5, roi_width=100):
    """
    For each detected bubble, identify the nearest text region on its right side as the bubble label.
    
    Strategy:
      1. Use the globally detected text boxes (via detect_text_boxes) to find a candidate that is:
         - To the right of the bubble (with a margin).
         - Vertically aligned with the bubble center (within y_tolerance).
      2. If no candidate is found, crop a local ROI immediately to the right of the bubble and
         run text detection there.
    
    Parameters:
      - image: Input image as a NumPy array (BGR format).
      - bubbles: List of bubble regions (each a dictionary with key "rectangular") from the bubble detection.
      - y_tolerance: Maximum vertical difference allowed between the bubble center and text box center.
      - x_margin: Minimum horizontal gap between bubble and text.
      - roi_width: Width of the ROI to search for text if no candidate is found globally.
    
    Returns:
      A dictionary with a "regions" key containing a list of bubble label regions in JSON format.
    """
    # First, detect text boxes globally.
    global_text_boxes = detect_text_boxes(image)
    labels = []
    height, width = image.shape[:2]
    
    for bubble in bubbles:
         bxmin = bubble["rectangular"]["xmin"]
         bxmax = bubble["rectangular"]["xmax"]
         bymin = bubble["rectangular"]["ymin"]
         bymax = bubble["rectangular"]["ymax"]
         bubble_center_y = (bymin + bymax) / 2
         
         candidate = None
         min_dx = float('inf')
         
         # Global search: find candidate text boxes to the right of the bubble.
         for (tx, ty, tw, th) in global_text_boxes:
             if tx > bxmax + x_margin:
                 text_center_y = ty + th / 2
                 if abs(text_center_y - bubble_center_y) <= y_tolerance:
                     dx = tx - bxmax
                     if dx < min_dx:
                         min_dx = dx
                         candidate = (tx, ty, tw, th)
         
         # Fallback: if no candidate found globally, perform a local search.
         if candidate is None:
             roi_x1 = bxmax + x_margin
             roi_x2 = min(width, roi_x1 + roi_width)
             roi_y1 = max(0, bymin - y_tolerance)
             roi_y2 = min(height, bymax + y_tolerance)
             roi = image[roi_y1:roi_y2, roi_x1:roi_x2]
             
             local_text_boxes = detect_text_boxes(roi)
             for (tx, ty, tw, th) in local_text_boxes:
                 abs_tx = tx + roi_x1
                 abs_ty = ty + roi_y1
                 text_center_y = abs_ty + th / 2
                 if abs(text_center_y - bubble_center_y) <= y_tolerance:
                     dx = abs_tx - bxmax
                     if dx < min_dx:
                         min_dx = dx
                         candidate = (abs_tx, abs_ty, tw, th)
         
         # If a candidate label is found, add it to the results.
         if candidate:
             tx, ty, tw, th = candidate
             label_region = {
                 "label": "bubble-label",
                 "rectangular": {
                     "xmin": int(tx),
                     "ymin": int(ty),
                     "xmax": int(tx + tw),
                     "ymax": int(ty + th)
                 },
                 "color": "#000000"
             }
             labels.append(label_region)
             
    return {"regions": labels}


def detect_bubble_legend_items(image: np.ndarray, expected_count: int):
    """
    Detects legend items in a bubble chart where the legends are located in the
    top-right corner of the chart. Legend items are assumed to have black borders,
    and an expected number of legend items is provided.

    Parameters:
      - image: Input image as a NumPy array (BGR format).
      - expected_count: The expected number of legend items.

    Returns:
      A dictionary containing:
         - "regions": A list of legend item regions (in JSON format).
         - "detected_count": The number of legend items found.
         - "expected_count": The provided expected count.
         - "match": True if detected_count equals expected_count.
    """
    height, width = image.shape[:2]
    # Define the top-right region for legends.
    offsetX = int(width * 0.7)
    legend_region = image[0:int(height * 0.3), offsetX:width]
    
    # Convert the legend region to grayscale.
    gray = cv2.cvtColor(legend_region, cv2.COLOR_BGR2GRAY)
    
    # Apply a binary inverse threshold to detect dark (black) regions.
    # Pixels below 50 (dark) become white (foreground) after inversion.
    ret, thresh = cv2.threshold(gray, 50, 255, cv2.THRESH_BINARY_INV)
    
    # Use a morphological closing to fill gaps in the black borders.
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
    closed = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel, iterations=1)
    
    # Find contours in the processed image.
    contours, _ = cv2.findContours(closed, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    boxes = []
    for cnt in contours:
        x, y, w, h = cv2.boundingRect(cnt)
        # Filter out very small contours (noise).
        if w < 10 or h < 10:
            continue
        boxes.append((x, y, w, h))
    
    # Sort boxes by area (largest first).
    boxes = sorted(boxes, key=lambda b: b[2] * b[3], reverse=True)
    
    # If more boxes than expected are found, choose the top ones.
    if expected_count is not None and len(boxes) > expected_count:
        boxes = boxes[:expected_count]
    
    legend_items = []
    for (x, y, w, h) in boxes:
        item = {
            "label": "series-legend-item",
            "rectangular": {
                "xmin": int(x + offsetX),
                "ymin": int(y),
                "xmax": int(x + w + offsetX),
                "ymax": int(y + h)
            },
            "color": "#000000"  # Black border
        }
        legend_items.append(item)
    
    return {
        "regions": legend_items,
        "detected_count": len(legend_items),
        "expected_count": expected_count,
        "match": (len(legend_items) == expected_count)
    }