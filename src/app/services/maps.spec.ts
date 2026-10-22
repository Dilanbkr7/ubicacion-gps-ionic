import { describe, it, expect } from 'vitest';
import { directionsUrl, locationUrl } from './maps';

describe('enlaces de Google Maps', () => {
  it('preserva coordenadas cero y signos negativos', () => {
    const url = new URL(locationUrl(0, -78.46));
    expect(url.origin).toBe('https://www.google.com');
    expect(url.searchParams.get('api')).toBe('1');
    expect(url.searchParams.get('query')).toBe('0,-78.46');
  });

  it('codifica un destino con espacios y caracteres especiales', () => {
    const url = new URL(directionsUrl(-0.18, -78.46, 'Parque & plaza #1, Quito'));
    expect(url.pathname).toBe('/maps/dir/');
    expect(url.searchParams.get('origin')).toBe('-0.18,-78.46');
    expect(url.searchParams.get('destination')).toBe('Parque & plaza #1, Quito');
    expect(url.searchParams.get('travelmode')).toBe('driving');
  });
});
