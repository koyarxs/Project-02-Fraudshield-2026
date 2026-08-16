const PHOTO_STORAGE_KEY = 'fraudshield_profile_photo';
const PHOTO_REMOVED_KEY = 'fraudshield_profile_photo_removed';
const PHOTO_UPDATED_EVENT = 'fraudshield:profile-photo-updated';

function canUseBrowserStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function notifyPhotoChange() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(PHOTO_UPDATED_EVENT));
  }
}

export const profilePhotoService = {
  get(defaultPhoto?: string) {
    if (!canUseBrowserStorage()) {
      return defaultPhoto ?? null;
    }

    const storedPhoto = window.localStorage.getItem(PHOTO_STORAGE_KEY);
    const wasRemoved = window.localStorage.getItem(PHOTO_REMOVED_KEY) === 'true';

    if (storedPhoto) {
      return storedPhoto;
    }

    return wasRemoved ? null : (defaultPhoto ?? null);
  },

  save(dataUrl: string) {
    if (!canUseBrowserStorage()) {
      return;
    }

    window.localStorage.setItem(PHOTO_STORAGE_KEY, dataUrl);
    window.localStorage.removeItem(PHOTO_REMOVED_KEY);
    notifyPhotoChange();
  },

  remove() {
    if (!canUseBrowserStorage()) {
      return;
    }

    window.localStorage.removeItem(PHOTO_STORAGE_KEY);
    window.localStorage.setItem(PHOTO_REMOVED_KEY, 'true');
    notifyPhotoChange();
  },

  subscribe(callback: () => void) {
    if (typeof window === 'undefined') {
      return () => undefined;
    }

    const handleChange = () => callback();

    window.addEventListener(PHOTO_UPDATED_EVENT, handleChange);
    window.addEventListener('storage', handleChange);

    return () => {
      window.removeEventListener(PHOTO_UPDATED_EVENT, handleChange);
      window.removeEventListener('storage', handleChange);
    };
  },
};
