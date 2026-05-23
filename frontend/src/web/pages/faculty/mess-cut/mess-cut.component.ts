import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { SidebarComponent } from '../../../components/sidebar/sidebar.component';
import { TopbarComponent } from '../../../components/topbar/topbar.component';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'web-faculty-mess-cut',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent, TopbarComponent],
  templateUrl: './mess-cut.component.html',
  styleUrls: ['./mess-cut.component.css']
})
export class FacultyMessCutComponent implements OnInit {
  user: any;
  messCutHistory: any[] = [];
  messCutForm = { startDate: '', endDate: '' };
  minDate = '';

  constructor(private http: HttpClient, private auth: AuthService) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    this.minDate = tomorrow.toISOString().split('T')[0];
  }

  ngOnInit() {
    this.user = this.auth.userValue;
    this.loadMessCuts();
  }

  get headers() {
    return { headers: new HttpHeaders({ Authorization: `Bearer ${this.auth.userValue?.token}` }) };
  }

  loadMessCuts() {
    this.http.get<any>('http://localhost:5000/api/faculty/mess-cut', this.headers).subscribe({
      next: (res) => this.messCutHistory = res.history || []
    });
  }

  submitMessCut() {
    if (!this.messCutForm.startDate || !this.messCutForm.endDate) return alert('Please select dates');

    const start = new Date(this.messCutForm.startDate);
    const end = new Date(this.messCutForm.endDate);

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    if (start < tomorrow) {
      return alert('Mess cut can only start from tomorrow onwards.');
    }

    if (start >= end) {
      return alert('Start date must be before end date.');
    }

    // Check overlaps
    const overlap = this.messCutHistory.find(r => {
      if (r.status === 'rejected') return false;
      const rStart = new Date(r.startDate);
      const rEnd = new Date(r.endDate);
      return start <= rEnd && end >= rStart;
    });

    if (overlap) {
      return alert(`Overlap detected: ${new Date(overlap.startDate).toLocaleDateString()} to ${new Date(overlap.endDate).toLocaleDateString()}`);
    }

    this.http.post('http://localhost:5000/api/faculty/mess-cut', this.messCutForm, this.headers).subscribe({
      next: () => {
        this.messCutForm = { startDate: '', endDate: '' };
        this.loadMessCuts();
      },
      error: (err) => alert(err.error?.message || 'Submission failed')
    });
  }

  calculateDays(start: string, end: string): number {
    const s = new Date(start);
    const e = new Date(end);
    const diffTime = Math.abs(e.getTime() - s.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  }
}
