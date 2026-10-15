import { Injectable, signal } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';

@Injectable({
  providedIn: 'root'
})
export class LocationService {
  latitude = signal<number | null>(null);
  longitude = signal<number | null>(null);

  error = signal<string | null>(null);
  status = signal<string>('Position update is unavailable');
  tracking = signal<boolean>(false);

  private watchId: string | null = null;

  async getCurrentLocation(): Promise<void> {
    try {
      this.error.set(null);
      this.status.set('Obteniendo ubicación...');

      // Los permisos se comprueban aquí para dispositivos nativos.
      // En el navegador, Geolocation gestiona el permiso directamente.
      if (Capacitor.isNativePlatform()) {
        let permission = await Geolocation.checkPermissions();

        if (
          permission.location !== 'granted' &&
          permission.coarseLocation !== 'granted'
        ) {
          permission = await Geolocation.requestPermissions();
        }

        if (
          permission.location !== 'granted' &&
          permission.coarseLocation !== 'granted'
        ) {
          throw new Error('Debes conceder el permiso de ubicación.');
        }
      }

      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 0
      });

      this.latitude.set(position.coords.latitude);
      this.longitude.set(position.coords.longitude);
      this.status.set('Ubicación actualizada correctamente');
    } catch (err: unknown) {
      this.handleError(err);
    }
  }

  async startTracking(): Promise<void> {
    if (this.watchId !== null) {
      return;
    }

    try {
      this.error.set(null);
      this.status.set('Iniciando seguimiento...');

      if (Capacitor.isNativePlatform()) {
        let permission = await Geolocation.checkPermissions();

        if (
          permission.location !== 'granted' &&
          permission.coarseLocation !== 'granted'
        ) {
          permission = await Geolocation.requestPermissions();
        }

        if (
          permission.location !== 'granted' &&
          permission.coarseLocation !== 'granted'
        ) {
          throw new Error('Debes conceder el permiso de ubicación.');
        }
      }

      this.tracking.set(true);

      this.watchId = await Geolocation.watchPosition(
        {
          enableHighAccuracy: true,
          timeout: 20000,
          maximumAge: 0
        },
        (position, err) => {
          if (err) {
            this.error.set(err.message || 'No se pudo actualizar la ubicación.');
            this.status.set('Position update is unavailable');
            return;
          }

          if (position) {
            this.latitude.set(position.coords.latitude);
            this.longitude.set(position.coords.longitude);
            this.error.set(null);
            this.status.set('Seguimiento activo');
          }
        }
      );
    } catch (err: unknown) {
      this.tracking.set(false);
      this.handleError(err);
    }
  }

  async stopTracking(): Promise<void> {
    if (this.watchId !== null) {
      try {
        await Geolocation.clearWatch({ id: this.watchId });
      } catch {
        this.error.set('No se pudo detener el seguimiento.');
      }

      this.watchId = null;
    }

    this.tracking.set(false);
    this.status.set('Seguimiento detenido');
  }

  clearLocation(): void {
    this.latitude.set(null);
    this.longitude.set(null);
    this.error.set(null);
    this.status.set('Position update is unavailable');
  }

  private handleError(err: unknown): void {
    const message =
      err instanceof Error
        ? err.message
        : 'No se pudo obtener la ubicación.';

    this.error.set(message);
    this.status.set('Position update is unavailable');
  }
}