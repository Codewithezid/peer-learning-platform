import api from './api';

export async function hasAdminAccess(): Promise<boolean> {
  try {
    await api.get('/admin/access');
    return true;
  } catch {
    return false;
  }
}
