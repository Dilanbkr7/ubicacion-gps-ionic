import { vi, describe, beforeEach, afterEach, it, expect } from 'vitest';
import { Capacitor } from '@capacitor/core';
import { Geolocation, Position } from '@capacitor/geolocation';
import { LocationService } from './location.service';

vi.mock('@capacitor/geolocation', () => ({
  Geolocation: {
    getCurrentPosition: vi.fn(), watchPosition: vi.fn(), clearWatch: vi.fn(),
    checkPermissions: vi.fn(), requestPermissions: vi.fn()
  }
}));

const position = (latitude = -0.18): Position => ({
  timestamp: 1700000000000,
  coords: { latitude, longitude: -78.46, accuracy: 15,
    altitude: null, altitudeAccuracy: null, heading: null, speed: null }
}) as Position;

describe('LocationService', () => {
  let service: LocationService;
  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(false);
    vi.stubGlobal('isSecureContext', true);
    vi.stubGlobal('navigator', { geolocation: {} });
    vi.mocked(Geolocation.clearWatch).mockResolvedValue();
    service = new LocationService();
  });
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

  it('obtiene una posición sin exigir alta precisión en web', async () => {
    vi.mocked(Geolocation.getCurrentPosition).mockResolvedValue(position());
    await service.getCurrentLocation();
    expect(service.latitude()).toBe(-0.18);
    expect(service.accuracy()).toBe(15);
    expect(service.locating()).toBe(false);
    expect(Geolocation.getCurrentPosition).toHaveBeenCalledWith(
      expect.objectContaining({ enableHighAccuracy: false })
    );
  });

  it('muestra permisos denegados aunque el error no sea instanceof Error', async () => {
    vi.mocked(Geolocation.getCurrentPosition).mockRejectedValue({ code: 1, message: 'denied' });
    await service.getCurrentLocation();
    expect(service.error()).toContain('Permiso de ubicación denegado');
    expect(Geolocation.getCurrentPosition).toHaveBeenCalledTimes(1);
    expect(service.locating()).toBe(false);
  });

  it('reintenta una lectura que agota el tiempo y limpia el error al recuperar', async () => {
    vi.mocked(Geolocation.getCurrentPosition)
      .mockRejectedValueOnce({ code: 3 }).mockResolvedValueOnce(position());
    await service.getCurrentLocation();
    expect(Geolocation.getCurrentPosition).toHaveBeenCalledTimes(2);
    expect(service.error()).toBeNull();
    expect(service.latitude()).toBe(-0.18);
  });

  it('explica si ambos intentos agotan el tiempo', async () => {
    vi.mocked(Geolocation.getCurrentPosition).mockRejectedValue({ code: 3 });
    await service.getCurrentLocation();
    expect(service.error()).toContain('Se agotó el tiempo');
    expect(service.locating()).toBe(false);
  });

  it('no inicia dos observadores durante una solicitud pendiente', async () => {
    vi.mocked(Geolocation.watchPosition).mockResolvedValue('watch-1');
    await Promise.all([service.startTracking(), service.startTracking()]);
    expect(Geolocation.watchPosition).toHaveBeenCalledTimes(1);
  });

  it('detiene el observador y descarta callbacks tardíos sin borrar coordenadas', async () => {
    let callback!: Parameters<typeof Geolocation.watchPosition>[1];
    vi.mocked(Geolocation.watchPosition).mockImplementation(async (_options, cb) => {
      callback = cb;
      return 'watch-1';
    });
    await service.startTracking();
    callback(position(), undefined);
    await service.stopTracking();
    callback(position(10), undefined);
    callback(null, { code: 3, message: 'late timeout' });
    expect(Geolocation.clearWatch).toHaveBeenCalledWith({ id: 'watch-1' });
    expect(service.latitude()).toBe(-0.18);
    expect(service.tracking()).toBe(false);
    expect(service.error()).toBeNull();
    expect(service.status()).toContain('Seguimiento detenido');
  });

  it('limpia un observador que termina de registrarse después de Detener', async () => {
    let resolveWatch!: (id: string) => void;
    vi.mocked(Geolocation.watchPosition).mockReturnValue(new Promise(resolve => { resolveWatch = resolve; }));
    const start = service.startTracking();
    await Promise.resolve();
    await service.stopTracking();
    resolveWatch('late-watch');
    await start;
    expect(Geolocation.clearWatch).toHaveBeenCalledWith({ id: 'late-watch' });
    expect(service.tracking()).toBe(false);
  });

  it('permite reintentar Detener si clearWatch falla', async () => {
    vi.mocked(Geolocation.watchPosition).mockResolvedValue('watch-1');
    vi.mocked(Geolocation.clearWatch).mockRejectedValueOnce(new Error('failed')).mockResolvedValueOnce();
    await service.startTracking();
    await service.stopTracking();
    expect(service.tracking()).toBe(true);
    expect(service.error()).toContain('reintentar');
    await service.stopTracking();
    expect(Geolocation.clearWatch).toHaveBeenCalledTimes(2);
    expect(service.tracking()).toBe(false);
  });

  it('recupera el seguimiento después de un error transitorio', async () => {
    let callback!: Parameters<typeof Geolocation.watchPosition>[1];
    vi.mocked(Geolocation.watchPosition).mockImplementation(async (_options, cb) => {
      callback = cb; return 'watch-1';
    });
    await service.startTracking();
    callback(null, { code: 2 });
    expect(service.error()).toContain('posición');
    callback(position(), undefined);
    expect(service.error()).toBeNull();
    expect(service.status()).toBe('Seguimiento activo.');
  });

  it('rechaza contextos inseguros sin intentar obtener una posición', async () => {
    vi.stubGlobal('isSecureContext', false);
    await service.getCurrentLocation();
    expect(service.error()).toContain('localhost');
    expect(Geolocation.getCurrentPosition).not.toHaveBeenCalled();
  });

  it('comprueba permisos en una plataforma nativa', async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    vi.mocked(Geolocation.checkPermissions).mockResolvedValue({ location: 'prompt', coarseLocation: 'prompt' });
    vi.mocked(Geolocation.requestPermissions).mockResolvedValue({ location: 'granted', coarseLocation: 'granted' });
    vi.mocked(Geolocation.getCurrentPosition).mockResolvedValue(position());
    await service.getCurrentLocation();
    expect(Geolocation.requestPermissions).toHaveBeenCalledOnce();
    expect(Geolocation.getCurrentPosition).toHaveBeenCalledWith(
      expect.objectContaining({ enableHighAccuracy: true })
    );
  });
});
