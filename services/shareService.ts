import { Share } from 'react-native';
import { slugService } from './slugService';

export const shareService = {
  // Share an event
  async shareEvent(event: any) {
    try {
      // Ensure event has a slug
      if (!event.shareable_slug) {
        const slug = await slugService.generateEventSlug(event.title);
        // Update the event with the slug
        await slugService.updateEventSlug(event.id, slug);
        event.shareable_slug = slug;
      }

      const url = `https://linkup.app/event/${event.shareable_slug}`;
      const message = `Check out this event: ${event.title}\n\n${url}`;
      
      await Share.share({
        message,
        url,
        title: `Share ${event.title}`
      });
    } catch (error) {
      console.error('Error sharing event:', error);
    }
  },

  // Share a profile
  async shareProfile(profile: any) {
    try {
      // Ensure profile has a slug
      if (!profile.shareable_slug) {
        const slug = await slugService.generateProfileSlug(profile.username, profile.display_name);
        // Update the profile with the slug
        await slugService.updateProfileSlug(profile.id, slug);
        profile.shareable_slug = slug;
      }

      const url = `https://linkup.app/profile/${profile.shareable_slug}`;
      const message = `Check out ${profile.display_name || profile.username}'s profile on LinkUp!\n\n${url}`;
      
      await Share.share({
        message,
        url,
        title: `Share ${profile.display_name || profile.username}'s Profile`
      });
    } catch (error) {
      console.error('Error sharing profile:', error);
    }
  },

  // Generate shareable link for an event (without opening share sheet)
  async getEventShareLink(event: any): Promise<string> {
    try {
      if (!event.shareable_slug) {
        const slug = await slugService.generateEventSlug(event.title);
        await slugService.updateEventSlug(event.id, slug);
        event.shareable_slug = slug;
      }
      return `https://linkup.app/event/${event.shareable_slug}`;
    } catch (error) {
      console.error('Error generating event share link:', error);
      return '';
    }
  },

  // Generate shareable link for a profile (without opening share sheet)
  async getProfileShareLink(profile: any): Promise<string> {
    try {
      if (!profile.shareable_slug) {
        const slug = await slugService.generateProfileSlug(profile.username, profile.display_name);
        await slugService.updateProfileSlug(profile.id, slug);
        profile.shareable_slug = slug;
      }
      return `https://linkup.app/profile/${profile.shareable_slug}`;
    } catch (error) {
      console.error('Error generating profile share link:', error);
      return '';
    }
  }
};
