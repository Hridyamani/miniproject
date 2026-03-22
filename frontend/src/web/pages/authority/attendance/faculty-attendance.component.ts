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
  history: any[] = [];
  reportDate = new Date().toISOString().split('T')[0];
  loading = false;
  saving = false;

  constructor(private http: HttpClient, private auth: AuthService) { }

  ngOnInit() {
    this.loadFaculty();
    this.loadHistory();
  }

  get headers() {
    return { headers: new HttpHeaders({ Authorization: `Bearer ${this.auth.userValue?.token}` }) };
  }

  loadFaculty() {
    this.loading = true;
    this.http.get<any>('http://localhost:5000/api/authority/faculty', this.headers).subscribe({
      next: res => {
        this.faculty = res.faculty || [];
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  loadHistory() {
    const d = new Date(this.reportDate);
    const m = d.getMonth() + 1;
    const y = d.getFullYear();
    this.http.get<any>(`http://localhost:5000/api/authority/reports?month=${m}&year=${y}`, this.headers).subscribe({
      next: res => {
        // Filter attendance to show only faculty logic.
        this.history = (res.attendance || []).filter((a: any) => 
          (a.student && a.student.role === 'faculty') || 
          (a.role === 'faculty') ||
          (a.studentName && a.studentName.toLowerCase().includes('faculty')) // Fallback
        );
      }
    });
  }
}
