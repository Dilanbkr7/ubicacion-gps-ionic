import { Component, inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';

import { IonHeader } from '@ionic/angular/ion-header';
import { IonToolbar } from '@ionic/angular/ion-toolbar';
import { IonTitle } from '@ionic/angular/ion-title';
import { IonContent } from '@ionic/angular/ion-content';
import { IonCard } from '@ionic/angular/ion-card';
import { IonCardHeader } from '@ionic/angular/ion-card-header';
import { IonCardTitle } from '@ionic/angular/ion-card-title';
import { IonCardContent } from '@ionic/angular/ion-card-content';
import { IonButton } from '@ionic/angular/ion-button';
import { IonText } from '@ionic/angular/ion-text';

import { LocationService } from '../services/location/location.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonButton,
    IonText
  ]
})
export class HomePage implements OnDestroy {
  private locationService = inject(LocationService);

  latitude = this.locationService.latitude;
  longitude = this.locationService.longitude;
  error = this.locationService.error;
  status = this.locationService.status;
  tracking = this.locationService.tracking;

  async getLocation(): Promise<void> {
    await this.locationService.getCurrentLocation();
  }

  async startTracking(): Promise<void> {
    await this.locationService.startTracking();
  }

  async stopTracking(): Promise<void> {
    await this.locationService.stopTracking();
  }

  clearLocation(): void {
    this.locationService.clearLocation();
  }

  ngOnDestroy(): void {
    void this.locationService.stopTracking();
  }
}