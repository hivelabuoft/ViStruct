import cv2
import numpy as np
from typing import Dict

def detect_text_boxes(image: np.ndarray):
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

def group_boxes_by_alignment(boxes, alignment='vertical', x_delta=15, y_delta=15):
    groups = []
    used = [False] * len(boxes)
    # For horizontal grouping, sort by y; for vertical, sort by x.
    boxes_sorted = sorted(boxes, key=lambda b: b[1] if alignment == 'horizontal' else b[0])
    for i, b in enumerate(boxes_sorted):
        if used[i]:
            continue
        group = [b]
        used[i] = True
        x1, y1, w1, h1 = b
        for j in range(i+1, len(boxes_sorted)):
            if used[j]:
                continue
            x2, y2, w2, h2 = boxes_sorted[j]
            if alignment == 'horizontal' and abs(y2 - y1) < y_delta:
                group.append(boxes_sorted[j])
                used[j] = True
            elif alignment == 'vertical' and abs(x2 - x1) < x_delta:
                group.append(boxes_sorted[j])
                used[j] = True
        groups.append(group)
    return groups

def unify_component_bounding_box(groups, label_name: str):
    if not groups:
        return { "label": label_name, "error": "No groups found" }
    best_group = max(groups, key=lambda g: len(g))
    minX = min(b[0] for b in best_group)
    minY = min(b[1] for b in best_group)
    maxX = max(b[0] + b[2] for b in best_group)
    maxY = max(b[1] + b[3] for b in best_group)
    return {
        "label": label_name,
        "rectangular": {
            "xmin": int(minX),
            "ymin": int(minY),
            "xmax": int(maxX),
            "ymax": int(maxY)
        },
        "color": "#000000"
    }



#############################
# Treemap Labels Detection
#############################

def detect_treemap_labels(image: np.ndarray, regions: list, label_height=30):
    """
    Detects labels for treemap regions by looking for text immediately above each region.
    
    Parameters:
      image (np.ndarray): The input image.
      regions (list): List of dictionaries for major treemap regions.
      label_height (int): Height (in pixels) above each region to search for label text.
    
    Returns:
      dict: Contains a "labels" key with a list of label JSON objects.
    """
    labels = []
    
    for region in regions:
        if "rectangular" not in region:
            continue
        
        rect = region["rectangular"]
        xmin = rect["xmin"]
        ymin = rect["ymin"]
        xmax = rect["xmax"]
        
        # Define a search area immediately above the region
        label_ymax = ymin
        label_ymin = max(0, label_ymax - label_height)
        
        label_region = image[label_ymin:label_ymax, xmin:xmax]
        text_boxes = detect_text_boxes(label_region)
        # Adjust coordinates relative to the full image
        adjusted_boxes = [(x + xmin, y + label_ymin, w, h) for (x, y, w, h) in text_boxes]
        
        groups = group_boxes_by_alignment(adjusted_boxes, alignment='horizontal', y_delta=10)
        label_box = unify_component_bounding_box(groups, "treemap-label")
        
        labels.append(label_box)
    
    return {"labels": labels}

#############################
# Chart Title Detection
#############################

def detect_chart_title(image: np.ndarray):
    """
    Detects the chart title by grouping all text boxes with similar y coordinates.
    The group with the smallest y (highest in the image) is considered the title.
    
    Returns:
      dict: A JSON-like dictionary with the title region.
    """
    text_boxes = detect_text_boxes(image)
    if not text_boxes:
        return {"label": "title", "error": "No text boxes found"}
    
    groups = group_boxes_by_alignment(text_boxes, alignment='horizontal', y_delta=20)
    title_group = min(groups, key=lambda grp: min(box[1] for box in grp))
    
    min_x = min(box[0] for box in title_group)
    min_y = min(box[1] for box in title_group)
    max_x = max(box[0] + box[2] for box in title_group)
    max_y = max(box[1] + box[3] for box in title_group)
    
    return {
         "label": "title",
         "rectangular": {
             "xmin": int(min_x),
             "ymin": int(min_y),
             "xmax": int(max_x),
             "ymax": int(max_y)
         },
         "color": "#000000"
    }

import cv2
import numpy as np

def detect_specific_color_region(image, shape, target_hex, expected_count, indices=None, fallback_behavior='keep_detected'):
    """
    Detect regions in the image that match the target_hex color.

    Parameters:
      - image (np.ndarray): The input image.
      - shape (str): A label to use for the detected region (e.g., "treemap").
      - target_hex (str): The target color in hex format (e.g., "#a5d9a5").
      - expected_count (int): The expected number of regions for this color.
      - indices (list, optional): Specific indices to select from detected regions.
                                 If provided, only these indices will be returned
                                 instead of the first expected_count regions.
      - fallback_behavior (str): Strategy when fewer regions are detected than expected:
                               'keep_detected': Returns whatever regions were found (default)
                               'fill_expected': Duplicates the largest region to meet expected_count
                               'report_error': Includes an error message in the result

    Returns:
      - dict: A dictionary containing the detected regions, detected_count, expected_count, and match flag.
    """
    target_rgb = tuple(int(target_hex[i:i+2], 16) for i in (1, 3, 5))
    target_bgr = target_rgb[::-1]  # Reverse RGB to BGR
    color_tolerance = 30  # Color distance threshold

    # Create mask for target color
    lower_bound = np.array([max(0, c - color_tolerance) for c in target_bgr], dtype=np.uint8)
    upper_bound = np.array([min(255, c + color_tolerance) for c in target_bgr], dtype=np.uint8)
    mask = cv2.inRange(image, lower_bound, upper_bound)

    # Find contours in the mask
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    # Filter out small contours
    valid_contours = [cnt for cnt in contours if cv2.contourArea(cnt) >= 100]
    # Sort by area (largest first)
    valid_contours = sorted(valid_contours, key=cv2.contourArea, reverse=True)
    
    # Select contours based on indices if provided, otherwise use expected_count
    if indices is not None:
        # Filter indices to ensure they are valid
        valid_indices = [i for i in indices if 0 <= i < len(valid_contours)]
        selected_contours = [valid_contours[i] for i in valid_indices]
    else:
        # Select available contours up to expected_count
        selected_contours = valid_contours[:min(expected_count, len(valid_contours))]
    
    # Handle case where fewer regions were detected than expected
    if len(selected_contours) < expected_count and fallback_behavior == 'fill_expected' and len(selected_contours) > 0:
        # Duplicate the largest contour to fill up to expected_count
        largest_contour = selected_contours[0]
        while len(selected_contours) < expected_count:
            selected_contours.append(largest_contour)

    regions = []
    for cnt in selected_contours:
        # Calculate bounding box for the contour
        x, y, w, h = cv2.boundingRect(cnt)
        region = {
            "label": f"{shape} region",
            shape: {
                "xmin": int(x),
                "ymin": int(y),
                "xmax": int(x + w),
                "ymax": int(y + h),
            },
            "color": target_hex
        }
        regions.append(region)

    result = {
        "regions": regions,
        "detected_count": len(regions),
        "expected_count": expected_count,
        "match": (len(regions) == expected_count)
    }
    
    # Add error message if requested
    if len(regions) < expected_count and fallback_behavior == 'report_error':
        result["error"] = f"Expected {expected_count} regions but only found {len(regions)}"
    
    return result

def detect_multiple_colors_tree(image, shape, color_list, expected_counts, indices_list=None, fallback_behaviors=None):
    """
    Detects regions for multiple colors in an image.

    Parameters:
      - image (np.ndarray): The input image.
      - shape (str): A label to use for all detected regions.
      - color_list (list of str): List of hex color codes (e.g., ['#a5d9a5', '#fed3aa', ...]).
      - expected_counts (list of int): Expected number of regions for each corresponding color.
      - indices_list (list of list, optional): List of indices to select for each color.
                                              If provided, must have the same length as color_list.
      - fallback_behaviors (list of str or str, optional): Strategies for handling missing regions.
                                                          Can be a single strategy for all colors or
                                                          a list of strategies matching color_list length.
                                                          Options: 'keep_detected', 'fill_expected', 'report_error'

    Returns:
      - dict: A dictionary containing all detected regions from all colors.
    """
    all_regions = []
    mismatch_info = []

    # If fallback_behaviors is a string, apply it to all colors
    if isinstance(fallback_behaviors, str):
        fallback_behaviors = [fallback_behaviors] * len(color_list)
    
    for i, (color_hex, expected_count) in enumerate(zip(color_list, expected_counts)):
        # Get indices for this color if provided
        indices = None
        if indices_list and i < len(indices_list):
            indices = indices_list[i]
            
        # Get fallback behavior for this color
        fallback = 'keep_detected'  # Default
        if fallback_behaviors and i < len(fallback_behaviors):
            fallback = fallback_behaviors[i]
            
        single_color_result = detect_specific_color_region(
            image=image,
            shape=shape,
            target_hex=color_hex,
            expected_count=expected_count,
            indices=indices,
            fallback_behavior=fallback
        )
        
        # Collect regions
        all_regions.extend(single_color_result.get("regions", []))
        
        # Collect mismatch information if there's a discrepancy
        if single_color_result.get("detected_count") != expected_count:
            mismatch_info.append({
                "color_index": i,
                "color_hex": color_hex,
                "expected": expected_count,
                "detected": single_color_result.get("detected_count"),
                "error": single_color_result.get("error", None)
            })
    
    result = {
        "regions": all_regions
    }
    
    # Add mismatch information if any
    if mismatch_info:
        result["mismatches"] = mismatch_info
    
    return result

# Example usage:
# image = cv2.imread("treemap_chart.png")
# colors = ['#a5d9a5', '#fed3aa', '#fcb8b7', '#d1c6e1', '#7398c8']
# expected = [4, 5, 5, 4, 3]
# result = detect_multiple_colors(image, "treemap", colors, expected)
# print(result)


