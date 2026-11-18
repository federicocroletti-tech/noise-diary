const nativeFileMocks = vi.hoisted(() => ({
  writeFile: vi.fn().mockResolvedValue({ uri: 'file:///cache/backup.ndbackup' }),
  deleteFile: vi.fn().mockResolvedValue(undefined),
  share: vi.fn().mockResolvedValue({ activityType: undefined }),
}));

vi.mock('@capacitor/filesystem', () => ({
  Directory: { Cache: 'CACHE' },
  Filesystem: {
    writeFile: nativeFileMocks.writeFile,
    deleteFile: nativeFileMocks.deleteFile,
  },
}));

vi.mock('@capacitor/share', () => ({
  Share: { share: nativeFileMocks.share },
}));

import { Capacitor } from '@capacitor/core';
import { Directory } from '@capacitor/filesystem';
import { NativeFileService } from './native-file.service';

describe('NativeFileService', () => {
  beforeEach(() => {
    nativeFileMocks.writeFile.mockClear().mockResolvedValue({
      uri: 'file:///cache/backup.ndbackup',
    });
    nativeFileMocks.share.mockClear().mockResolvedValue({ activityType: undefined });
    nativeFileMocks.deleteFile.mockClear().mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shares Android files from cache and removes the temporary copy afterwards', async () => {
    vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);

    await new NativeFileService().saveOrShare(
      'backup.ndbackup',
      new Blob(['backup contents'], { type: 'application/octet-stream' }),
    );

    expect(nativeFileMocks.writeFile).toHaveBeenCalledWith({
      path: expect.stringMatching(/^exports\/\d+-backup\.ndbackup$/),
      data: btoa('backup contents'),
      directory: Directory.Cache,
      recursive: true,
    });
    expect(nativeFileMocks.share).toHaveBeenCalledWith(
      expect.objectContaining({ files: ['file:///cache/backup.ndbackup'] }),
    );
    expect(nativeFileMocks.deleteFile).toHaveBeenCalledWith({
      path: expect.stringMatching(/^exports\/\d+-backup\.ndbackup$/),
      directory: Directory.Cache,
    });
  });
});
