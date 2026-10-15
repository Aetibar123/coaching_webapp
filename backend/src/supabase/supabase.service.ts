import { Injectable, Logger } from '@nestjs/common';
import { SupabaseClient, createClient } from '@supabase/supabase-js';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SupabaseService {
  private supabaseClient: SupabaseClient;
  private readonly logger = new Logger(SupabaseService.name);

  constructor(private configService: ConfigService) {
    const url = this.configService.get<string>('SUPABASE_URL');
    const key = this.configService.get<string>('SUPABASE_KEY');

    if (!url || !key) {
      this.logger.error('Supabase URL or Key is missing in .env!');
      throw new Error('Missing Supabase configurations');
    }

    this.supabaseClient = createClient(url, key);
  }
  getClient(): SupabaseClient {
    return this.supabaseClient;
  }
}
