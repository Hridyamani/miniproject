import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { SidebarComponent } from '../../../components/sidebar/sidebar.component';
import { TopbarComponent } from '../../../components/topbar/topbar.component';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'web-user-management',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, SidebarComponent, TopbarComponent],
  templateUrl: './user-management.component.html',
  styleUrls: ['./user-management.component.css']
})
export class UserManagementComponent implements OnInit {
  users: any[] = [];
  filtered: any[] = [];
  search = '';
  roleFilter = '';
  showModal = false;
  editMode = false;
  editId = '';
  userForm: FormGroup;
  saving = false;
  saveError = '';
  showViewModal = false;
  selectedUser: any = null;
  
  // Dynamic lists for dropdowns (Task 7)
  departments: string[] = [];
  hostelNames: string[] = [];
  
  authorityRoles = ['Warden', 'Resident Tutor', 'Hostel Secretary', 'Mess Secretary', 'Floor Secretary', 'Wing Secretary'];

  constructor(private fb: FormBuilder, private http: HttpClient, private auth: AuthService) {
    this.userForm = this.fb.group({
      userId: [{ value: '', disabled: true }, Validators.required],
      name: ['', Validators.required],
      role: ['student', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', Validators.required],
      password: [''],
      // Common extended fields
      department: [''],
      dateOfBirth: [''],
      bloodGroup: [''],
      hostelName: [''],
      collegeName: [''],
      // Student fields
      admissionNo: [''],
      roomNumber: [''],
      semester: [''],
      dateOfAdmission: [''],
      guardiansName: [''],
      guardiansPhone: [''],
      address: [''],
      authorityRole: ['']
    });

    // Auto-generate User ID
    this.userForm.get('role')?.valueChanges.subscribe(() => this.updateGeneratedUserId());
    this.userForm.get('phone')?.valueChanges.subscribe(() => this.updateGeneratedUserId());
    this.userForm.get('admissionNo')?.valueChanges.subscribe(() => this.updateGeneratedUserId());
  }

  updateGeneratedUserId() {
    if (this.editMode) return;
    const role = this.userForm.get('role')?.value;
    const phone = this.userForm.get('phone')?.value || '';
    const admissionNo = this.userForm.get('admissionNo')?.value || '';

    let generatedId = '';
    if (role === 'student') {
      if (admissionNo) generatedId = `STU-${admissionNo}`;
    } else if (role === 'faculty') {
      if (phone.length >= 4) generatedId = `FAC-${phone.slice(-4)}`;
    } else if (role === 'authority') {
      if (phone.length >= 4) generatedId = `AUTH-${phone.slice(-4)}`;
    } else if (role === 'admin') {
      if (phone.length >= 4) generatedId = `ADM-${phone.slice(-4)}`;
    }

    this.userForm.get('userId')?.setValue(generatedId);
  }


  ngOnInit() { this.loadUsers(); }

  get headers() {
    return { headers: new HttpHeaders({ Authorization: `Bearer ${this.auth.userValue?.token}` }) };
  }

  loadUsers() {
    const q = this.roleFilter ? `?role=${this.roleFilter}` : '';
    this.http.get<any>(`http://localhost:5000/api/admin/users${q}`, this.headers).subscribe({
      next: r => { 
        this.users = r.users || []; 
        this.filterUsers();
        this.extractUniqueValues();
      },
      error: () => { }
    });
  }

  extractUniqueValues() {
    this.departments = [...new Set(this.users.map(u => u.department).filter(d => d))].sort();
    this.hostelNames = [...new Set(this.users.map(u => u.hostelName).filter(h => h))].sort();
  }

  addDepartment() {
    const dept = prompt('Enter new department name:');
    if (dept) {
      const upper = dept.toUpperCase();
      if (!this.departments.includes(upper)) this.departments.push(upper);
      this.userForm.get('department')?.setValue(upper);
    }
  }

  addHostel() {
    const hostel = prompt('Enter new hostel name:');
    if (hostel) {
      const upper = hostel.toUpperCase();
      if (!this.hostelNames.includes(upper)) this.hostelNames.push(upper);
      this.userForm.get('hostelName')?.setValue(upper);
    }
  }

  filterUsers() {
    const s = this.search.toLowerCase();
    this.filtered = this.users.filter(u =>
      (!this.roleFilter || u.role === this.roleFilter) &&
      (!s || u.name?.toLowerCase().includes(s) || u.userId?.toLowerCase().includes(s) || u.email?.toLowerCase().includes(s))
    );
  }

  openAddModal() {
    this.editMode = false;
    this.editId = '';
    this.userForm.reset({ role: 'student' });
    this.userForm.get('password')?.setValidators(Validators.required);
    this.userForm.get('userId')?.disable();
    this.saveError = '';
    this.showModal = true;
  }

  openEdit(u: any) {
    this.editMode = true;
    this.editId = u._id;
    this.userForm.patchValue(u);
    // Format dates for input[type=date]
    if (u.dateOfBirth) {
      this.userForm.patchValue({ dateOfBirth: new Date(u.dateOfBirth).toISOString().split('T')[0] });
    }
    if (u.dateOfAdmission) {
      this.userForm.patchValue({ dateOfAdmission: new Date(u.dateOfAdmission).toISOString().split('T')[0] });
    }
    this.userForm.get('password')?.clearValidators();
    this.userForm.get('userId')?.disable();
    this.saveError = '';
    this.showModal = true;
  }


  saveUser() {
    if (this.userForm.invalid) return;
    this.saving = true;
    this.saveError = '';
    const data = this.userForm.getRawValue();

    const req = this.editMode
      ? this.http.put(`http://localhost:5000/api/admin/users/${this.editId}`, data, this.headers)
      : this.http.post('http://localhost:5000/api/admin/users/create', data, this.headers);

    req.subscribe({
      next: () => {
        this.showModal = false;
        this.saving = false;
        this.loadUsers();
      },
      error: err => {
        this.saveError = err.error?.message || 'Failed to save user.';
        this.saving = false;
      }
    });
  }

  viewUser(u: any) {
    this.selectedUser = u;
    this.showViewModal = true;
  }

  archiveUser(id: string) {
    if (!confirm('Are you sure you want to archive this user? This will move them to the archived student store.')) return;
    this.http.post(`http://localhost:5000/api/admin/users/${id}/archive`, {}, this.headers).subscribe({
      next: () => this.loadUsers(),
      error: () => alert('Failed to archive user.')
    });
  }
}
