import { HttpClient } from '@angular/common/http';
import { afterNextRender, Inject, Injectable } from '@angular/core';
import { User } from '../models/user.model';
import { Subject } from 'rxjs';
import { Router } from '@angular/router';
import { PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  // private url: string = 'https://apisi51.vercel.app/users/';
  //private url: string = 'http://localhost:3000/users/';
  private url: string = environment.api + 'users/';
  private authStatusListener = new Subject<boolean>();

  private isAuthenticated = false;
  private token: string | null = '';
  private tokenTimer: any;

  private isBrowser!: boolean;

  loginListener() {
    return this.authStatusListener.asObservable();
  }

  constructor(
    @Inject(PLATFORM_ID) platformId: Object,
    public http: HttpClient,
    private router: Router
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  login(email: string, password: string) {
    const user: User = {
      _id: null,
      email: email,
      password: password,
    };

    console.log(user);

    this.http
      .post<{ token: string; expiresIn: number }>(this.url + 'login', user)
      .subscribe(
        (response) => {
          const token = response.token;
          this.token = token;
          if (token) {
            const expiresInDuration = response.expiresIn;
            this.setAuthTimer(expiresInDuration);
            this.isAuthenticated = true;
            this.authStatusListener.next(true);
            const now = new Date();
            const expirationDate = new Date(
              now.getTime() + expiresInDuration * 1000
            );
            console.log(expirationDate);
            this.saveAuthData(token, expirationDate);
            this.router.navigate(['/admin/buku']).then(() => {
              window.location.reload();
            });
          }
        },
        (error) => {
          this.authStatusListener.next(false);
        }
      );
  }

  getToken() {
    return this.token;
  }

  getIsAuth() {
    return this.isAuthenticated;
  }

  private saveAuthData(token: string, expirationDate: Date) {
    localStorage.setItem('token', token);
    localStorage.setItem('expiration', expirationDate.toISOString());
  }

  private clearAuthData() {
    localStorage.removeItem('token');
    localStorage.removeItem('expiration');
  }

  private getAuthData() {
    let token = null;
    let expirationDate = null;

    if (this.isBrowser) {
      token = localStorage.getItem('token');
      expirationDate = localStorage.getItem('expiration');
    }

    //console.log(token);
    if (!token || !expirationDate) {
      return;
    }
    return {
      token: token,
      expirationDate: new Date(expirationDate),
    };
  }

  autoAuthUser() {
    const authInformation = this.getAuthData();

    if (!authInformation) {
      return;
    }

    const now = new Date();
    const expiresIn = authInformation.expirationDate.getTime() - now.getTime();

    if (expiresIn > 0) {
      this.token = authInformation.token;
      this.isAuthenticated = true;
      this.setAuthTimer(expiresIn / 1000);
      this.authStatusListener.next(true);
      this.router.navigate(['/admin/buku']);
    }
  }

  logout() {
    this.token = null;
    this.isAuthenticated = false;
    this.authStatusListener.next(false);
    clearTimeout(this.tokenTimer);
    this.clearAuthData();
    this.router.navigate(['/login']);
  }

  private setAuthTimer(duration: number) {
    console.log('Setting timer: ' + duration);
    this.tokenTimer = setTimeout(() => {
      this.logout();
    }, duration * 1000);
  }
}
