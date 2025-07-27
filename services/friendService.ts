import { supabase } from '../lib/supabase';

/**
 * Search for users by username or name, excluding current user and already friends/pending requests.
 * @param {string} search - The search string.
 * @param {string} currentUserId - The current user's profile id.
 * @param {string[]} excludeIds - Array of profile ids to exclude (already friends or pending).
 */
export async function searchUsers(search: string, currentUserId: string, excludeIds: string[] = []) {
  let query = supabase
    .from('profiles')
    .select('*')
    .or(`username.ilike.%${search}%,display_name.ilike.%${search}%`)
    .neq('id', currentUserId);
  if (excludeIds.length > 0) {
    query = query.not('id', 'in', `(${excludeIds.join(',')})`);
  }
  return await query;
}

/**
 * Send a friend request from current user to target user.
 * @param {string} currentUserId - The sender's profile id.
 * @param {string} targetUserId - The receiver's profile id.
 */
export async function sendFriendRequest(currentUserId: string, targetUserId: string) {
  const { error } = await supabase
    .from('friends')
    .insert([
      { user_id: currentUserId, friend_id: targetUserId, status: 'pending' }
    ]);
  // Fetch sender's display name or username
  const { data: senderProfile } = await supabase
    .from('profiles')
    .select('display_name, username')
    .eq('id', currentUserId)
    .single();
  const senderName = senderProfile?.display_name || senderProfile?.username || 'Someone';
  // Send push notification to recipient
  await sendFriendRequestPushNotification(targetUserId, senderName);
  return { error };
}

/**
 * Send a push notification to the recipient when a friend request is sent.
 * @param {string} recipientId - The user ID of the friend request recipient.
 * @param {string} senderName - The display name or username of the sender.
 */
export async function sendFriendRequestPushNotification(recipientId: string, senderName: string) {
  // Fetch the recipient's push token
  const { data: recipient, error } = await supabase
    .from('profiles')
    .select('expo_push_token')
    .eq('id', recipientId)
    .single();
  if (error || !recipient?.expo_push_token) {
    console.error('Error fetching recipient push token:', error);
    return;
  }
  // Send the push notification
  await fetch('https://shrxvavaoijxtivhixfk.functions.supabase.co/send-push-notification', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // 'Authorization': `Bearer ${userJWT}`,
    },
    body: JSON.stringify({
      to: recipient.expo_push_token,
      title: 'New Friend Request',
      body: `${senderName} sent you a friend request!`,
      data: { type: 'friend_request' },
    }),
  });
}

/**
 * Get incoming friend requests for the current user.
 * @param {string} currentUserId - The current user's profile id.
 */
export async function getIncomingFriendRequests(currentUserId: string) {
  return await supabase
    .from('friends')
    .select('*, sender:profiles!friends_user_id_fkey(*)')
    .eq('friend_id', currentUserId)
    .eq('status', 'pending');
}

/**
 * Accept a friend request by request id.
 * @param {string} requestId - The id of the friend request row.
 */
export async function acceptFriendRequest(requestId: string) {
  return await supabase
    .from('friends')
    .update({ status: 'accepted' })
    .eq('id', requestId);
}

/**
 * Decline a friend request by request id.
 * @param {string} requestId - The id of the friend request row.
 */
export async function declineFriendRequest(requestId: string) {
  return await supabase
    .from('friends')
    .update({ status: 'declined' })
    .eq('id', requestId);
}

/**
 * Get the current user's friends (accepted status).
 * @param {string} currentUserId - The current user's profile id.
 */
export async function getFriendsList(currentUserId: string) {
  // Get all accepted friendships where the user is either the sender or receiver
  return await supabase
    .from('friends')
    .select('*, sender:profiles!friends_user_id_fkey(*), receiver:profiles!friends_friend_id_fkey(*)')
    .eq('status', 'accepted')
    .or(`user_id.eq.${currentUserId},friend_id.eq.${currentUserId}`);
}

/**
 * Get outgoing friend requests for the current user.
 * @param {string} currentUserId - The current user's profile id.
 */
export async function getOutgoingFriendRequests(currentUserId: string) {
  return await supabase
    .from('friends')
    .select('*, receiver:profiles!friends_friend_id_fkey(*)')
    .eq('user_id', currentUserId)
    .eq('status', 'pending');
}

/**
 * Pin or unpin a friend by id.
 * @param {string} friendId - The id of the friend row.
 * @param {boolean} pinned - Whether to pin (true) or unpin (false).
 */
export async function setFriendPinned(friendId: string, pinned: boolean) {
  return await supabase
    .from('friends')
    .update({ pinned })
    .eq('id', friendId);
} 