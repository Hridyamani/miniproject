import { Component, OnInit } from '@angular/core';

@Component({
    selector: 'web-root',
    templateUrl: './web.component.html',
    styleUrls: ['./web.component.css']
})
export class WebComponent implements OnInit {
    title = 'staysphere-frontend';
    locationAllowed: boolean = false;

    ngOnInit() {
        this.checkLocationPermission();
    }

    checkLocationPermission() {
        if (!navigator.geolocation) {
            alert("Geolocation is not supported by this browser.");
            return;
        }

        // Try to get position immediately to trigger prompt if not already decided
        navigator.geolocation.getCurrentPosition(
            () => {
                this.locationAllowed = true;
            },
            (error) => {
                this.locationAllowed = false;
                console.warn("Location access denied or error:", error.message);
            }
        );

        // Also use Permissions API if supported for better state tracking
        if ('permissions' in navigator) {
            navigator.permissions.query({ name: 'geolocation' as PermissionName }).then((result) => {
                if (result.state === 'granted') {
                    this.locationAllowed = true;
                }
                result.onchange = () => {
                    if (result.state === 'granted') {
                        this.locationAllowed = true;
                    } else {
                        this.locationAllowed = false;
                    }
                };
            });
        }
    }

    requestLocation() {
        this.checkLocationPermission();
    }
}
