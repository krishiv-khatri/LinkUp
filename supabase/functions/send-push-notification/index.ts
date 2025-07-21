import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

serve(async (req) => {
  // Parse the request body
  const { to, title, body, data } = await req.json();

  // Expo push notification API endpoint
  const expoUrl = 'https://exp.host/--/api/v2/push/send';

  // Send the push notification
  const response = await fetch(expoUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify([{
      to, // Expo push token
      title,
      body,
      data,
      sound: 'default',
      priority: 'high',
    }]),
  });

  const result = await response.json();

  return new Response(JSON.stringify(result), {
    headers: { 'Content-Type': 'application/json' },
    status: 200,
  });
});