from fastapi import APIRouter
import tobii_research as tr

router = APIRouter()

@router.get("/eye-tracker/status")
def get_status():
    devices = tr.find_all_eyetrackers()
    print("finidng devices")
    if not devices:
        return {"status": "No eye tracker connected"}
    
    tracker = devices[0]
    return {
        "status": "Eye tracker connected",
        "device_name": tracker.device_name,
        "serial_number": tracker.serial_number
    }

@router.post("/eye-tracker/start")
def start_tracking():
    devices = tr.find_all_eyetrackers()
    if not devices:
        return {"error": "No eye tracker connected"}
    
    tracker = devices[0]

    def gaze_data_callback(gaze_data):
        print("Gaze data:", gaze_data)

    tracker.subscribe_to(tr.EYETRACKER_GAZE_DATA, gaze_data_callback, as_dictionary=True)

    return {"status": "Tracking started"}
