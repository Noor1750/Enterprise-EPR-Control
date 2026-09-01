import { format } from 'date-fns';

export interface VolunteerRoleItem {
  id: string;
  label: string;
  icon: string;
  color: string;
  badgeBg: string;
}

export const VOLUNTEER_ROLES: VolunteerRoleItem[] = [
  { id: 'First Aid', label: 'First Aid', icon: '🩹', color: 'text-emerald-700', badgeBg: 'bg-emerald-50 border-emerald-200 text-emerald-800' },
  { id: 'Fire Fighters', label: 'Fire Fighters', icon: '🚒', color: 'text-rose-700', badgeBg: 'bg-rose-50 border-rose-200 text-rose-800' },
  { id: 'Fire Rescue', label: 'Fire Rescue', icon: '🦺', color: 'text-amber-700', badgeBg: 'bg-amber-50 border-amber-200 text-amber-800' },
  { id: 'Fire First Aid', label: 'Fire First Aid', icon: '🩺', color: 'text-pink-700', badgeBg: 'bg-pink-50 border-pink-200 text-pink-800' },
  { id: 'PC Committee', label: 'PC Committee', icon: '👥', color: 'text-blue-700', badgeBg: 'bg-blue-50 border-blue-200 text-blue-800' },
  { id: 'Safety Committee', label: 'Safety Committee', icon: '🛡️', color: 'text-orange-700', badgeBg: 'bg-orange-50 border-orange-200 text-orange-800' },
  { id: 'Trusty Board', label: 'Trusty Board', icon: '🏛️', color: 'text-indigo-700', badgeBg: 'bg-indigo-50 border-indigo-200 text-indigo-800' },
  { id: 'ERT', label: 'ERT (Emergency Response)', icon: '⚡', color: 'text-purple-700', badgeBg: 'bg-purple-50 border-purple-200 text-purple-800' },
  { id: '5S Committee', label: '5S Committee', icon: '🌿', color: 'text-teal-700', badgeBg: 'bg-teal-50 border-teal-200 text-teal-800' },
];

export const TSHIRT_SIZES = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL'];

export interface ShoeSizeOption {
  eu: string;
  bd: string;
  label: string;
}

export const SHOE_SIZE_MAPPINGS: ShoeSizeOption[] = [
  { eu: '38', bd: '5', label: 'EU 38 (BD/UK 5)' },
  { eu: '39', bd: '6', label: 'EU 39/40 (BD/UK 6)' },
  { eu: '40', bd: '6', label: 'EU 40 (BD/UK 6)' },
  { eu: '41', bd: '7', label: 'EU 41 (BD/UK 7)' },
  { eu: '42', bd: '8', label: 'EU 42 (BD/UK 8)' },
  { eu: '43', bd: '9', label: 'EU 43 (BD/UK 9)' },
  { eu: '44', bd: '10', label: 'EU 44 (BD/UK 10)' },
  { eu: '45', bd: '11', label: 'EU 45 (BD/UK 11)' },
  { eu: '46', bd: '12', label: 'EU 46 (BD/UK 12)' },
  { eu: '47', bd: '13', label: 'EU 47 (BD/UK 13)' },
];

export const SHOE_SIZES = ['38', '39', '40', '41', '42', '43', '44', '45', '46', '47'];

export function formatShoeSizeDisplay(size: string): string {
  if (!size) return '';
  const clean = size.replace(/^EU\s*/i, '').trim();
  const found = SHOE_SIZE_MAPPINGS.find(m => m.eu === clean || m.bd === clean);
  if (found) {
    return found.label;
  }
  return `EU ${clean}`;
}

export interface EducationalQualification {
  degree: string;
  institute: string;
  passingYear: string;
  result?: string;
}

export interface EmployeeFormData {
  id: string;
  name: string;
  designation: string;
  department: string;
  workingArea: string;
  category: 'Management' | 'Non-Management';
  position: string;
  supervisor: string;
  manager: string;
  status: 'Active' | 'Inactive';
  inactiveDate: string;
  dateOfJoin: string;
  dateOfBirth: string;
  phone: string;
  emergency: string;
  bloodGroup: string;
  salary: string;
  overtimeRate: string;
  profilePicture: string;
  tShirtSize: string;
  shoeSize: string;
  volunteer: string;
  shift: string;
  shiftMode: string;
  effectiveDate: string;
  rotationStartingShift: string;
  remarks: string;

  // Personal Information
  maritalStatus: 'Married' | 'Unmarried' | 'Single' | 'Other' | '';
  nationalId: string;

  // Present Address
  presentAddress: string;
  presentThana: string;
  presentDistrict: string;

  // Permanent Address
  permanentAddress: string;
  permanentThana: string;
  permanentDistrict: string;

  // Education
  education: string;
  educationList?: EducationalQualification[];
}

/**
 * Compresses an image file client-side to a lightweight JPEG thumbnail Data URL (<20KB)
 */
export function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 240;
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
        resolve(dataUrl);
      };
      img.onerror = () => resolve(e.target?.result as string);
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Calculates service length between join date and end date
 */
export function calculateTenure(joinDateStr?: string, endDateStr?: string): string {
  if (!joinDateStr) return '—';
  try {
    const start = new Date(joinDateStr);
    const end = endDateStr ? new Date(endDateStr) : new Date();
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return '—';
    if (end < start) return '0 days';

    let years = end.getFullYear() - start.getFullYear();
    let months = end.getMonth() - start.getMonth();
    let days = end.getDate() - start.getDate();

    if (days < 0) {
      months--;
      const prevMonth = new Date(end.getFullYear(), end.getMonth(), 0);
      days += prevMonth.getDate();
    }
    if (months < 0) {
      years--;
      months += 12;
    }

    const parts = [];
    if (years > 0) parts.push(`${years} yr${years > 1 ? 's' : ''}`);
    if (months > 0) parts.push(`${months} mo${months > 1 ? 's' : ''}`);
    if (days > 0 || parts.length === 0) parts.push(`${days} day${days !== 1 ? 's' : ''}`);
    return parts.join(' ');
  } catch {
    return '—';
  }
}
