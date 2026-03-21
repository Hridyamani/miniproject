import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { SidebarComponent } from '../../../components/sidebar/sidebar.component';
import { TopbarComponent } from '../../../components/topbar/topbar.component';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'web-home-going',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent, TopbarComponent],
  templateUrl: './home-going.component.html',
  styleUrls: ['./home-going.component.css']
})
export class HomeGoingComponent implements OnInit {
  activeTab = 'request';

  // Request Form
  leaveDate = '';
  time = '';
  place = '';
  reason = '';

  // Mark Form
  markDate = new Date().toISOString().split('T')[0];
  markTime = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  markPlace = '';
  
  minDate = '';

  loading = false;
  msg = '';
  msgType = '';
  records: any[] = [];

  constructor(private http: HttpClient, private auth: AuthService) {
    const tom = new Date();
    tom.setDate(tom.getDate() + 1);
    this.minDate = tom.toISOString().split('T')[0];
  }

  ngOnInit() {
    this.loadRecords();
  }

  get headers() {
    return { headers: new HttpHeaders({ Authorization: `Bearer ${this.auth.userValue?.token}` }) };
  }

  loadRecords() {
    this.http.get<any>('http://localhost:5000/api/student/home-going', this.headers).subscribe({
      next: res => this.records = res.homeGoings || [],
      error: () => { }
    });
  }

  submitRequest() {
    if (!this.leaveDate || !this.place) return;

    // Next day validation
    const selected = new Date(this.leaveDate);
    selected.setHours(0, 0, 0, 0);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    if (selected < tomorrow) {
      this.msg = 'Home-going request must be for tomorrow onwards.';
      this.msgType = 'error';
      return;
    }

    this.loading = true;
    this.msg = '';

    this.http.post('http://localhost:5000/api/student/home-going/request', {
      leaveDate: this.leaveDate,
      time: this.time,
      place: this.place,
      reason: this.reason
    }, this.headers).subscribe({
      next: (res: any) => {
        this.msg = res.message || 'Request submitted!';
        this.msgType = 'success';
        this.loading = false;
        this.clearForms();
        this.loadRecords();
      },
      error: err => {
        this.msg = err.error?.message || 'Failed.';
        this.msgType = 'error';
        this.loading = false;
      }
    });
  }

  submitMarking() {
    // Current time is always used for marking
    this.markDate = new Date().toISOString().split('T')[0];
    this.markTime = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

    if (!this.markPlace) return;
    this.loading = true;
    this.msg = '';

    this.http.post('http://localhost:5000/api/student/home-going/mark', {
      leaveDate: this.markDate,
      time: this.markTime,
      place: this.markPlace
    }, this.headers).subscribe({
      next: (res: any) => {
        this.msg = res.message || 'Home-going marked!';
        this.msgType = 'success';
        this.loading = false;
        this.clearForms();
        this.loadRecords();
      },
      error: err => {
        this.msg = err.error?.message || 'Failed.';
        this.msgType = 'error';
        this.loading = false;
      }
    });
  }

  cancelRequest(id: string) {
    const reason = prompt('Please provide a strict reason for cancellation:');
    if (!reason || reason.trim() === '') {
      alert('Cancellation reason is required.');
      return;
    }

    this.loading = true;
    this.http.post('http://localhost:5000/api/student/home-going/cancel', {
      requestId: id,
      cancelReason: reason
    }, this.headers).subscribe({
      next: (res: any) => {
        alert(res.message);
        this.loading = false;
        this.loadRecords();
      },
      error: err => {
        alert(err.error?.message || 'Failed to cancel request.');
        this.loading = false;
      }
    });
  }

  clearForms() {
    this.leaveDate = '';
    this.time = '';
    this.place = '';
    this.reason = '';
    this.markPlace = '';
    this.markDate = new Date().toISOString().split('T')[0];
    this.markTime = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  }

}
