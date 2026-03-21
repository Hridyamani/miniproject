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
  selectedIds: Set<string> = new Set();

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
        this.selectedIds.clear();
      },
      error: () => this.loading = false
    });
  }

  // Selection Logic
  toggleAll(event: any) {
    if (event.target.checked) {
      this.archives.forEach(a => this.selectedIds.add(a._id));
    } else {
      this.selectedIds.clear();
    }
  }

  toggleSelection(id: string) {
    if (this.selectedIds.has(id)) {
      this.selectedIds.delete(id);
    } else {
      this.selectedIds.add(id);
    }
  }

  isAllSelected() {
    return this.archives.length > 0 && this.selectedIds.size === this.archives.length;
  }

  restoreEntry(id: string) {
    if (!confirm('Restore this user to the active records?')) return;
    this.http.post(`http://localhost:5000/api/admin/archives/${id}/restore`, {}, this.headers).subscribe({
      next: () => this.loadArchives(),
      error: err => alert(err.error?.message || 'Restore failed')
    });
  }

  deleteEntry(id: string) {
    if (!confirm('Permanently delete this archive entry? This cannot be undone.')) return;
    this.http.delete(`http://localhost:5000/api/admin/archives/${id}`, this.headers).subscribe({
      next: () => this.loadArchives()
    });
  }

  bulkRestore() {
    if (this.selectedIds.size === 0) return;
    if (!confirm(`Restore ${this.selectedIds.size} selected users?`)) return;

    const ids = Array.from(this.selectedIds);
    this.http.post<any>('http://localhost:5000/api/admin/archives/bulk-restore', { ids }, this.headers).subscribe({
      next: r => {
        alert(r.message);
        this.loadArchives();
      },
      error: err => alert(err.error?.message || 'Bulk restore failed')
    });
  }

  bulkDelete() {
    if (this.selectedIds.size === 0) return;
    const count = this.selectedIds.size;
    const typed = prompt(`To permanently delete ${count} archived records, type "DELETE":`);
    if (typed !== 'DELETE') return;

    const ids = Array.from(this.selectedIds);
    this.http.post<any>('http://localhost:5000/api/admin/archives/bulk-delete', { ids }, this.headers).subscribe({
      next: r => {
        alert(r.message);
        this.loadArchives();
      },
      error: err => alert(err.error?.message || 'Bulk delete failed')
    });
  }
}
