import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { SidebarComponent } from '../../../components/sidebar/sidebar.component';
import { TopbarComponent } from '../../../components/topbar/topbar.component';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'web-mess-cut',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent, TopbarComponent],
  templateUrl: './mess-cut.component.html',
  styleUrls: ['./mess-cut.component.css']
})
export class MessCutComponent implements OnInit {
  startDate = '';
  endDate = '';
  minDate = '';
  loading = false;
  msg = '';
  msgType = '';
  records: any[] = [];

  constructor(private http: HttpClient, private auth: AuthService) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    this.minDate = tomorrow.toISOString().split('T')[0];
  }

  ngOnInit() {
    this.loadRecords();
  }

  get headers() {
    return { headers: new HttpHeaders({ Authorization: `Bearer ${this.auth.userValue?.token}` }) };
  }

  loadRecords() {
    this.http.get<any>('http://localhost:5000/api/student/mess-cut', this.headers).subscribe({
      next: res => this.records = res.messCuts || [],
      error: () => { }
    });
  }

  submitRequest() {
    if (!this.startDate || !this.endDate) return;

    // Check overlaps
    const start = new Date(this.startDate);
    const end = new Date(this.endDate);
    const overlap = this.records.find(r => {
      if (r.status === 'rejected') return false;
      const rStart = new Date(r.startDate);
      const rEnd = new Date(r.endDate);
      return start <= rEnd && end >= rStart;
    });

    if (overlap) {
      this.msg = `Overlaps with existing record (${new Date(overlap.startDate).toLocaleDateString()} to ${new Date(overlap.endDate).toLocaleDateString()})`;
      this.msgType = 'error';
      return;
    }

    this.loading = true;
    this.msg = '';

    this.http.post('http://localhost:5000/api/student/mess-cut', {
      startDate: this.startDate,
      endDate: this.endDate
    }, this.headers).subscribe({
      next: (res: any) => {
        this.msg = res.message || 'Request submitted successfully!';
        this.msgType = 'success';
        this.loading = false;
        this.startDate = '';
        this.endDate = '';
        this.loadRecords();
      },
      error: err => {
        this.msg = err.error?.message || 'Submission failed.';
        this.msgType = 'error';
        this.loading = false;
      }
    });
  }
}
