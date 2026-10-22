export function locationUrl(latitude: number, longitude: number): string {
  return `https://www.google.com/maps/search/?${new URLSearchParams({
    api: '1', query: `${latitude},${longitude}`
  })}`;
}

export function directionsUrl(latitude: number, longitude: number, destination: string): string {
  return `https://www.google.com/maps/dir/?${new URLSearchParams({
    api: '1', origin: `${latitude},${longitude}`, destination, travelmode: 'driving'
  })}`;
}
