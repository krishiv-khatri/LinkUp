import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://shrxvavaoijxtivhixfk.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNocnh2YXZhb2lqeHRpdmhpeGZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTExMDkyNjQsImV4cCI6MjA2NjY4NTI2NH0.DT3pqiD0lZslUpdNfUWU3K343sSPnXF1vnFcFiMXys4';

export const supabase = createClient(supabaseUrl, supabaseAnonKey); 