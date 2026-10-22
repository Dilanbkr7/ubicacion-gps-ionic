import { Injectable, signal } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { Geolocation, Position } from '@capacitor/geolocation';

@Injectable({ providedIn: 'root' })
export class LocationService {
  readonly latitude = signal<number | null>(null);
  readonly longitude = signal<number | null>(null);
  readonly accuracy = signal<number | null>(null);
  readonly updatedAt = signal<number | null>(null);
  readonly error = signal<string | null>(null);
  readonly status = signal('Presiona «Obtener ubicación actual» para comenzar.');
  readonly tracking = signal(false);
  readonly locating = signal(false);
  readonly stopping = signal(false);
  readonly starting = signal(false);
  private watchId: string | null = null;
  private session = 0;

  async getCurrentLocation(): Promise<void> {
    if (this.locating() || this.tracking() || this.stopping() || this.starting()) return;
    this.locating.set(true);
    this.error.set(null);
    this.status.set('Obteniendo ubicación...');
    try {
      await this.ensurePermission();
      let position: Position;
      try {
        // En computadoras, exigir alta precisión puede agotar el tiempo.
        position = await Geolocation.getCurrentPosition({
          enableHighAccuracy: Capacitor.isNativePlatform(),
          timeout: 20000, maximumAge: 10000
        });
      } catch (err: unknown) {
        const code = this.errorDetails(err).code;
        if (![2, 3, 'OS-PLUG-GLOC-0010', 'OS-PLUG-GLOC-0002'].includes(code)) throw err;
        this.status.set('Reintentando con una ubicación aproximada...');
        position = await Geolocation.getCurrentPosition({
          enableHighAccuracy: false, timeout: 30000, maximumAge: 60000
        });
      }
      this.applyPosition(position);
      this.status.set('Ubicación obtenida correctamente.');
    } catch (err: unknown) {
      this.error.set(this.describeError(err));
      this.status.set('No se pudo actualizar la ubicación.');
    } finally {
      this.locating.set(false);
    }
  }

  async startTracking(): Promise<void> {
    if (this.tracking() || this.locating() || this.stopping() || this.starting()) return;
    const session = ++this.session;
    this.starting.set(true);
    this.tracking.set(true);
    this.error.set(null);
    this.status.set('Iniciando seguimiento...');
    try {
      await this.ensurePermission();
      if (session !== this.session) return;
      const id = await Geolocation.watchPosition({
        enableHighAccuracy: Capacitor.isNativePlatform(),
        timeout: 30000, maximumAge: 10000
      }, (position, err) => {
        // Descarta respuestas que lleguen después de pulsar Detener.
        if (session !== this.session || !this.tracking()) return;
        if (err) {
          this.error.set(this.describeError(err));
          this.status.set('Seguimiento activo, esperando una ubicación válida.');
        } else if (position) {
          this.applyPosition(position);
          this.status.set('Seguimiento activo.');
        }
      });
      if (session !== this.session) {
        await this.releaseWatch(id);
      } else {
        this.watchId = id;
      }
    } catch (err: unknown) {
      if (session === this.session) {
        this.tracking.set(false);
        this.error.set(this.describeError(err));
        this.status.set('No se pudo iniciar el seguimiento.');
      }
    } finally {
      this.starting.set(false);
    }
  }

  async stopTracking(): Promise<void> {
    if (this.stopping()) return;
    ++this.session;
    this.tracking.set(false);
    this.error.set(null);
    this.status.set('Seguimiento detenido. Las últimas coordenadas se conservan.');
    const id = this.watchId;
    this.watchId = null;
    if (id !== null) await this.releaseWatch(id);
  }

  private async releaseWatch(id: string): Promise<void> {
    this.stopping.set(true);
    try {
      await Geolocation.clearWatch({ id });
    } catch {
      this.watchId = id;
      this.tracking.set(true);
      this.error.set('No se pudo cerrar el seguimiento. Pulsa «Detener seguimiento» para reintentar.');
    } finally {
      this.stopping.set(false);
    }
  }

  async clearLocation(): Promise<void> {
    if (this.locating()) return;
    await this.stopTracking();
    if (this.tracking()) return;
    this.latitude.set(null);
    this.longitude.set(null);
    this.accuracy.set(null);
    this.updatedAt.set(null);
    this.status.set('Coordenadas borradas.');
  }

  private applyPosition(position: Position): void {
    this.latitude.set(position.coords.latitude);
    this.longitude.set(position.coords.longitude);
    this.accuracy.set(position.coords.accuracy);
    this.updatedAt.set(position.timestamp);
    this.error.set(null);
  }

  private async ensurePermission(): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      if (!globalThis.isSecureContext) throw new Error('Abre la aplicación desde localhost o una dirección HTTPS.');
      if (!navigator.geolocation) throw new Error('Este navegador no dispone de geolocalización.');
      return;
    }
    let permission = await Geolocation.checkPermissions();
    if (permission.location !== 'granted' && permission.coarseLocation !== 'granted') {
      permission = await Geolocation.requestPermissions();
    }
    if (permission.location !== 'granted' && permission.coarseLocation !== 'granted') {
      throw new Error('Debes conceder el permiso de ubicación en los ajustes de la aplicación.');
    }
  }

  private errorDetails(err: unknown): { code: string | number; message: string } {
    if (typeof err !== 'object' || err === null) return { code: '', message: String(err ?? '') };
    const detail = err as { code?: string | number; message?: string };
    return { code: detail.code ?? '', message: detail.message ?? '' };
  }

  private describeError(err: unknown): string {
    const { code, message } = this.errorDetails(err);
    if (code === 1 || code === 'OS-PLUG-GLOC-0003') {
      return 'Permiso de ubicación denegado. Permite el acceso en el navegador y en los ajustes de ubicación del equipo.';
    }
    if (code === 2 || code === 'OS-PLUG-GLOC-0002' || code === 'OS-PLUG-GLOC-0007') {
      return 'El equipo no pudo determinar tu posición. Comprueba que la ubicación del sistema esté activada y vuelve a intentarlo.';
    }
    if (code === 3 || code === 'OS-PLUG-GLOC-0010') {
      return 'Se agotó el tiempo de espera. Comprueba la ubicación del sistema y vuelve a intentarlo; conceder permiso no garantiza que el equipo encuentre una posición.';
    }
    return message || 'No se pudo obtener la ubicación. Revisa la ubicación del sistema y los permisos del navegador.';
  }
}
