import re

content = open('src/components/MachineCapacity.tsx').read()

def shift_m_index(match):
    idx = int(match.group(1))
    if idx > 2:
        return f"m[{idx-1}]"
    return match.group(0)

# Replace all occurrences of m[3], m[4]... m[16] with m[2], m[3]... m[15]
content = re.sub(r'm\[(\d+)\]', shift_m_index, content)

open('src/components/MachineCapacity.tsx', 'w').write(content)
