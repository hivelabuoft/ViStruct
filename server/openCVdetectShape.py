import cv2
import numpy as np
import math

def largestRectangleArea(heights):
    """
    Helper function that computes the largest rectangle in a histogram.
    Returns a tuple: (max_area, (start_index, end_index, height, width)).
    """
    stack = []
    max_area = 0
    best = (0, 0, 0, 0)  # (start_index, end_index, height, width)
    extended = list(heights) + [0]
    for i, h in enumerate(extended):
        while stack and extended[stack[-1]] > h:
            height = extended[stack.pop()]
            width = i if not stack else i - stack[-1] - 1
            area = height * width
            if area > max_area:
                max_area = area
                start_index = stack[-1] + 1 if stack else 0
                best = (start_index, i - 1, height, width)
        stack.append(i)
    return max_area, best

def largest_rectangle_in_binary_mask(binary_mask):
    """
    Computes the largest axis-aligned rectangle of ones within a binary mask.
    Returns (left, top, width, height).
    """
    rows, cols = binary_mask.shape
    dp = [0] * cols
    max_area = 0
    best_rect = (0, 0, 0, 0)  # (left, top, width, height)
    
    for i in range(rows):
        for j in range(cols):
            dp[j] = dp[j] + 1 if binary_mask[i, j] == 1 else 0
        
        area, (start, end, height_rect, width_rect) = largestRectangleArea(dp)
        if area > max_area:
            max_area = area
            top = i - height_rect + 1
            left = start
            best_rect = (left, top, width_rect, height_rect)
    return best_rect

def detect_pie_slice_largest_rectangle(image: np.ndarray, target_hex: str, color_tolerance=30):
    """
    Detects a pie chart slice defined by a specific target color and computes the largest 
    inscribed axis-aligned rectangle within that slice.
    
    Parameters:
      - image: Input image (BGR format) as a NumPy array.
      - target_hex: The target slice color as a hex string (e.g., '#ff0000').
      - color_tolerance: Tolerance for color thresholding.
    
    Returns:
      A dictionary with keys:
         "label": "pie-slice",
         "rectangular": {"xmin": int, "ymin": int, "xmax": int, "ymax": int},
         "color": target_hex
      If no valid slice is found, returns a dictionary with an "error" key.
    """
    # Convert target hex to BGR (OpenCV uses BGR)
    target_rgb = tuple(int(target_hex[i:i+2], 16) for i in (1, 3, 5))
    target_bgr = target_rgb[::-1]
    
    lower_bound = np.array([max(0, c - color_tolerance) for c in target_bgr], dtype=np.uint8)
    upper_bound = np.array([min(255, c + color_tolerance) for c in target_bgr], dtype=np.uint8)
    
    # Create a mask isolating the target slice.
    mask = cv2.inRange(image, lower_bound, upper_bound)
    
    # Find contours in the mask; assume the largest one is the desired slice.
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
        return {"label": "pie-slice", "error": "No slice found for color {}".format(target_hex)}
    
    largest_contour = max(contours, key=cv2.contourArea)
    
    # Create a filled binary mask for the detected slice.
    filled_mask = np.zeros_like(mask)
    cv2.drawContours(filled_mask, [largest_contour], -1, 255, thickness=-1)
    
    # Convert to binary (1's and 0's).
    binary_mask = (filled_mask == 255).astype(np.uint8)
    
    # Compute the largest inscribed rectangle in the binary mask.
    left, top, rect_width, rect_height = largest_rectangle_in_binary_mask(binary_mask)
    
    return {
        "label": "pie-slice",
        "rectangular": {
            "xmin": int(left),
            "ymin": int(top),
            "xmax": int(left + rect_width),
            "ymax": int(top + rect_height)
        },
        "color": target_hex
    }

def detect_pie_slices(image: np.ndarray, color_list: list, expected_count: int, color_tolerance=30):
    """
    Detects pie slices given a list of target colors and an expected number of slices.
    For each target color, the function computes the largest inscribed rectangle within 
    the corresponding pie slice.
    
    Parameters:
      - image: Input image (BGR format) as a NumPy array.
      - color_list: List of target slice colors as hex strings (e.g., ['#ff0000', '#00ff00']).
      - expected_count: The expected number of pie slices.
      - color_tolerance: Tolerance value for color thresholding.
    
    Returns:
      A dictionary containing:
         "regions": List of detected pie slice regions (each in JSON format).
         "detected_count": Number of slices detected.
         "expected_count": The provided expected number.
         "match": True if detected_count equals expected_count.
    """
    regions = []
    for target_hex in color_list:
        result = detect_pie_slice_largest_rectangle(image, target_hex, color_tolerance=color_tolerance)
        if "error" not in result:
            regions.append(result)
    detected_count = len(regions)
    return {
        "regions": regions,
        "detected_count": detected_count,
        "expected_count": expected_count,
        "match": (detected_count == expected_count)
    }

# Example usage:
# image = cv2.imread("pie_chart.png")
# colors = ['#ff0000', '#00ff00', '#0000ff']  # List of expected slice colors.
# expected_slices = 3
# result = detect_pie_slices(image, colors, expected_slices)
# print(result)
