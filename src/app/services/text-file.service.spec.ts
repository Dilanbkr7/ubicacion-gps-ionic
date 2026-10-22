import { vi, describe, beforeEach, afterEach, it, expect } from 'vitest';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { TextFileService } from './text-file.service';

vi.mock('@capacitor/filesystem', () => ({
  Filesystem: { writeFile: vi.fn(), checkPermissions: vi.fn(), requestPermissions: vi.fn() },
  Directory: { Documents: 'DOCUMENTS' }, Encoding: { UTF8: 'utf8' }
}));

describe('TextFileService', () => {
  beforeEach(() => { vi.resetAllMocks(); });
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

  it('descarga un TXT y libera su enlace temporal en el navegador', async () => {
    vi.useFakeTimers();
    try {
      vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(false);
      const createObjectURL = vi.fn(() => 'blob:test');
      const revokeObjectURL = vi.fn();
      vi.stubGlobal('URL', { createObjectURL, revokeObjectURL });
      const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
        expect(this.download).toBe('ubicacion.txt');
        expect(this.href).toBe('blob:test');
      });
      const message = await new TextFileService().save('ubicacion.txt', 'https://www.google.com/maps/');
      expect(click).toHaveBeenCalledOnce();
      expect(message).toContain('Descarga solicitada');
      expect(createObjectURL).toHaveBeenCalledOnce();
      expect(Filesystem.writeFile).not.toHaveBeenCalled();
      vi.runAllTimers();
      expect(revokeObjectURL).toHaveBeenCalledWith('blob:test');
    } finally { vi.useRealTimers(); }
  });

  it('guarda UTF-8 en Documentos/GPS-Ionic en Android', async () => {
    vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);
    vi.spyOn(Capacitor, 'getPlatform').mockReturnValue('android');
    vi.mocked(Filesystem.checkPermissions).mockResolvedValue({ publicStorage: 'granted' });
    vi.mocked(Filesystem.writeFile).mockResolvedValue({ uri: 'file:///Documents/GPS-Ionic/ruta.txt' });
    const message = await new TextFileService().save('ruta.txt', 'https://www.google.com/maps/dir/');
    expect(Filesystem.writeFile).toHaveBeenCalledWith({
      path: 'GPS-Ionic/ruta.txt', data: 'https://www.google.com/maps/dir/',
      directory: Directory.Documents, encoding: Encoding.UTF8, recursive: true
    });
    expect(message).toContain('Archivo guardado');
  });

  it('no anuncia éxito cuando falla la escritura', async () => {
    vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);
    vi.spyOn(Capacitor, 'getPlatform').mockReturnValue('android');
    vi.mocked(Filesystem.checkPermissions).mockResolvedValue({ publicStorage: 'granted' });
    vi.mocked(Filesystem.writeFile).mockRejectedValue(new Error('Sin espacio'));
    await expect(new TextFileService().save('ruta.txt', 'ruta')).rejects.toThrow('Sin espacio');
  });
});
