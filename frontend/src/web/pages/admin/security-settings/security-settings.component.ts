import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { SidebarComponent } from '../../../components/sidebar/sidebar.component';
import { TopbarComponent } from '../../../components/topbar/topbar.component';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'web-security-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent, TopbarComponent],
  templateUrl: './security-settings.component.html',
  styleUrls: ['./security-settings.component.css']
})
export class SecuritySettingsComponent implements OnInit {
  email = '';
  password = '';
  latitude = 0;
  longitude = 0;
  returnRadius = 100;
  minMessCutDays = 3;
  openTime = '06:00';
  closeTime = '21:30';
  foodPreferenceStartDate = '';
  foodPreferenceEndDate = '';
  foodPreferenceDurationMonths = 3;
  transferUserId = '';
  loading = false;
  transferLoading = false;
  msg = '';
  msgType = '';

  constructor(private http: HttpClient, private auth: AuthService) {
    this.email = this.auth.userValue?.email || '';
  }

  ngOnInit() {
    this.loadHostelSettings();
  }

  get headers() {
    return new HttpHeaders({ Authorization: `Bearer ${this.auth.userValue?.token}` });
  }

  loadHostelSettings() {
    this.http.get<any>('http://localhost:5000/api/admin/hostel-settings', { headers: this.headers }).subscribe({
      next: (res) => {
        if (res.settings) {
          this.latitude = res.settings.locationCoordinates?.latitude || 0;
          this.longitude = res.settings.locationCoordinates?.longitude || 0;
          this.returnRadius = res.settings.returnRadius || 100;
          this.minMessCutDays = res.settings.minMessCutDays || 3;
          this.openTime = res.settings.openTime || '06:00';
          this.closeTime = res.settings.closeTime || '21:30';
          if (res.settings.foodPreferenceWindow) {
            this.foodPreferenceStartDate = res.settings.foodPreferenceWindow.startDate ? res.settings.foodPreferenceWindow.startDate.split('T')[0] : '';
            this.foodPreferenceEndDate = res.settings.foodPreferenceWindow.endDate ? res.settings.foodPreferenceWindow.endDate.split('T')[0] : '';
            this.foodPreferenceDurationMonths = res.settings.foodPreferenceWindow.durationMonths || 3;
          }
        }
      },
      error: () => { }
    });
  }

  saveSettings() {
    this.loading = true;
    this.msg = '';

    const body: any = {
      locationCoordinates: { latitude: this.latitude, longitude: this.longitude },
      returnRadius: this.returnRadius,
      minMessCutDays: this.minMessCutDays,
      openTime: this.openTime,
      closeTime: this.closeTime,
      foodPreferenceWindow: {
        startDate: this.foodPreferenceStartDate || null,
        endDate: this.foodPreferenceEndDate || null,
        durationMonths: this.foodPreferenceDurationMonths
      }
    };


    if (this.email) body.email = this.email;
    if (this.password) body.password = this.password;

    this.http.put('http://localhost:5000/api/admin/security-settings', body, { headers: this.headers }).subscribe({
      next: (res: any) => {
        this.msg = res.message || 'Settings updated successfully';
        this.msgType = 'success';
        this.loading = false;
        this.password = '';
      },
      error: (err) => {
        this.msg = err.error?.message || 'Failed to update settings';
        this.msgType = 'error';
        this.loading = false;
      }
    });
  }

  transferAdmin() {
    if (!this.transferUserId) return;
    if (!confirm(`Are you sure you want to transfer admin role to "${this.transferUserId}"? You will be demoted to faculty. This cannot be undone.`)) return;

    this.transferLoading = true;
    this.msg = '';

    this.http.post('http://localhost:5000/api/admin/transfer-admin', { newAdminUserId: this.transferUserId }, { headers: this.headers }).subscribe({
      next: (res: any) => {
        this.msg = res.message || 'Admin transferred!';
        this.msgType = 'success';
        this.transferLoading = false;
        // Log out since user is no longer admin
        setTimeout(() => {
          this.auth.logout();
          window.location.href = '/login';
        }, 2000);
      },
      error: (err) => {
        this.msg = err.error?.message || 'Failed to transfer admin';
        this.msgType = 'error';
        this.transferLoading = false;
      }
    });
  }
}
