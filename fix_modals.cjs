const fs = require('fs');
let code = fs.readFileSync('src/components/EmployeeDirectory.tsx', 'utf8');

code = code.replace(
  '  const [isEditing, setIsEditing] = useState(false);',
  `  const [isEditing, setIsEditing] = useState(false);
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; id: string; name: string; password: "" } | null>(null);
  const [editModal, setEditModal] = useState<{ isOpen: boolean; emp: any | null; password: "" } | null>(null);`
);

// fix type errors:
code = code.replace(/\{deleteModal\.name\}/g, '{deleteModal?.name}');
code = code.replace(/\{deleteModal\.id\}/g, '{deleteModal?.id}');
code = code.replace(/deleteModal\.password/g, 'deleteModal?.password');
code = code.replace(/\{editModal\.emp\?.name\}/g, '{editModal?.emp?.name}');
code = code.replace(/\{editModal\.emp\?.id\}/g, '{editModal?.emp?.id}');
code = code.replace(/editModal\.password/g, 'editModal?.password');
code = code.replace(/<X className="w-5 h-5" \/>/g, 'X');

// add X to lucide-react import
code = code.replace(
  "import { Search, Filter, RefreshCw, Upload, Download, Loader2, Plus, Edit2, Trash2, Calendar, FileText, ChevronDown, ChevronRight, UserCircle, CheckCircle, Clock } from 'lucide-react';",
  "import { Search, Filter, RefreshCw, Upload, Download, Loader2, Plus, Edit2, Trash2, Calendar, FileText, ChevronDown, ChevronRight, UserCircle, CheckCircle, Clock, X } from 'lucide-react';"
);

fs.writeFileSync('src/components/EmployeeDirectory.tsx', code);
