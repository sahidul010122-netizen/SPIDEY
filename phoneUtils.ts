/**
 * Bengali to English digit conversion and phone number validation
 */

const BENGALI_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];

export function convertBengaliToEnglishDigits(input: string): string {
  if (!input) return '';
  let result = input;
  for (let i = 0; i < 10; i++) {
    const bengaliRegex = new RegExp(BENGALI_DIGITS[i], 'g');
    result = result.replace(bengaliRegex, i.toString());
  }
  return result;
}

export function cleanAndFormatPhoneNumber(rawInput: string): string {
  if (!rawInput) return '';
  // Convert any Bengali numerals to English
  const english = convertBengaliToEnglishDigits(rawInput);
  // Extract all numeric digits
  const digitsOnly = english.replace(/\D/g, '');

  // If someone entered +88017..., extract from 01...
  if (digitsOnly.startsWith('8801') && digitsOnly.length >= 13) {
    return digitsOnly.substring(2);
  }
  return digitsOnly;
}

export function validateBangladeshPhoneNumber(rawInput: string): {
  isValid: boolean;
  formattedNumber: string;
  errorMessage?: string;
} {
  const formattedNumber = cleanAndFormatPhoneNumber(rawInput);

  if (!formattedNumber) {
    return {
      isValid: false,
      formattedNumber: '',
      errorMessage: 'মোবাইল নাম্বার লিখুন (Enter mobile number)'
    };
  }

  // Must be 11 digits starting with 01
  if (!formattedNumber.startsWith('0')) {
    return {
      isValid: false,
      formattedNumber,
      errorMessage: 'নাম্বারটি ০ (0) দিয়ে শুরু হতে হবে (Must start with 0)'
    };
  }

  if (formattedNumber.length !== 11) {
    return {
      isValid: false,
      formattedNumber,
      errorMessage: `মোবাইল নাম্বারটি অবশ্যই ১১ ডিজিটের হতে হবে (বর্তমানে ${formattedNumber.length} ডিজিট)`
    };
  }

  // Standard Bangladesh Operator Prefixes: 013, 014, 015, 016, 017, 018, 019
  const validPrefixes = ['013', '014', '015', '016', '017', '018', '019'];
  const prefix = formattedNumber.substring(0, 3);
  if (!validPrefixes.includes(prefix)) {
    return {
      isValid: false,
      formattedNumber,
      errorMessage: 'সঠিক বাংলাদেশি মোবাইল নাম্বার দিন (যেমন: 01715123766)'
    };
  }

  return {
    isValid: true,
    formattedNumber
  };
}

/**
 * Smart single-box parser to parse raw multiline text:
 * Line 1: Name
 * Line 2: Phone number
 * Line 3+: Address
 */
export function parseCombinedAddressBox(text: string): {
  name: string;
  phone: string;
  address: string;
} {
  if (!text) return { name: '', phone: '', address: '' };

  const lines = text
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean);

  let name = '';
  let phone = '';
  const addressLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const converted = convertBengaliToEnglishDigits(line);
    const digits = converted.replace(/\D/g, '');

    // Check if this line looks like a phone number
    if (!phone && (digits.length === 11 || digits.startsWith('8801') || (digits.startsWith('01') && digits.length >= 10))) {
      phone = cleanAndFormatPhoneNumber(line);
      continue;
    }

    if (!name && i === 0 && !digits.startsWith('01')) {
      name = line;
      continue;
    }

    addressLines.push(line);
  }

  return {
    name,
    phone,
    address: addressLines.join(', ')
  };
}
