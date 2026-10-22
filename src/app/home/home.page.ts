import { Component, computed, inject, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonHeader } from '@ionic/angular/ion-header';
import { IonToolbar } from '@ionic/angular/ion-toolbar';
import { IonTitle } from '@ionic/angular/ion-title';
import { IonContent } from '@ionic/angular/ion-content';
import { IonCard } from '@ionic/angular/ion-card';
import { IonCardHeader } from '@ionic/angular/ion-card-header';
import { IonCardTitle } from '@ionic/angular/ion-card-title';
import { IonCardContent } from '@ionic/angular/ion-card-content';
import { IonButton } from '@ionic/angular/ion-button';
import { LocationService } from '../services/location/location.service';
import { TextFileService } from '../services/text-file.service';
import { directionsUrl, locationUrl } from '../services/maps';

@Component({
  selector: 'app-home', templateUrl: './home.page.html', styleUrls: ['./home.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonHeader, IonToolbar, IonTitle, IonContent,
    IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonButton]
})
export class HomePage implements OnDestroy {
  private readonly location = inject(LocationService);
  private readonly files = inject(TextFileService);
  readonly latitude = this.location.latitude;
  readonly longitude = this.location.longitude;
  readonly accuracy = this.location.accuracy;
  readonly updatedAt = this.location.updatedAt;
  readonly error = this.location.error;
  readonly status = this.location.status;
  readonly tracking = this.location.tracking;
  readonly locating = this.location.locating;
  readonly stopping = this.location.stopping;
  readonly starting = this.location.starting;
  readonly destination = signal('Parque La Carolina, Quito, Ecuador');
  readonly fileMessage = signal('');
  readonly fileError = signal(false);
  readonly saving = signal(false);
  readonly hasLocation = computed(() => this.latitude() !== null && this.longitude() !== null);
  readonly mapUrl = computed(() => this.hasLocation() ? locationUrl(this.latitude()!, this.longitude()!) : '');
  readonly routeUrl = computed(() => this.hasLocation() && this.destination().trim()
    ? directionsUrl(this.latitude()!, this.longitude()!, this.destination().trim()) : '');

  async getLocation(): Promise<void> { await this.location.getCurrentLocation(); }
  async startTracking(): Promise<void> { await this.location.startTracking(); }
  async stopTracking(): Promise<void> { await this.location.stopTracking(); }
  async clearLocation(): Promise<void> {
    await this.location.clearLocation();
    this.fileMessage.set('');
  }
  async saveLocation(): Promise<void> { await this.save('ubicacion', this.mapUrl()); }
  async saveRoute(): Promise<void> { await this.save('ruta', this.routeUrl()); }

  private async save(type: string, url: string): Promise<void> {
    if (!url || this.saving()) return;
    this.saving.set(true);
    this.fileError.set(false);
    this.fileMessage.set('Guardando archivo...');
    try {
      this.fileMessage.set(await this.files.save(`${type}-${Date.now()}.txt`, url + '\n'));
    } catch (err: unknown) {
      this.fileError.set(true);
      this.fileMessage.set(err instanceof Error ? err.message : 'No se pudo guardar el archivo.');
    } finally {
      this.saving.set(false);
    }
  }

  ionViewWillLeave(): void { void this.location.stopTracking(); }
  ngOnDestroy(): void { void this.location.stopTracking(); }
}
