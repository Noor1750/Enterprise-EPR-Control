export interface BreakdownSymptomCategory {
  category: string;
  symptoms: string[];
}

export const LABEL_PRINTING_BREAKDOWN_SUGGESTIONS: BreakdownSymptomCategory[] = [
  {
    category: 'Printing & Inking',
    symptoms: [
      'Registration drift / out of register',
      'Print head streak / missing nozzles / nozzle deflection',
      'UV lamp curing failure / lamp ignition error',
      'Ink viscosity high / ink spitting / doctor blade leakage',
      'Anilox roller clogged / dirty / low ink transfer',
      'Plate lifting / tape unsticking / plate damaged',
      'Color shade variation / delta E deviation',
      'Ghosting / smearing / pinholes in solid print'
    ]
  },
  {
    category: 'Web Tension & Feeding',
    symptoms: [
      'Web tension loss / dancing roller unstable',
      'Paper break / web snap at unwinder',
      'Web guide / edge position control (EPC) error',
      'Splicing unit jam / tape adhesion fail',
      'Feed roller slipping / silicone roller wear',
      'Corona treater not sparking / low surface tension'
    ]
  },
  {
    category: 'Die-Cutting & Finishing',
    symptoms: [
      'Rotary die-cutter blunt / uneven cutting / liner strike',
      'Matrix waste stripping tear / matrix break',
      'Slitting blade blunt / burr edges on rolls',
      'Magnetic cylinder gear pitch wear / gap misalignment',
      'Waste rewinder motor stall / rewind tension loose',
      'Anvil roller scratch / pressure indentation'
    ]
  },
  {
    category: 'Sensors & Electrical',
    symptoms: [
      'Optical register sensor dirty / false eye-mark detection',
      'Servo motor overload / drive alarm trip',
      'Static charge buildup / spark discharge / label fly-away',
      'Air pressure low / pneumatic valve leakage',
      'Main motor gearbox abnormal noise / overheating',
      'Emergency stop circuit trip / interlock safety fault',
      'Touchscreen HMI unresponsive / PLC communication timeout'
    ]
  }
];

export const ALL_QUICK_LABEL_SYMPTOMS: string[] = LABEL_PRINTING_BREAKDOWN_SUGGESTIONS.flatMap(
  cat => cat.symptoms
);
