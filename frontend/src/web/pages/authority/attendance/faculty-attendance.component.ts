import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { SidebarComponent } from '../../../components/sidebar/sidebar.component';
import { TopbarComponent } from '../../../components/topbar/topbar.component';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'web-faculty-attendance',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent, TopbarComponent],
  templateUrl: './faculty-attendance.component.html',
  styleUrls: ['./faculty-attendance.component.css']
})
export class FacultyAttendanceComponent implements OnInit {
  faculty: any[] = [];
  selectedDate = new Date().toISOString().split('T')[0];
  loading = false;
  saving = false;

  constructor(private http: HttpClient, private auth: AuthService) { }

  ngOnInit() {
    this.loadFaculty();
  }

  get headers() {
    return { headers: new HttpHeaders({ Authorization: `Bearer ${this.auth.userValue?.token}` }) };
  }

  loadFaculty() {
    this.loading = true;
    this.http.get<any>('http://localhost:5000/api/authority/faculty', this.headers).subscribe({
      next: res => {
        this.faculty = (res.faculty || []).map((f: any) => ({ ...f, status: 'present' }));
        this.loading = false;
      },
      error: () => {
        alert('Failed to load faculty');
        this.loading = false;
      }
    });
  }

  submitAttendance() {
    if (!confirm(`Mark attendance for ${this.faculty.length} faculty on ${this.selectedDate}?`)) return;
    this.saving = true;
    const body = {
      date: this.selectedDate,
      attendance: this.faculty.map(f => ({ student: f._id, status: f.status }))
    };

    this.http.post('http://localhost:5000/api/authority/attendance', body, this.headers).subscribe({
      next: () => {
        alert('Attendance submitted successfully');
        this.saving = false;
      },
      error: err => {
        alert(err.error?.message || 'Failed to submit attendance');
        this.saving = false;
      }
    });
  }
}
