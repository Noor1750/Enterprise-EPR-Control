import json

data = [
    {"speed": 50, "util": 0.88, "conv": 24, "pcs": 633600, "unit": 42240},
    {"speed": 100, "util": 0.34, "conv": 24, "pcs": 979200, "unit": 32640}
]

for d in data:
    unit_calc = d["speed"] * 60 * 16 * d["util"]
    pcs_calc = unit_calc * d["conv"]
    print(f"speed={d['speed']}, util={d['util']}, conv={d['conv']}")
    print(f"  Unit: expected={d['unit']}, calc={unit_calc}")
    print(f"  Pcs: expected={d['pcs']}, calc={pcs_calc}")
    print(f"  Ratio Pcs/Unit: {d['pcs'] / d['unit'] if d['unit'] else 0}")
