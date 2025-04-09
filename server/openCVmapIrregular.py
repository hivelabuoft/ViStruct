import cv2
import numpy as np
from typing import Dict, List, Optional, Tuple



def hex_to_bgr(hex_color: str) -> np.ndarray:
    """
    Converts hex color (e.g., "#3282bd") to a BGR numpy array.
    """
    hex_color = hex_color.lstrip('#')
    r = int(hex_color[0:2], 16)
    g = int(hex_color[2:4], 16)
    b = int(hex_color[4:6], 16)
    return np.array([b, g, r], dtype=np.uint8)

def detect_legend_colors(img: np.ndarray, target_hex_colors: List[str], x_extend: int = 80, color_tol: int = 30) -> List[Dict]:
    """
    Detects legend patches in the input image.
    
    Assumptions:
      - The provided image is already cropped to the legend area (right 20% of the original image).
      - The target_hex_colors is a list of hex color strings to search for.
      
    The function:
      1. Converts the image to grayscale and applies Canny edge detection.
      2. Finds contours in the legend area.
      3. For each contour, computes a bounding box and the average BGR color.
      4. If the average color per channel is within color_tol of one of the target colors (converted to BGR),
         the bounding box is selected.
      5. The bounding box is then adjusted by extending its x_max by x_extend.
      
    All coordinates of the returned bounding boxes are in the coordinate system of the full image.
    (This is done by offsetting the x coordinates by the start column of the legend area.)
    """
    H, W, _ = img.shape
    # The legend area image is assumed to be the rightmost part of the original image.
    # In your pipeline, the legend area is cropped before calling this function.
    
    # Apply Canny edge detection on the legend area.
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    edges = cv2.Canny(gray, threshold1=50, threshold2=150)
    
    # Find contours in the edge image.
    contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    # Convert target hex colors to BGR.
    target_bgr_list = []
    for hex_color in target_hex_colors:
        target_bgr_list.append((hex_color, hex_to_bgr(hex_color)))
    
    detected_regions = []
    for cnt in contours:
        x, y, w, h = cv2.boundingRect(cnt)
        # Filter out small contours.
        if w * h < 100:
            continue
        
        # Compute the average color of this patch from the original legend image.
        patch = img[y:y+h, x:x+w]
        avg_color = np.mean(patch, axis=(0,1))  # Average BGR.
        
        for hex_color, target_bgr in target_bgr_list:
            if np.all(np.abs(avg_color - target_bgr) <= color_tol):
                # The bounding box from the legend area should be converted back to full-image coordinates.
                # Assume that the legend area was cropped from column L = int(0.8 * OriginalWidth).
                # We'll pass that offset as an additional parameter.
                region = {
                    "label": "legend_label",
                    "rectangular": {
                        "xmin": x,  # x is relative to the legend area
                        "ymin": y,
                        "xmax": x + w + x_extend,  # extend xmax by x_extend
                        "ymax": y + h
                    },
                    "color": hex_color
                }
                detected_regions.append(region)
                break
    return detected_regions



def detect_stacked_boundaries(
    img: np.ndarray,
    middle_x: int,
    target_hex_colors: List[str],
    tolerance: int = 30,
    white_thresh: int = 240,
    box_offset: int = 20,
    default_y: Optional[int] = None
) -> List[Dict]:
    """
    Scans upward along the given middle_x column of a stacked area chart to detect boundaries.
    
    The function expects three target colors (as hex strings) that appear from bottom to top:
       class 0: bottom color,
       class 1: middle color,
       class 2: top color.
    
    Above the top color, the background is white (class 3, where every channel >= white_thresh).
    
    It will look for the following transitions (when scanning upward):
       - A transition from 0 to 1. (That is, the pixel just above a region of color 0 is classified as color 1.)
         This is labeled as "boundary_1_0".
       - A transition from 1 to 2, labeled as "boundary_2_1".
       - A transition from 2 to 3 (white), labeled as "boundary_white_2".
    
    For each detected transition, a bounding box is created centered at (middle_x, boundary_y) that extends ±box_offset 
    in both x and y. If a transition is not found, default_y is used (or, if not provided, default_y is set to H - box_offset - 1).
    
    Returns a list of three region dictionaries.
    """
    H, W = img.shape[:2]
    # Validate middle_x.
    if middle_x < 0 or middle_x >= W:
        middle_x = W // 2
    if default_y is None:
        default_y = H - box_offset - 1

    # Convert the three target colors to BGR.
    if len(target_hex_colors) != 3:
        raise ValueError("Expected exactly three target hex colors (bottom, middle, top).")
    target_bgr = [hex_to_bgr(color) for color in target_hex_colors]
    # We'll assign classes:
    #    0 -> bottom color, 1 -> middle color, 2 -> top color, 3 -> white.
    
    def classify_pixel(pixel: np.ndarray) -> Optional[int]:
        # Check white: if all channels are >= white_thresh, classify as 3.
        if all(int(ch) >= white_thresh for ch in pixel):
            return 3
        # Otherwise, compare against target colors (0, 1, 2).
        for i, target in enumerate(target_bgr):
            if np.all(np.abs(pixel.astype(np.int32) - target) <= tolerance):
                return i
        return None

    # Scan upward along column middle_x.
    classes = []
    for y in range(H):
        pixel = img[y, middle_x]
        c = classify_pixel(pixel)
        classes.append(c)
    
    # We now want to scan upward from the bottom (largest y) to detect transitions.
    # Expected transitions (when moving upward):
    #   from 0 to 1 (i.e. lower pixel = 0, pixel above = 1) → label "boundary_1_0"
    #   from 1 to 2 → label "boundary_2_1"
    #   from 2 to 3 (white) → label "boundary_white_2"
    expected_transitions = [ (0, 1), (1, 2), (2, 3) ]
    transitions = {}
    # Scan upward: for y in descending order.
    prev_class = classes[H-1]
    for y in range(H-1, 0, -1):
        curr_class = classes[y-1]
        if prev_class is not None and curr_class is not None and prev_class != curr_class:
            tran = (prev_class, curr_class)
            if tran in expected_transitions and tran not in transitions:
                # Record the boundary at the transition: we'll use y-0.5 as approximation.
                transitions[tran] = y - 0.5
        prev_class = curr_class

    # Prepare region dictionaries for each transition.
    transition_labels = {
        (0, 1): "boundary_1_0",
        (1, 2): "boundary_2_1",
        (2, 3): "boundary_white_2"
    }
    regions = []
    for tran in expected_transitions:
        if tran in transitions:
            y_bound = int(round(transitions[tran]))
        else:
            y_bound = default_y
        region = {
            "label": transition_labels[tran],
            "rectangular": {
                "xmin": max(middle_x - box_offset, 0),
                "ymin": max(y_bound - box_offset, 0),
                "xmax": min(middle_x + box_offset, W - 1),
                "ymax": min(y_bound + box_offset, H - 1)
            },
            "color": "#000000"
        }
        regions.append(region)
    return regions

def detect_all_characters(img: np.ndarray, min_area: int = 30, max_area: int = 1000) -> List[Tuple[int, int, int, int]]:
    """
    Converts the image to grayscale and uses adaptive thresholding to detect
    dark characters on a light background. Then, it finds contours and returns a list
    of candidate bounding boxes (x, y, w, h) that pass area filtering.
    """
    # Convert to grayscale.
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
    # Adaptive threshold so that letters become white on a black background.
    thresh = cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_MEAN_C,
                                   cv2.THRESH_BINARY_INV, 11, 2)
    
    # Find contours.
    contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    boxes = []
    for cnt in contours:
        x, y, w, h = cv2.boundingRect(cnt)
        area = w * h
        if area < min_area or area > max_area:
            continue
        boxes.append((x, y, w, h))
    return boxes

def group_boxes_by_y(boxes: List[Tuple[int, int, int, int]], vertical_thresh: int = 10) -> List[List[Tuple[int, int, int, int]]]:
    """
    Given a list of bounding boxes, group boxes that have similar vertical center positions.
    Returns a list of groups; each group is a list of bounding boxes.
    """
    # Compute the vertical center for each box.
    boxes_with_center = [(box, box[1] + box[3] / 2) for box in boxes]
    # Sort by center y.
    boxes_with_center.sort(key=lambda pair: pair[1])
    
    groups = []
    for box, center_y in boxes_with_center:
        placed = False
        for group in groups:
            # Compute average center y for the group.
            avg_y = np.mean([b[1] + b[3] / 2 for b in group])
            if abs(center_y - avg_y) <= vertical_thresh:
                group.append(box)
                placed = True
                break
        if not placed:
            groups.append([box])
    return groups

def merge_two_boxes(box1: Tuple[int, int, int, int], box2: Tuple[int, int, int, int]) -> Dict:
    """
    Merges two bounding boxes into a single bounding region.
    Returns a region dictionary.
    """
    x1, y1, w1, h1 = box1
    x2, y2, w2, h2 = box2
    xmin = min(x1, x2)
    ymin = min(y1, y2)
    xmax = max(x1 + w1, x2 + w2)
    ymax = max(y1 + h1, y2 + h2)
    return {
        "label": "state_abbreviation",   # Placeholder label
        "rectangular": {
            "xmin": int(xmin),
            "ymin": int(ymin),
            "xmax": int(xmax),
            "ymax": int(ymax)
        },
        "color": "#000000"
    }

def detect_abbreviations(img: np.ndarray) -> List[Dict]:
    """
    Detects individual character bounding boxes in the image, groups those that share similar vertical positions,
    and then merges groups that contain exactly two boxes (assuming each state abbreviation is two letters).
    Returns a list of region dictionaries for each detected state abbreviation.
    """
    # Step 1: Detect candidate character boxes.
    boxes = detect_all_characters(img)
    
    # Step 2: Group boxes by similar vertical center positions.
    groups = group_boxes_by_y(boxes, vertical_thresh=10)
    
    regions = []
    # Step 3: For each group that has exactly two boxes, merge them.
    for group in groups:
        if len(group) == 2:
            region = merge_two_boxes(group[0], group[1])
            regions.append(region)
    
    return regions