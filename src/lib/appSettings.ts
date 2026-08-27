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
