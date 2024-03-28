import { OAuth2Client } from 'google-auth-library';
import { google } from 'googleapis';
import keys from './credentials/google_client_secret.json' assert { type: 'json' };
import express from 'express';
import { jwtService } from './JwtService.js';

type AuthState = 'login' | 'signup';

export class GoogleOAuth2Client {
  private oauth2Client: OAuth2Client;

  constructor(redirectPath: string) {
    const redirectUri = this.getRedirectURL(redirectPath);
    if (!redirectUri) throw Error('Not finded redirectUri');

    this.oauth2Client = new google.auth.OAuth2({
      clientId: keys.web.client_id,
      clientSecret: keys.web.client_secret,
      redirectUri,
    });

    this.oauth2Client.on('tokens', async (tokens) => {
      if (tokens.refresh_token) {
        console.log('reflesh token:', tokens.refresh_token);
      }
      // 새로운 토큰을 가져올때 필요한 작업이 있으면 여기 콜백 함수에 추가
      // 이 이벤트 리스너를 설정하지 않아도 액세스 토큰은 자동으로 갱신된다.
    });
  }

  getRedirectURL(redirectPath: string): string | undefined {
    return keys.web.redirect_uris.find((uri: string) =>
      uri.endsWith(redirectPath)
    );
  }

  // code 요청 url 생성
  generateAuthUrl(state: AuthState): string {
    const scopes = [
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
    ];

    const url = this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      state,
    });

    return url;
  }

  // 구글 서버에서 받은 code를 이용 access token 가져와 클라이언트에 셋팅
  async getAccessToken(code: string): Promise<void> {
    const { tokens } = await this.oauth2Client.getToken(code);

    // OAuth2 클라이언트를 생성할 때 `refresh_token`을 포함한 인증 정보를 설정해야 토큰 만료 시 자동 갱신이 이루어 진다.
    this.oauth2Client.setCredentials(tokens);
  }

  // access token으로 사용자 정보 가져오기(name, email)
  async getUserInfo(): Promise<any> {
    const oauth2 = google.oauth2({
      auth: this.oauth2Client,
      version: 'v2',
    });

    const response = await oauth2.userinfo.get();
    return response.data;
  }
}
