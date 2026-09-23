export type CameraAvailability = 'unknown' | 'available' | 'unavailable';

type CameraDeviceEnumerator = Pick<MediaDevices, 'enumerateDevices'> | null | undefined;

function getNavigatorMediaDevices(): CameraDeviceEnumerator {
  if (typeof navigator === 'undefined') return undefined;
  return navigator.mediaDevices;
}

export async function detectCameraAvailability(
  mediaDevices: CameraDeviceEnumerator = getNavigatorMediaDevices()
): Promise<CameraAvailability> {
  if (!mediaDevices?.enumerateDevices) return 'unknown';

  try {
    const devices = await mediaDevices.enumerateDevices();
    return devices.some((device) => device.kind === 'videoinput') ? 'available' : 'unavailable';
  } catch {
    return 'unknown';
  }
}
