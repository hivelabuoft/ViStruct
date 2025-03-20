import cv2
import numpy as np

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
    boxes_sorted = sorted(boxes, key=lambda b: b[0] if alignment == 'vertical' else b[1])

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
            if alignment == 'vertical' and abs(x2 - x1) < x_delta:
                group.append(boxes_sorted[j])
                used[j] = True
            elif alignment == 'horizontal' and abs(y2 - y1) < y_delta:
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

def detect_axes_and_title_with_legends(img: np.ndarray):
    text_boxes = detect_text_boxes(img)
    height, width = img.shape[:2]

    # Detect y-axis
    left_boxes = [(x, y, w, h) for (x, y, w, h) in text_boxes if x < width * 0.3]
    vertical_groups = group_boxes_by_alignment(left_boxes, alignment='vertical', x_delta=20)
    y_axis_box = unify_component_bounding_box(vertical_groups, "y-axis")

    # Detect x-axis
    bottom_boxes = [(x, y, w, h) for (x, y, w, h) in text_boxes if y > height * 0.7]
    horizontal_groups = group_boxes_by_alignment(bottom_boxes, alignment='horizontal', y_delta=20)
    x_axis_box = unify_component_bounding_box(horizontal_groups, "x-axis")

    # Detect title
    top_boxes = [(x, y, w, h) for (x, y, w, h) in text_boxes if y < height * 0.15]
    title_groups = group_boxes_by_alignment(top_boxes, alignment='horizontal', y_delta=20)
    title_box = unify_component_bounding_box(title_groups, "title")

    # Adjust bottom of y-axis to top of x-axis for perfect boundary
    if "error" not in y_axis_box and "error" not in x_axis_box:
        y_axis_box["rectangular"]["ymax"] = x_axis_box["rectangular"]["ymin"]

    legend_height_range = int(height * 0.1)
    # Detect x-axis legend below x-axis box
    x_axis_bottom_y = x_axis_box["rectangular"]["ymax"] if "error" not in x_axis_box else height
    x_legend_boxes = [
        (x, y, w, h) for (x, y, w, h) in text_boxes
        if y > x_axis_bottom_y and y < x_axis_bottom_y + legend_height_range
    ]
    x_legend_groups = group_boxes_by_alignment(x_legend_boxes, alignment='horizontal', y_delta=20)
    x_legend_box = unify_component_bounding_box(x_legend_groups, "x-legend")

    
    legend_width_range = int(width * 0.1)
    # Detect y-axis legend left of y-axis box
    y_axis_left_x = y_axis_box["rectangular"]["xmin"] if "error" not in y_axis_box else 0
    y_legend_boxes = [
        (x, y, w, h) for (x, y, w, h) in text_boxes
        if x < y_axis_left_x and x > y_axis_left_x - legend_width_range
    ]
    y_legend_groups = group_boxes_by_alignment(y_legend_boxes, alignment='vertical', x_delta=20)
    y_legend_box = unify_component_bounding_box(y_legend_groups, "y-legend")

    return {
        "regions": [
            y_axis_box,
            x_axis_box,
            title_box,
            x_legend_box,
            y_legend_box
        ]
    }


import cv2
import numpy as np

def detect_legend_items(image: np.ndarray):
    height, width = image.shape[:2]
    legend_region = image[0:int(height * 0.3), int(width * 0.7):width]

    hsv = cv2.cvtColor(legend_region, cv2.COLOR_BGR2HSV)

    # Create a mask for non-white regions (likely color patches)
    lower = np.array([0, 50, 50])  # adjust as needed
    upper = np.array([180, 255, 255])
    color_mask = cv2.inRange(hsv, lower, upper)

    # Morphological clean-up
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
    color_mask = cv2.morphologyEx(color_mask, cv2.MORPH_OPEN, kernel, iterations=1)

    # Detect contours for color patches
    contours, _ = cv2.findContours(color_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    patches = []
    for cnt in contours:
        x, y, w, h = cv2.boundingRect(cnt)
        area = w * h
        if 10 < area < 5000:
            patches.append((x, y, w, h))

    # Detect text boxes in legend region
    gray = cv2.cvtColor(legend_region, cv2.COLOR_BGR2GRAY)
    text_thresh = cv2.adaptiveThreshold(
        gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY_INV, 15, 4
    )
    closed = cv2.morphologyEx(text_thresh, cv2.MORPH_CLOSE, kernel, iterations=1)
    text_contours, _ = cv2.findContours(closed, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    text_boxes = []
    for cnt in text_contours:
        x, y, w, h = cv2.boundingRect(cnt)
        if w > 5 and h > 5:
            text_boxes.append((x, y, w, h))

    # Pair color patches with nearest text boxes
    legend_items = []
    offsetX = int(width * 0.7)

    for patch in patches:
        px, py, pw, ph = patch
        patch_center_y = py + ph // 2

        nearest_text = None
        min_dist = float('inf')
        for tx, ty, tw, th in text_boxes:
            if abs((ty + th // 2) - patch_center_y) < 15 and tx > px:
                dist = tx - (px + pw)
                if 0 < dist < min_dist:
                    nearest_text = (tx, ty, tw, th)
                    min_dist = dist

        if nearest_text:
            tx, ty, tw, th = nearest_text
            minX = min(px, tx)
            minY = min(py, ty)
            maxX = max(px + pw, tx + tw)
            maxY = max(py + ph, ty + th)

            # Sample color at patch center
            patch_color_bgr = image[py + ph // 2, px + pw // 2 + offsetX]
            color_hex = "#{:02x}{:02x}{:02x}".format(*patch_color_bgr[::-1])

            legend_items.append({
                "label": "series-legend-item",
                "rectangular": {
                    "xmin": int(minX + offsetX),
                    "ymin": int(minY),
                    "xmax": int(maxX + offsetX),
                    "ymax": int(maxY)
                },
                "color": color_hex
            })

    return { "regions": legend_items }

import cv2
import numpy as np
import json

def detect_specific_color_region(image, shape, target_hex, expected_count):
    # Convert hex to BGR (OpenCV uses BGR)
    target_rgb = tuple(int(target_hex[i:i+2], 16) for i in (1, 3, 5))
    target_bgr = target_rgb[::-1]  # Reverse RGB to BGR
    color_tolerance = 30  # Color distance threshold

    # Load image
    # img = cv2.imread(image_path)
    # if img is None:
    #     raise ValueError("Image not found or failed to load")

    # Create mask for target color
    lower_bound = np.array([max(0, c - color_tolerance) for c in target_bgr], dtype=np.uint8)
    upper_bound = np.array([min(255, c + color_tolerance) for c in target_bgr], dtype=np.uint8)
    mask = cv2.inRange(image, lower_bound, upper_bound)

    # Find contours
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    # Sort contours by area (largest to smallest)
    contours = sorted(contours, key=cv2.contourArea, reverse=True)

    regions = []

    # Process up to expected_count regions (if specified)
    for i, cnt in enumerate(contours):
        if expected_count is not None and i >= expected_count:
            break  # Stop if we've reached the expected number

        area = cv2.contourArea(cnt)
        if area < 100:  # Filter small regions
            continue

        # Approximate shape
        peri = cv2.arcLength(cnt, True)
        approx = cv2.approxPolyDP(cnt, 0.04 * peri, True)

        shape_label = shape

        # Bounding box
        x, y, w, h = cv2.boundingRect(cnt)
        region = {
            "label": f"{shape_label} region",
            shape_label: {
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
        "match": (expected_count is None) or (len(regions) == expected_count)
    }
    return result 


def detect_multiple_colors(image, shape, color_list, expected_count):
    """
    Detects regions for multiple colors in an image.

    Parameters:
      - image_path: Path to the image file.
      - color_list: List of hex color codes (e.g., ['#cd7f32', '#bdbdbd', '#feb24c']).
      - expected_count: Expected number of regions per color.

    Returns:
      - A JSON string containing all detected regions from all colors.
    """
    all_regions = []

    for color_hex in color_list:
        single_color_result_json = detect_specific_color_region(
            image=image,
            shape=shape,
            target_hex=color_hex,
            expected_count=expected_count
        )
        single_color_result = single_color_result_json
        all_regions.extend(single_color_result.get("regions", []))
    

    return {
        "regions": all_regions
    }



