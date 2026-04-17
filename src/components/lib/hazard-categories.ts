// Comprehensive hazard categorization for EEI Corporation
export const hazardCategories = {
  "Physical Hazards": [
    "Energized Line",
    "Hot Surface", 
    "Floor Opening",
    "Unsecured Floor Opening Cover",
    "Leading Edges",
    "Uneven Surface",
    "Loose Material",
    "Protruding Material", 
    "Rough Edges",
    "Sharp Edges",
    "Unstable Working Platform",
    "Working Platform with Missing Parts",
    "Working with Equipment",
    "Line of Fire",
    "Stored Energy"
  ],
  "Ergonomic Hazards": [
    "Ergonomics",
    "Improper Handling of Materials (heavy material, complex configuration)",
    "Fatigue due to excessive overtime"
  ],
  "Housekeeping and Environmental Hazards": [
    "Poor Housekeeping",
    "Obstructed Access", 
    "Unsecured Tool / Material",
    "Uneven Surface",
    "Unsecured Floor Opening Cover",
    "Loose Material",
    "Presence of Animal"
  ],
  "Hazardous Materials and Fire Hazards": [
    "Flammable Liquids",
    "Stored Energy",
    "Hot Surface"
  ],
  "Organizational and Behavioral Hazards": [
    "Simultaneous Activity",
    "Communication Issues",
    "Improper Tools",
    "Unsafe Condition of Tools", 
    "Poor Maintenance of PPE"
  ]
};

// Get all hazard types as a flat array
export const getAllHazardTypes = (): string[] => {
  return Object.values(hazardCategories).flat();
};

// Get hazard category for a specific hazard type
export const getHazardCategory = (hazardType: string): string => {
  for (const [category, hazards] of Object.entries(hazardCategories)) {
    if (hazards.includes(hazardType)) {
      return category;
    }
  }
  return "Unknown Category";
};

// Get color coding for hazard categories
export const getCategoryColor = (category: string): string => {
  const categoryColors: Record<string, string> = {
    "Physical Hazards": "#ef4444", // Red
    "Ergonomic Hazards": "#f59e0b", // Orange  
    "Housekeeping and Environmental Hazards": "#10b981", // Green
    "Hazardous Materials and Fire Hazards": "#dc2626", // Dark Red
    "Organizational and Behavioral Hazards": "#3b82f6" // Blue
  };
  return categoryColors[category] || "#6b7280"; // Default gray
};