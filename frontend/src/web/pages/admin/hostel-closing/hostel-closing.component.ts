import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { SidebarComponent } from '../../../components/sidebar/sidebar.component';
import { TopbarComponent } from '../../../components/topbar/topbar.component';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'web-hostel-closing',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent, TopbarComponent],
  templateUrl: './hostel-closing.component.html',
  styleUrls: ['./hostel-closing.component.css']
})
export class HostelClosingComponent implements OnInit {
  history: any[] = [];
  startDate = '';
  endDate = '';
  reason = '';
  saving = false;
  role = this.auth.userValue?.role || 'admin';

  constructor(private http: HttpClient, private auth: AuthService) { }

  ngOnInit() {
    this.loadHistory();
  }

  get headers() {
    return { headers: new HttpHeaders({ Authorization: `Bearer ${this.auth.userValue?.token}` }) };
  }

  loadHistory() {
    this.http.get<any>('http://localhost:5000/api/admin/hostel-closing', this.headers).subscribe({
      next: res => {
        this.history = res.history || [];
      }
    });
  }

  markClosing() {
    if (!this.startDate || !this.endDate || !this.reason) return;
    this.saving = true;
    const body = { startDate: this.startDate, endDate: this.endDate, reason: this.reason };
    this.http.post('http://localhost:5000/api/admin/hostel-closing', body, this.headers).subscribe({
      next: () => {
        this.saving = false;
        this.startDate = '';
        this.endDate = '';
        this.reason = '';
        this.loadHistory();
      },
      error: (err) => {
        this.saving = false;
        alert(err.error?.message || 'Failed to save closing dates');
      }
    });
  }

  deleteRecord(id: string) {
    if (!confirm('Are you sure you want to remove this record?')) return;
    this.http.delete(`http://localhost:5000/api/admin/hostel-closing/${id}`, this.headers).subscribe({
      next: () => this.loadHistory()
    });
  }
}
