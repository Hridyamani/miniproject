import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthorityService {
  private apiUrl = 'http://localhost:5000/api/authority';

  constructor(private http: HttpClient) { }

  getRooms(): Observable<any> {
    return this.http.get(`${this.apiUrl}/rooms`);
  }

  addRoom(room: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/rooms`, room);
  }

  assignStudent(studentId: string, roomId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/rooms/assign`, { studentId, roomId });
  }

  vacateRoom(studentId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/rooms/vacate`, { studentId });
  }

  getUnallocatedStudents(): Observable<any> {
    return this.http.get(`${this.apiUrl}/rooms/unallocated`);
  }

  runAutoAllocate(strategy: string, block?: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/rooms/auto-allocate`, { strategy, block });
  }

  getAllocationStats(): Observable<any> {
    return this.http.get(`${this.apiUrl}/rooms/allocation-stats`);
  }

  getWaitlist(): Observable<any> {
    return this.http.get(`${this.apiUrl}/rooms/waitlist`);
  }

  getSummary(): Observable<any> {
    return this.http.get(`${this.apiUrl}/summary`);
  }

  getPendingRequests(): Observable<any> {
    return this.http.get(`${this.apiUrl}/requests`);
  }

  updateHomeGoing(id: string, status: string, remarks?: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/home-going/${id}`, { status, remarks });
  }

  updateMessCut(id: string, status: string, remarks?: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/mess-cut/${id}`, { status, remarks });
  }
}
