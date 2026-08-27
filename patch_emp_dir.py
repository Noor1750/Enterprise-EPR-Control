import re

with open('src/components/EmployeeDirectory.tsx', 'r') as f:
    content = f.read()

block_to_remove = r"""              <div>
                <label className="block text-sm font-medium text-\[#73879C\] mb-1">Profile Picture URL</label>
                <input type="url" value={formData.profilePicture} onChange={e => setFormData({...formData, profilePicture: e.target.value})} className="w-full px-3 py-2 border rounded-sm" placeholder="https://..." />
              </div>"""
content = re.sub(block_to_remove, "", content)

# Remove any leftover profilePicture properties
content = re.sub(r"profilePicture: ''(?:,\s*)?", "", content)
content = re.sub(r"formData\.profilePicture(?:,\s*)?", "", content)
content = re.sub(r"profilePicture: row\[16\] \|\| ''(?:,\s*)?", "", content)
content = re.sub(r", profilePicture: e.target.value", "", content)

with open('src/components/EmployeeDirectory.tsx', 'w') as f:
    f.write(content)
