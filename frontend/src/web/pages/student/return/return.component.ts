import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { SidebarComponent } from '../../../components/sidebar/sidebar.component';
import { TopbarComponent } from '../../../components/topbar/topbar.component';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'web-return',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent, TopbarComponent],
  templateUrl: './return.component.html',
  styleUrls: ['./return.component.css']
})
export class ReturnComponent implements OnInit {
  lat: number | null = null;
  lng: number | null = null;
  located = false;
  locating = false;
  type = 'outgoing';
  selectedId = '';
  returnDate = new Date().toISOString().split('T')[0];
  returnTime = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  pendingRecords: any[] = [];
  returnHistory: any[] = [];
  loading = false;
  msg = '';
  msgType = '';

  constructor(private http: HttpClient, private auth: AuthService) { }

  ngOnInit() {
    this.loadPendingRecords();
  }

  get headers() {
    return { headers: new HttpHeaders({ Authorization: `Bearer ${this.auth.userValue?.token}` }) };
  }

  getLocation() {
    if ('geolocation' in navigator) {
      this.locating = true;
      this.msg = '';
      navigator.geolocation.getCurrentPosition(
        pos => {
          this.lat = parseFloat(pos.coords.latitude.toFixed(4));
          this.lng = parseFloat(pos.coords.longitude.toFixed(4));
          this.located = true;
          this.locating = false;
        },
        err => {
          this.msg = 'Location access denied or timed out. Please allow GPS to mark return.';
          this.msgType = 'error';
          this.locating = false;
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
      );
    } else {
      this.msg = 'Geolocation not supported.';
      this.msgType = 'error';
    }
  }

  loadPendingRecords() {
    const endpoint = this.type === 'outgoing' ? 'outgoing' : 'home-going';
    this.selectedId = '';
    this.msg = '';

    this.http.get<any>(`http://localhost:5000/api/student/${endpoint}`, this.headers).subscribe({
      next: r => {
        const all = r.outgoings || r.homeGoings || [];
        this.pendingRecords = all.filter((x: any) => (x.status === 'active' || x.status === 'approved') && !x.isReturned);
        this.returnHistory = all.filter((x: any) => x.status === 'returned' || x.isReturned).slice(0, 5);
      },
      error: () => { }
    });
  }

  markReturn() {
    if (!this.located || !this.selectedId) return;
    this.loading = true;
    this.msg = '';

    this.http.post<any>('http://localhost:5000/api/student/return', {
      type: this.type,
      requestId: this.selectedId,
      latitude: this.lat,
      longitude: this.lng
    }, this.headers).subscribe({
      next: res => {
        this.msg = res.message || 'Hostel Return Confirmed !';
        this.msgType = 'success';
        this.loading = false;
        this.selectedId = '';
        this.loadPendingRecords();
      },
      error: err => {
        this.msg = err.error?.message || 'Hostel Return marking failed.';
        this.msgType = 'error';
        this.loading = false;
      }
    });
  }
}
