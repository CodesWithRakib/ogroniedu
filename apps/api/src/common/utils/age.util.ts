/**
 * Whether a date of birth belongs to a minor (under 18, Bangladesh).
 * Single home for the age gate previously duplicated in users and
 * guardians services. Invalid/missing input counts as non-minor.
 */
export function isMinor(dateOfBirth: string | null | undefined): boolean {
  if (!dateOfBirth) return false;
  const dob = new Date(dateOfBirth);
  if (isNaN(dob.getTime())) return false;
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return age < 18;
}
