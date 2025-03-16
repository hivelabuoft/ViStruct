import cv2
import numpy as np
import json

def detect_bar_segments_by_color(bar_img, bar_rect, bar_index):
    h, w, _ = bar_img.shape
    color_profile = []

    for y in range(0, h, 2):
        row = bar_img[y:y+2, :, :]
        mean_color = cv2.mean(row)[:3]
        color_profile.append(mean_color)

    boundaries = [0]
    threshold = 20
    for i in range(1, len(color_profile)):
        c1 = np.array(color_profile[i-1])
        c2 = np.array(color_profile[i])
        dist = np.linalg.norm(c1 - c2)
        if dist > threshold:
            boundaries.append(i*2)
    if boundaries[-1] != h:
        boundaries.append(h)

    merged_bounds = [boundaries[0]]
    for b in boundaries[1:]:
        if b - merged_bounds[-1] > 10:
            merged_bounds.append(b)
    if merged_bounds[-1] != h:
        merged_bounds.append(h)

    segments = []
    for i in range(len(merged_bounds)-1):
        y1 = merged_bounds[i]
        y2 = merged_bounds[i+1]
        if y2 - y1 < 10:
            continue
        segment_roi = bar_img[y1:y2, :]
        mean_color = cv2.mean(segment_roi)
        hex_color = '#{:02x}{:02x}{:02x}'.format(int(mean_color[2]), int(mean_color[1]), int(mean_color[0]))
        segment = {
            "label": "vertical bar segment",
            "rectangular": {
                "xmin": bar_rect["x"],
                "ymin": bar_rect["y"] + y1,
                "xmax": bar_rect["x"] + bar_rect["width"],
                "ymax": bar_rect["y"] + y2
            },
            "color": hex_color,
            "barIndex": bar_index,
            "segmentIndex": i + 1
        }
        segments.append(segment)

    return segments

def analyze_bar_chart(image: np.ndarray, expected_bars=4):
    if image is None:
        raise ValueError("No image provided")

    img = image.copy()
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    _, thresh = cv2.threshold(gray, 250, 255, cv2.THRESH_BINARY_INV)
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (5, 5))
    cleaned = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel)

    contours, _ = cv2.findContours(cleaned, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    bar_candidates = []
    for cnt in contours:
        x, y, w, h = cv2.boundingRect(cnt)
        aspect_ratio = h / float(w)
        area = w * h
        if aspect_ratio > 2.5 and area > 1000:
            bar_candidates.append({"x": x, "y": y, "width": w, "height": h})

    bar_candidates.sort(key=lambda b: b["x"])
    bars_sorted = sorted(bar_candidates, key=lambda b: b["width"], reverse=True)
    bar_regions = sorted(bars_sorted[:expected_bars], key=lambda b: b["x"])

    all_segments = []
    for idx, bar in enumerate(bar_regions):
        x, y, w, h = bar["x"], bar["y"], bar["width"], bar["height"]
        bar_img = img[y:y+h, x:x+w]
        segments = detect_bar_segments_by_color(bar_img, bar, idx+1)
        all_segments.extend(segments)

    result = {
        "regions": all_segments
    }

    return result  # Return as dict
