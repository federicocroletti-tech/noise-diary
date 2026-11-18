import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

@Injectable({ providedIn: 'root' })
export class NativeFileService {
  async saveOrShare(fileName: string, blob: Blob): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = fileName;
      anchor.click();
      URL.revokeObjectURL(url);
      return;
    }

    const path = `exports/${Date.now()}-${fileName}`;
    const { uri } = await Filesystem.writeFile({
      path,
      data: await this.encodeBase64(blob),
      directory: Directory.Cache,
      recursive: true,
    });

    let shareError: unknown;
    try {
      await Share.share({
        title: fileName,
        dialogTitle: 'Salva o condividi il file',
        files: [uri],
      });
    } catch (error) {
      shareError = error;
    }

    try {
      await Filesystem.deleteFile({ path, directory: Directory.Cache });
    } catch (error) {
      throw new Error(
        `File condiviso, ma non è stato possibile rimuovere la copia temporanea: ${String(error)}`,
      );
    }
    if (shareError) {
      throw shareError;
    }
  }

  private async encodeBase64(blob: Blob): Promise<string> {
    const data = new Uint8Array(await blob.arrayBuffer());
    const chunkSize = 0x8000;
    let binary = '';
    for (let offset = 0; offset < data.length; offset += chunkSize) {
      binary += String.fromCharCode(...data.subarray(offset, offset + chunkSize));
    }
    return btoa(binary);
  }
}
