import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, catchError, of, switchMap, tap, throwError } from 'rxjs';
import { TokenService } from './token.service';
import { Router } from '@angular/router';
import { ProfileService } from './profile.service';
import { FirebaseNotificationService } from './firebase-notification.service';

const API = 'https://pick2win.io/backend/api';
type FantasyGame = 'sorare' | 'draftkings' | 'fanduel';

const httpOptions = {
  headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
};

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private loggedInSubject = new BehaviorSubject<boolean>(false);
  loggedIn$ = this.loggedInSubject.asObservable();

  constructor(
    private http: HttpClient,
    private tokenService: TokenService,
    private router: Router,
    private profileService: ProfileService,
    private notificationService: FirebaseNotificationService
  ) {
    this.loggedInSubject.next(this.isLoggedIn());
  }

  login(email: string, password: string): Observable<any> {
    return this.http.post<any>(
      API + '/user/user-auth/login',
      {
        email: email,
        password: password,
      },
      httpOptions
    ).pipe(
      tap(res => {
        console.log('login:', res);

        const token = res?.token || res?.accessToken || res?.data?.token || res?.data?.accessToken;

        if (token && res?.success !== false) {
          this.tokenService.saveToken(token);
          this.loggedInSubject.next(true);
        }
      })
    );
  }

  getUserMyTeams(matchId: number | string, game: FantasyGame): Observable<any> {
    return this.getUserMyTeamsByPaths(matchId, this.myTeamsGamePaths(game));
  }

  private getUserMyTeamsByPaths(matchId: number | string, paths: string[]): Observable<any> {
    const [path, ...fallbackPaths] = paths;
    const url = `${API}/user/teams/user-my-teams/${matchId}/${path}`;

    console.log('My Teams API URL:', url);

    return this.http.get<any>(url).pipe(
      switchMap(res => {
        if (fallbackPaths.length && this.isEmptyTeamsResponse(res)) {
          return this.getUserMyTeamsByPaths(matchId, fallbackPaths);
        }

        return of(res);
      }),
      catchError(error => fallbackPaths.length
        ? this.getUserMyTeamsByPaths(matchId, fallbackPaths)
        : throwError(() => error)
      )
    );
  }

  private myTeamsGamePaths(game: FantasyGame): string[] {
    const paths: Record<FantasyGame, string[]> = {
      sorare: ['sorare'],
      draftkings: ['draftkings', 'draftking', 'draft-kings', 'dk'],
      fanduel: ['fanduel', 'fan-duel', 'fan_duel', 'FanDuel']
    };

    return paths[game];
  }

  private isEmptyTeamsResponse(res: any): boolean {
    const candidateLists = [
      res,
      res?.teams,
      res?.generated_teams,
      res?.generatedTeams,
      res?.lineups,
      res?.data,
      res?.data?.teams,
      res?.data?.generated_teams,
      res?.data?.generatedTeams,
      res?.data?.lineups,
      res?.team_a,
      res?.team_b
    ];

    return !candidateLists.some(value => Array.isArray(value) && value.length > 0);
  }

  buyCoins(data: {
    plan_id: number;
    amount: number;
    coins: number;
  }): Observable<any> {
    return this.http.post<any>(`${API}/user/deposite/buy-coins`, data, this.authOptions());
  }

  verifyRazorpayPayment(data: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
    plan_id: number;
    coins: number;
    amount: number;
  }): Observable<any> {
    return this.http.post<any>(`${API}/user/deposite/verify-payment`, data, this.authOptions());
  }

  getRazorpayConfig(): Observable<any> {
    return this.http.get<any>(`${API}/user/deposite/razorpay/config`, this.authOptions());
  }

  logout() {
    const token = this.tokenService.getToken();
    const logoutOptions = token
      ? {
          headers: new HttpHeaders({
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          })
        }
      : httpOptions;

    this.clearSession();

    this.http.post(API + '/user/user-auth/logout', {}, logoutOptions).subscribe({
      next: (res) => {
        console.log('logout:', res);
      },
      error: (err) => {
        console.log('logout error:', err);
      }
    });
  }

  private clearSession() {
    this.tokenService.clear();
    localStorage.removeItem('user');
    localStorage.removeItem('currentUser');
    localStorage.removeItem('pick2win_user');
    sessionStorage.clear();
    this.profileService.clearProfile();
    this.notificationService.clearSession();
    this.loggedInSubject.next(false);
    this.router.navigate(['/'], { replaceUrl: true });
  }

  isLoggedIn(): boolean {
    return !!this.tokenService.getToken();
  }

  private authOptions() {
    const token = this.tokenService.getToken();

    return token
      ? {
          headers: new HttpHeaders({
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          })
        }
      : httpOptions;
  }
}
