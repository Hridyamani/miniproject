import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { SidebarComponent } from '../../../components/sidebar/sidebar.component';
import { TopbarComponent } from '../../../components/topbar/topbar.component';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'web-outgoing',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent, TopbarComponent],
  templateUrl: './outgoing.component.html',
  styleUrls: ['./outgoing.component.css']
})
export class OutgoingComponent implements OnInit {
  date = new Date().toISOString().split('T')[0];
  timeLeaving = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

  place = '';
  loading = false;
  msg = '';
  msgType = '';
  records: any[] = [];

  constructor(private http: HttpClient, private auth: AuthService) { }

  ngOnInit() {
    this.loadRecords();
  }

  get headers() {
    return { headers: new HttpHeaders({ Authorization: `Bearer ${this.auth.userValue?.token}` }) };
  }

  get hasActiveOutgoing(): boolean {
    return this.records.some(r => r.status === 'active');
  }

  loadRecords() {
    this.http.get<any>('http://localhost:5000/api/student/outgoing', this.headers).subscribe({
      next: res => this.records = res.outgoings || [],
      error: () => { }
    });
  }

  submitMarking() {
    if (!this.date || !this.timeLeaving || !this.place) return;

    if (this.hasActiveOutgoing) {
      this.msg = 'You already have an active outgoing. Please mark your return first.';
      this.msgType = 'error';
      return;
    }

    this.loading = true;
    this.msg = '';

    this.http.post('http://localhost:5000/api/student/outgoing', {
      date: this.date,
      timeLeaving: this.timeLeaving,
      place: this.place
    }, this.headers).subscribe({
      next: (res: any) => {
        this.msg = res.message || 'Outgoing recorded!';
        this.msgType = 'success';
        this.loading = false;
        this.timeLeaving = '';
        this.place = '';
        this.loadRecords();
      },
      error: err => {
        this.msg = err.error?.message || 'Failed to record.';
        this.msgType = 'error';
        this.loading = false;
      }
    });
  }
}
