// src/supabase.js
import { createClient } from '@supabase/supabase-js';
const supabaseUrl = 'https://mhbicscnduqbmghtkkxr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oYmljc2NuZHVxYm1naHRra3hyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM5MjY5NTAsImV4cCI6MjA3OTUwMjk1MH0.1JjIJS6pN0O5A96Cvh4NSNSDjgI3DOMFTQV9Yt6srVI';
export const supabase = createClient(supabaseUrl, supabaseKey);