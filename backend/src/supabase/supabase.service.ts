import { Injectable, Logger } from '@nestjs/common';
import { SupabaseClient, createClient } from '@supabase/supabase-js';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SupabaseService {
  private supabaseClient: SupabaseClient;
  private readonly logger = new Logger(SupabaseService.name);
  private readonly url: string;
  private readonly key: string;

  constructor(private configService: ConfigService) {
    const url = this.configService.get<string>('SUPABASE_URL');
    const key =
      this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY') ||
      this.configService.get<string>('SUPABASE_KEY');

    if (!url || !key) {
      this.logger.error('Supabase URL or Key is missing in .env!');
      throw new Error('Missing Supabase configurations');
    }

    this.url = url;
    this.key = key;
    this.supabaseClient = createClient(url, key);
  }

  getClient(): SupabaseClient {
    return this.supabaseClient;
  }

  getUserClient(token?: string): SupabaseClient {
    if (!token) return this.supabaseClient;

    return createClient(this.url, this.key, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
      auth: {
        persistSession: false,
      },
    });
  }
}
