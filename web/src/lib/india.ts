// Shared by the checkout form (browser) and the order check (server), so both agree on what a valid address is.

export const STATES = ['Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry']

export type Details = {
  email: string; phone: string; name: string; line1: string; line2?: string; city: string; state: string; pin: string
}

// Returns a message per field that is wrong. An empty object means the details are fine.
export function checkDetails(f: Partial<Details>): Record<string, string> {
  const e: Record<string, string> = {}
  if (!/^\S+@\S+\.\S+$/.test(String(f.email ?? ''))) e.email = 'Enter an email like name@example.com.'
  if (!/^[6-9]\d{9}$/.test(String(f.phone ?? ''))) e.phone = 'Enter a 10-digit mobile number.'
  if (String(f.name ?? '').trim().length < 2) e.name = 'Tell us who the parcel is for.'
  if (String(f.line1 ?? '').trim().length < 5) e.line1 = 'Add the house number and street.'
  if (String(f.city ?? '').trim().length < 2) e.city = 'Add your city.'
  if (!STATES.includes(String(f.state ?? ''))) e.state = 'Choose a state.'
  if (!/^[1-9]\d{5}$/.test(String(f.pin ?? ''))) e.pin = 'Enter a valid 6-digit pincode.'
  return e
}
