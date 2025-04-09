import cv2
import numpy as np
from typing import Dict, List, Tuple, Optional

def detect_characters(
    img: np.ndarray,
    min_area: int = 10,
    max_area: int = 1000,
    morph_kernel_size: Tuple[int, int] = (1, 1)
) -> List[Dict]:
    """
    Detects small character-like contours using OpenCV.
    Returns a list of dicts in the form:
      { "label": "", "box": (x, y, w, h) }
    """
    if len(img.shape) == 3:
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    else:
        gray = img.copy()

    blur = cv2.GaussianBlur(gray, (3, 3), 0)
    # Threshold (invert => text is white on black)
    _, thresh = cv2.threshold(blur, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)

    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, morph_kernel_size)
    morph = cv2.morphologyEx(thresh, cv2.MORPH_OPEN, kernel)

    contours, _ = cv2.findContours(morph, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    results = []
    for cnt in contours:
        area = cv2.contourArea(cnt)
        if area < min_area or area > max_area:
            continue
        x, y, w, h = cv2.boundingRect(cnt)
        results.append({
            "label": "",  # will be assigned later
            "box": (x, y, w, h)
        })
    return results

def combine_boxes(box_list: List[Dict]) -> Optional[Dict]:
    """
    Combine a list of bounding boxes into a single bounding box.
    """
    if not box_list:
        return None
    min_x = min(b["box"][0] for b in box_list)
    min_y = min(b["box"][1] for b in box_list)
    max_x = max(b["box"][0] + b["box"][2] for b in box_list)
    max_y = max(b["box"][1] + b["box"][3] for b in box_list)
    return {
        "label": "",
        "rectangular": {
            "xmin": int(min_x),
            "ymin": int(min_y),
            "xmax": int(max_x),
            "ymax": int(max_y)
        },
        "color": "#000000"
    }

def group_horizontally(detections: List[Dict], gap_threshold: int = 30) -> List[Dict]:
    """
    Sort bounding boxes left-to-right and combine those whose centers
    are within 'gap_threshold' in x. This helps keep multi-digit or multi-word
    x-axis tick labels together.
    """
    if not detections:
        return []
    # Sort by left x coordinate
    detections.sort(key=lambda d: d["box"][0])
    groups = []
    current_group = [detections[0]]

    for det in detections[1:]:
        (px, py, pw, ph) = current_group[-1]["box"]
        (cx, cy, cw, ch) = det["box"]
        prev_center_x = px + pw / 2
        curr_center_x = cx + cw / 2
        if abs(curr_center_x - prev_center_x) < gap_threshold:
            current_group.append(det)
        else:
            combined = combine_boxes(current_group)
            if combined:
                groups.append(combined)
            current_group = [det]

    combined = combine_boxes(current_group)
    if combined:
        groups.append(combined)
    return groups

def group_vertically(detections: List[Dict], gap_threshold: int = 20) -> List[Dict]:
    """
    Sort bounding boxes top-to-bottom and combine those whose centers
    are within 'gap_threshold' in y. Useful for y-axis tick labels.
    """
    if not detections:
        return []
    # Sort by top-left y
    detections.sort(key=lambda d: d["box"][1])
    groups = []
    current_group = [detections[0]]

    for det in detections[1:]:
        (px, py, pw, ph) = current_group[-1]["box"]
        (cx, cy, cw, ch) = det["box"]
        prev_center_y = py + ph / 2
        curr_center_y = cy + ch / 2
        if abs(curr_center_y - prev_center_y) < gap_threshold:
            current_group.append(det)
        else:
            combined = combine_boxes(current_group)
            if combined:
                groups.append(combined)
            current_group = [det]

    combined = combine_boxes(current_group)
    if combined:
        groups.append(combined)
    return groups

def extract_specific_axis_labels(img: np.ndarray) -> List[Dict]:
    """
    1. Combine all detections in top margin => single bounding box => label = "title"
    2. Combine all detections in a narrower left margin => single bounding box => label = "y_axis_title"
    3. Among the remainder:
       - If center is in bottom margin => group horizontally => label = "x_axis_tick"
       - Otherwise => group vertically => label = "y_axis_tick"

    Then, apply a maximum tick height filter: if a grouped tick bounding box
    is too tall, re-label it as "other".

    Returns a list of region dicts.
    """
    detections = detect_characters(img)
    if not detections:
        return []

    H, W = img.shape[:2]

    top_margin = 0.10 * H      # top 10% => title
    left_margin = 0.06 * W     # ~6% => y-axis title
    bottom_margin = 0.85 * H   # bottom 15% => x-axis

    top_candidates = []
    left_candidates = []
    remainder = []

    # Separate bounding boxes into top, left, or remainder
    for d in detections:
        x, y, w, h = d["box"]
        cx = x + w/2
        cy = y + h/2
        if cy < top_margin:
            top_candidates.append(d)
        elif cx < left_margin:
            left_candidates.append(d)
        else:
            remainder.append(d)

    # A. Combine top => label "title"
    regions = []
    if top_candidates:
        top_box = combine_boxes(top_candidates)
        if top_box:
            top_box["label"] = "title"
            regions.append(top_box)

    # B. Combine left => label "y_axis_title"
    if left_candidates:
        left_box = combine_boxes(left_candidates)
        if left_box:
            left_box["label"] = "y_axis_title"
            regions.append(left_box)

    # C. The remainder => decide bottom vs. else
    bottom_candidates = []
    other_candidates = []
    for d in remainder:
        x, y, w, h = d["box"]
        cy = y + h/2
        if cy > bottom_margin:
            bottom_candidates.append(d)  # near bottom => x-axis tick
        else:
            other_candidates.append(d)   # else => y-axis tick

    # Group x-axis ticks horizontally
    x_axis_groups = group_horizontally(bottom_candidates, gap_threshold=30)

    # Group y-axis ticks vertically
    y_axis_groups = group_vertically(other_candidates, gap_threshold=20)

    # -------------------------------
    # Apply maximum tick height rule
    # -------------------------------
    MAX_TICK_HEIGHT = 40  # adjust as needed
    # For x-axis ticks
    for g in x_axis_groups:
        box_height = g["rectangular"]["ymax"] - g["rectangular"]["ymin"]
        if box_height > MAX_TICK_HEIGHT:
            g["label"] = "other"
        else:
            g["label"] = "x_axis_tick"
        regions.append(g)

    # For y-axis ticks
    for g in y_axis_groups:
        box_height = g["rectangular"]["ymax"] - g["rectangular"]["ymin"]
        if box_height > MAX_TICK_HEIGHT:
            g["label"] = "other"
        else:
            g["label"] = "y_axis_tick"
        regions.append(g)

    return regions

def find_intersection_bounding_boxes(
    img: np.ndarray,
    x_positions: List[int],
    box_offset: int = 20,
    default_y: Optional[int] = None
) -> List[Dict]:
    """
    For each x in x_positions, this function:
      1. Converts the image to HSV.
      2. Constructs a white mask and a blue mask (for 3282bd).
      3. For all x positions except the last, it scans vertically from top to bottom 
         to find a white-to-blue transition: it waits until at least one white pixel is 
         observed, then the first pixel that qualifies as blue is the boundary.
      4. For the last element in x_positions, it subtracts box_offset from x and scans upward
         (from bottom to top) to find a transition that shows the presence of three color zones:
         first a blue region, then an intermediate (gray) region, and finally white.
      5. If no boundary is found, it uses a fallback y value (default_y; if not provided, uses bottom-of-image).
      6. It then creates a bounding box at that x by extending ±box_offset in both x and y.
    
    Returns a list of region dictionaries in the following format:
      {
          "label": "area_boundary_value",
          "rectangular": {
              "xmin": int,
              "ymin": int,
              "xmax": int,
              "ymax": int
          },
          "color": "#000000"
      }
    
    The number of bounding boxes returned equals len(x_positions).
    """
    H, W = img.shape[:2]
    # Convert image to HSV
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    
    # White mask: low saturation, high brightness.
    lower_white = np.array([0, 0, 200])
    upper_white = np.array([180, 30, 255])
    white_mask = cv2.inRange(hsv, lower_white, upper_white)
    
    # Blue mask: use a range around the expected blue for 0x3282bd.
    lower_blue = np.array([90, 100, 50])
    upper_blue = np.array([110, 255, 255])
    blue_mask = cv2.inRange(hsv, lower_blue, upper_blue)
    
    # Determine default_y if needed.
    if default_y is None:
        default_y = H - box_offset - 1
        
    boundary_regions = []
    
    # For each x, determine boundary_y.
    for idx, x in enumerate(x_positions):
        if x < 0 or x >= W:
            continue
        
        boundary_y = None
        
        # For all but the last element, do the standard top-down scan.
        if idx < len(x_positions) - 1:
            found_white = False
            for y in range(H):
                if white_mask[y, x] == 255:
                    found_white = True
                elif found_white and blue_mask[y, x] == 255:
                    boundary_y = y
                    break
            if boundary_y is None:
                boundary_y = default_y
        else:
            # For the last element, modify x by subtracting box_offset.
            x_adjusted = x - box_offset
            if x_adjusted < 0:
                x_adjusted = 0
            # Scan upward (from bottom to top) for a triple-color boundary.
            boundary_y = find_last_boundary_upward(hsv, white_mask, blue_mask, x_adjusted, box_offset, default_y)
        
        # Create bounding box at (x, boundary_y) with offset ±box_offset.
        xmin = max(x - box_offset, 0)
        xmax = min(x + box_offset, W - 1)
        ymin = max(boundary_y - box_offset, 0)
        ymax = min(boundary_y + box_offset, H - 1)
        region = {
            "label": "area_boundary_value",
            "rectangular": {
                "xmin": int(xmin),
                "ymin": int(ymin),
                "xmax": int(xmax),
                "ymax": int(ymax)
            },
            "color": "#000000"
        }
        boundary_regions.append(region)
    
    return boundary_regions


def find_last_boundary_upward(
    hsv: np.ndarray,
    white_mask: np.ndarray,
    blue_mask: np.ndarray,
    x: int,
    box_offset: int,
    default_y: int
) -> int:
    """
    For the last x position (after x has been adjusted by subtracting box_offset),
    scan upward (from bottom to top) to find the boundary where
      1. We first encounter blue pixels (area chart color),
      2. Then, after that, an intermediate region (neither blue nor white, hence “gray”),
      3. And finally white pixels.
      
    Only when all three zones are observed (in that order, scanning upward) do we mark 
    the boundary at the white transition. If no such tripartite transition is found, return default_y.
    """
    H, W = hsv.shape[:2]
    
    found_blue = False
    found_intermediate = False
    boundary_y = None
    
    # Scan upward from bottom.
    for y in range(H - 1, -1, -1):
        # Check the pixel at position (y, x) using the existing masks.
        is_white = (white_mask[y, x] == 255)
        is_blue = (blue_mask[y, x] == 255)
        # Define "intermediate" as not white and not blue.
        is_intermediate = (not is_white and not is_blue)
        
        if not found_blue:
            if is_blue:
                found_blue = True
        elif not found_intermediate:
            if is_intermediate:
                found_intermediate = True
        else:
            if is_white:
                boundary_y = y
                break
    
    if boundary_y is None:
        boundary_y = default_y
    return boundary_y
