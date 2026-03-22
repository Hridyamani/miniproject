import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class StudentService {
  private api = 'http://localhost:5000/api/student';

  constructor(private http: HttpClient) {}

  getProfile(): Observable<any> {
    return this.http.get(`${this.api}/profile`);
  }

  updateProfile(data: any): Observable<any> {
    return this.http.put(`${this.api}/profile`, data);
  }

  getAttendance(month?: number, year?: number): Observable<any> {
    const params: any = {};
    if (month !== undefined) params.month = month;
    if (year !== undefined) params.year = year;
    return this.http.get(`${this.api}/attendance`, { params });
  }

  applyMessCut(data: any): Observable<any> {
    return this.http.post(`${this.api}/mess-cuts`, data);
  }

  getMessCuts(): Observable<any> {
    return this.http.get(`${this.api}/mess-cuts`);
  }

  markOutgoing(data: any): Observable<any> {
    return this.http.post(`${this.api}/outgoings`, data);
  }

  getOutgoings(): Observable<any> {
    return this.http.get(`${this.api}/outgoings`);
  }

  markHomeGoing(data: any): Observable<any> {
    return this.http.post(`${this.api}/home-goings`, data);
  }

  getHomeGoings(): Observable<any> {
    return this.http.get(`${this.api}/home-goings`);
  }

  markReturn(data: any): Observable<any> {
    return this.http.post(`${this.api}/mark-return`, data);
  }

  getNotifications(): Observable<any> {
    return this.http.get(`${this.api}/notifications`);
  }

  getCurrentPosition(): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 10000
      });
    });
  }

  calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000;
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(Δφ/2)**2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  }
}
