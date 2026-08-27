import re

with open('src/components/MachineCapacity.tsx', 'r') as f:
    content = f.read()

# 1. Update imports
content = content.replace("import { useState, useEffect } from 'react';", "import { useState, useEffect, useRef } from 'react';")
content = content.replace("import { Loader2, Edit2, X } from 'lucide-react';", "import { Loader2, Edit2, X, Plus, Upload } from 'lucide-react';\nimport XLSX from 'xlsx';\n\nconst getXlsx = () => XLSX;")

# 2. Add state and fileUpload
state_replacement = """  const [editingSkillIndex, setEditingSkillIndex] = useState<number | null>(null);
  const [skillSearch, setSkillSearch] = useState('');

  const [isMachineModalOpen, setIsMachineModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const xlsx = getXlsx();
        const bstr = evt.target?.result;
        const wb = xlsx.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = xlsx.utils.sheet_to_json(ws, { header: 1 }) as string[][];
        
        const rows = data.slice(1).filter(row => row.length > 0 && row[0]);
        const paddedRows = rows.map(row => {
          const padded = list(row) if isinstance(row, list) else list(row)
          while len(padded) < 16: padded.append('')
          return [str(v) if v else '' for v in padded]
        })
        # I need to use pure JS strings here, writing JS code inside Python script.
      } catch (err) {}
    }
  }
"""
