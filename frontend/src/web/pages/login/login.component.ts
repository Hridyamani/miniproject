import { Component, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'web-login',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup;
  isLoading = false;
  errorMessage = '';
  showPassword = false;

  showForgotModal = false;
  resetUserId = '';
  resetEmail = '';
  resetMsg = '';
  isResetError = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.loginForm = this.fb.group({
      userId: ['', Validators.required],
      password: ['', Validators.required]
    });
  }

  ngOnInit() {
    // Role is no longer selected beforehand
  }

  onSubmit() {
    if (this.loginForm.valid) {
      this.isLoading = true;
      this.errorMessage = '';
      this.authService.login(this.loginForm.value).subscribe({
        next: (res: any) => {
          const role = res.user?.role || 'student';
          this.router.navigate([`/${role}`]);
        },
        error: (err) => {
          this.errorMessage = err.error?.message || 'Invalid User ID or Password.';
          this.isLoading = false;
        }
      });
    }
  }

  onForgotSubmit() {
    this.authService.forgotPassword(this.resetEmail, this.resetUserId).subscribe({
      next: (res: any) => {
        this.resetMsg = res.message || 'Check your inbox! We sent a reset link.';
        this.isResetError = false;
      },
      error: (err) => {
        this.resetMsg = err.error?.message || 'Email not found.';
        this.isResetError = true;
      }
    });
  }

}
