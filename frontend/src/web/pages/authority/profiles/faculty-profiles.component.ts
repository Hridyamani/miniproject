import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { SidebarComponent } from '../../../components/sidebar/sidebar.component';
import { TopbarComponent } from '../../../components/topbar/topbar.component';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'web-faculty-profiles',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent, TopbarComponent],
  templateUrl: './faculty-profiles.component.html',
  styleUrls: ['./faculty-profiles.component.css']
})
export class FacultyProfilesComponent implements OnInit {
  faculty: any[] = [];
  filteredFaculty: any[] = [];
  search = '';

  constructor(private http: HttpClient, private auth: AuthService) { }

  get headers() {
    return { headers: new HttpHeaders({ Authorization: `Bearer ${this.auth.userValue?.token}` }) };
  }

  ngOnInit() { this.load(); }

  load() {
    this.http.get<any>('http://localhost:5000/api/authority/faculty', this.headers).subscribe({
      next: res => {
        this.faculty = res.faculty || [];
        this.filter();
      }
    });
  }

  filter() {
    const q = this.search.toLowerCase();
    this.filteredFaculty = this.faculty.filter(f =>
      (f.name?.toLowerCase().includes(q)) || 
      (f.department?.toLowerCase().includes(q)) || 
      (f.userId?.toLowerCase().includes(q))
    );
  }
}
