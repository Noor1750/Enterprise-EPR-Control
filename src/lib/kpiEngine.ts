export function calculatePerformanceRating(achievement: number | string): number {
  const achNum = typeof achievement === 'string' ? parseFloat(achievement) : achievement;
  
  if (isNaN(achNum)) return 2.0;
  
  if (achNum < 70) {
    return 2.0;
  }
  
  if (achNum >= 100) return 5.0;
  
  // Formula: 2.0 + ((Achievement % - 70) * 0.1)
  const rating = 2.0 + ((achNum - 70) * 0.1);
  
  // Round to exactly one decimal place
  return Math.round(rating * 10) / 10;
}
