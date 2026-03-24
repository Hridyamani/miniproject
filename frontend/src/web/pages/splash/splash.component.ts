import { Component } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'web-splash',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './splash.component.html',
  styleUrls: ['./splash.component.css']
})
export class SplashComponent {
  constructor(private router: Router) { }

  getStarted() {
    this.router.navigate(['/login']);
  }

}
