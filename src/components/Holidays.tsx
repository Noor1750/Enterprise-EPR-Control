import HolidayManagement from './settings/HolidayManagement';
import { UserSecurityScope } from '../lib/security';

interface HolidaysProps {
  spreadsheetId: string;
  user?: any;
  userSecurityScope?: UserSecurityScope;
}

export default function Holidays({ spreadsheetId, user, userSecurityScope }: HolidaysProps) {
  return (
    <HolidayManagement 
      spreadsheetId={spreadsheetId} 
      user={user} 
      userSecurityScope={userSecurityScope} 
    />
  );
}

