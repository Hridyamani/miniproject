import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  public apiUrl = window.location.hostname === 'localhost' 
    ? 'http://localhost:5000/api' 
    : '/api';
  private userSubject = new BehaviorSubject<any>(this.getUserFromStorage());
  public user$ = this.userSubject.asObservable();

  constructor(private http: HttpClient) { }

  private getUserFromStorage() {
    const user = localStorage.getItem('staySphereUser');
    return user ? JSON.parse(user) : null;
  }

  get userValue() {
    return this.userSubject.value;
  }

  login(credentials: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/login`, credentials).pipe(
      tap((res: any) => {
        const userData = { ...res.user, token: res.token };
        localStorage.setItem('staySphereUser', JSON.stringify(userData));
        this.userSubject.next(userData);
      })
    );
  }

  registerAdmin(userData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/register-admin`, userData);
  }

  forgotPassword(email: string, userId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/forgot-password`, { email, userId });
  }

  resetPassword(token: string, password: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/reset-password/${token}`, { password });
  }

  logout() {
    localStorage.removeItem('staySphereUser');
    this.userSubject.next(null);
  }

  isLoggedIn(): boolean {
    return !!this.userValue;
  }

  getRole(): string | null {
    return this.userValue?.role || null;
  }
  private productionUrl = 'https://staysphere-n5z3.onrender.com';
}
