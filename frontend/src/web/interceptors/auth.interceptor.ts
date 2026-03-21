import { Injectable } from '@angular/core';
import { HttpRequest, HttpHandler, HttpEvent, HttpInterceptor } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from '../services/auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private authService: AuthService) { }

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const user = this.authService.userValue;
    // Add Auth token
    if (user && user.token) {
      request = request.clone({
        setHeaders: {
          Authorization: `Bearer ${user.token}`
        }
      });
    }

    // Rewrite localhost URLs to production apiUrl if necessary
    if (request.url.includes('http://localhost:5000/api')) {
      const newUrl = request.url.replace('http://localhost:5000/api', this.authService.apiUrl);
      request = request.clone({ url: newUrl });
    }

    return next.handle(request);
  }
}
