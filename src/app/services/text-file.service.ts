import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';

@Injectable({ providedIn: 'root' })
export class TextFileService {
  async save(name: string, content: string): Promise<string> {
    if (Capacitor.isNativePlatform()) {
      if (Capacitor.getPlatform() === 'android') {
        const permission = await Filesystem.checkPermissions();
        if (permission.publicStorage !== 'granted') {
          const requested = await Filesystem.requestPermissions();
          if (requested.publicStorage !== 'granted') throw new Error('No se concedió el permiso para guardar archivos.');
        }
      }
      const file = await Filesystem.writeFile({
        path: `GPS-Ionic/${name}`, data: content,
        directory: Directory.Documents, encoding: Encoding.UTF8, recursive: true
      });
      return `Archivo guardado: ${file.uri}`;
    }
    const url = URL.createObjectURL(new Blob([content], { type: 'text/plain;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = name;
    document.body.appendChild(anchor);
    try {
      anchor.click();
    } finally {
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
    }
    return `Descarga solicitada: ${name}. Revisa la carpeta Descargas.`;
  }
}
