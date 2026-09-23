import { describe, expect, it } from 'vitest';
import { detectCameraAvailability } from '../src/utils/cameraAvailability';

const mediaDevices = (devices: Array<Partial<MediaDeviceInfo>>) =>
  ({
    enumerateDevices: async () => devices as MediaDeviceInfo[],
  }) satisfies Pick<MediaDevices, 'enumerateDevices'>;

describe('camera availability detection', () => {
  it('reports available when a video input is present', async () => {
    await expect(detectCameraAvailability(mediaDevices([{ kind: 'audioinput' }, { kind: 'videoinput' }])))
      .resolves.toBe('available');
  });

  it('reports unavailable when device enumeration finds no cameras', async () => {
    await expect(detectCameraAvailability(mediaDevices([{ kind: 'audioinput' }, { kind: 'audiooutput' }])))
      .resolves.toBe('unavailable');
  });

  it('stays unknown when browser device enumeration is unavailable', async () => {
    await expect(detectCameraAvailability(undefined)).resolves.toBe('unknown');
    await expect(detectCameraAvailability({} as Pick<MediaDevices, 'enumerateDevices'>)).resolves.toBe('unknown');
  });

  it('stays unknown when browser device enumeration fails', async () => {
    await expect(detectCameraAvailability({
      enumerateDevices: async () => {
        throw new Error('permission blocked');
      },
    })).resolves.toBe('unknown');
  });
});
