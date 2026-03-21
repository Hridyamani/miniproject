import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { SidebarComponent } from '../../../components/sidebar/sidebar.component';
import { TopbarComponent } from '../../../components/topbar/topbar.component';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'web-archive',
  standalone: true,
  imports: [CommonModule, SidebarComponent, TopbarComponent],
  templateUrl: './archive.component.html',
  styleUrls: ['./archive.component.css']
})
export class ArchiveComponent implements OnInit {
  archives: any[] = [];
  loading = false;

  constructor(private http: HttpClient, private auth: AuthService) { }

  ngOnInit() {
    this.loadArchives();
  }

  get headers() {
    return { headers: new HttpHeaders({ Authorization: `Bearer ${this.auth.userValue?.token}` }) };
  }

  loadArchives() {
    this.loading = true;
    this.http.get<any>('http://localhost:5000/api/admin/archives', this.headers).subscribe({
      next: res => {
        this.archives = res.archives || [];
        this.loading = false;
      },
      error: () => this.loading = false
    });
  }

  deleteEntry(id: string) {
    if (!confirm('Permanently delete this archive entry? This cannot be undone.')) return;
    this.http.delete(`http://localhost:5000/api/admin/archives/${id}`, this.headers).subscribe({
      next: () => this.loadArchives()
    });
  }
}
