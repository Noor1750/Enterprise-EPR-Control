export const getCompanyName = () => {
  return localStorage.getItem('erp_company_name') || 'SML Trims';
};

export const setCompanyName = (name: string) => {
  localStorage.setItem('erp_company_name', name);
};

export const getErpName = () => {
  return localStorage.getItem('erp_system_name') || 'Enterprise ERP';
};

export const setErpName = (name: string) => {
  localStorage.setItem('erp_system_name', name);
};

export const getErpIcon = (): string | null => {
  return localStorage.getItem('erp_custom_animated_icon') || null;
};

export const setErpIcon = (dataUrl: string): void => {
  localStorage.setItem('erp_custom_animated_icon', dataUrl);
  window.dispatchEvent(new CustomEvent('erp-icon-changed', { detail: { icon: dataUrl } }));
};

export const removeErpIcon = (): void => {
  localStorage.removeItem('erp_custom_animated_icon');
  window.dispatchEvent(new CustomEvent('erp-icon-changed', { detail: { icon: null } }));
};

export const getErpIconAnimation = (): string => {
  return localStorage.getItem('erp_icon_animation_style') || 'pulse';
};

export const setErpIconAnimation = (anim: string): void => {
  localStorage.setItem('erp_icon_animation_style', anim);
  window.dispatchEvent(new CustomEvent('erp-icon-anim-changed', { detail: { anim } }));
};

export const DEFAULT_ADMIN_DELETE_PASSWORD = '123456';

export const getAdminDeletePassword = (): string => {
  return localStorage.getItem('erp_admin_delete_password') || DEFAULT_ADMIN_DELETE_PASSWORD;
};

export const setAdminDeletePassword = (password: string): void => {
  if (!password || !password.trim()) {
    localStorage.setItem('erp_admin_delete_password', DEFAULT_ADMIN_DELETE_PASSWORD);
  } else {
    localStorage.setItem('erp_admin_delete_password', password.trim());
  }
};

export const verifyAdminDeletePassword = (passwordInput: string): boolean => {
  const currentPassword = getAdminDeletePassword();
  return (passwordInput || '').trim() === currentPassword.trim();
};
