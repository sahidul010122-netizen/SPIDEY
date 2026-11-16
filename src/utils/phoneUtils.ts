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

const BD_ADDRESS_KEYWORDS = [
  'road', 'rd', 'house', 'flat', 'floor', 'sector', 'block', 'lane', 'goli', 'avenue', 'ave',
  'plot', 'bazar', 'bazaar', 'market', 'mor', 'more', 'chawk', 'chowk', 'circle', 'gate',
  'station', 'stand', 'para', 'gram', 'village', 'vill', 'post', 'thana', 'upazila', 'upozila',
  'zilla', 'zila', 'dist', 'district', 'division', 'ward', 'union', 'college', 'school',
  'university', 'varsity', 'hospital', 'masjid', 'mosque', 'mandir', 'bhaban', 'tower',
  'plaza', 'complex', 'housing', 'society', 'colony', 'town', 'city', 'near', 'opposite',
  'beside', 'behind', 'front', 'holding', 'p\\.o', 'p\\.s',
  'dhaka', 'chattogram', 'chittagong', 'sylhet', 'rajshahi', 'khulna', 'barishal', 'barisal',
  'rangpur', 'mymensingh', 'cumilla', 'comilla', 'narayanganj', 'gazipur', 'savar', 'uttara',
  'mirpur', 'dhanmondi', 'gulshan', 'banani', 'mohammadpur', 'badda', 'rampura', 'khilgaon',
  'jatrabari', 'motijheel', 'farmgate', 'bogura', 'bogra', 'jessore', 'jashore', 'feni',
  'noakhali', 'tangail', 'brahmanbaria', 'pabna', 'sirajganj', 'kushtia', 'dinajpur',
  'faridpur', 'narsingdi', 'munshiganj', 'manikganj', 'keraniganj', 'ashulia', 'tongi',
  'ঢাকা', 'চট্টগ্রাম', 'সিলেট', 'রাজশাহী', 'খুলনা', 'বরিশাল', 'রংপুর', 'ময়মনসিংহ',
  'কুমিল্লা', 'নারায়ণগঞ্জ', 'গাজীপুর', 'সাভার', 'উত্তরা', 'মিরপুর', 'ধানমন্ডি', 'গুলশান',
  'বনানী', 'মোহাম্মদপুর', 'বাড্ডা', 'রামপুরা', 'খিলগাঁও', 'যাত্রাবাড়ী', 'মতিঝিল',
  'ফার্মগেট', 'বাসা', 'বাড়ি', 'হোল্ডিং', 'রোড', 'সড়ক', 'লেন', 'গলি', 'সেক্টর', 'ব্লক',
  'তলা', 'ফ্ল্যাট', 'গ্রাম', 'ডাকঘর', 'পোস্ট', 'থানা', 'উপজেলা', 'জেলা', 'বাজার', 'মোড়',
  'পাড়া', 'মহল্লা', 'বিভাগ', 'এলাকা'
];

const ADDRESS_KEYWORD_REGEX = new RegExp(`(?:^|[\\s,/\\-.])(?:${BD_ADDRESS_KEYWORDS.join('|')})(?:$|[\\s,/\\-.])`, 'i');

function stripEmojisAndNoiseSymbols(input: string): string {
  return input
    // Remove emojis, pictographs, dingbats, variation selectors
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{200D}]/gu, ' ')
    // Remove leading list bullets / box symbols
    .replace(/^[\s•▪▫◦●○◆◇▶►➤➔➜\-–—=*_~|]+/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function isJunkOrNonAddressLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return true;

  // Product codes or jersey item lines like [SJ-XXX], 1. Real Madrid..., ITEMS:
  if (/^(?:ordered\s*)?items?\s*[:\-=]?$/i.test(trimmed)) return true;
  if (/^\[?[A-Z]{2,5}-[A-Z0-9]{3,}\]?/i.test(trimmed)) return true;
  if (/^\d+\.\s*\[?[A-Z]{2,5}-[A-Z0-9]+/i.test(trimmed)) return true;

  // Explicit price / jersey / size / payment / order metadata lines
  if (/^(?:price|total(?:\s*amount)?|cod(?:\s*amount)?|amount|delivery\s*charge|charge|tk|taka|bdt|subtotal|discount|jersey(?:\s*name)?|product|kit|size|qty|quantity|custom(?:\s*name)?|edition|season|code|exchange(?:\s*parcel)?|gift\s*box|payment(?:\s*method)?|bkash|nagad|rocket|note|order(?:\s*id|\s*no|\s*date)?|টাকা|দাম|মূল্য|চার্জ|ডেলিভারি\s*চার্জ|সাইজ|জার্সি|পেমেন্ট|বিকাশ|নগদ)\s*[:\-=]/i.test(trimmed)) {
    return true;
  }

  // Standalone price or size lines
  if (/^(?:৳\s*)?\d+(?:\.\d+)?\s*(?:tk|taka|৳|\/-|টাকা)\.?$/i.test(trimmed)) return true;
  if (/^(?:size\s*[:\-=]?\s*)?(?:xs|s|m|l|xl|xxl|xxxl|2xl|3xl)$/i.test(trimmed)) return true;

  // Common messenger greetings / filler sentences with no real detail
  if (/^(?:assalamu\s*alaikum|salam|walikum\s*assalam|hello|hi|hey|bhai|vai|vaiya|bro|thanks|thank\s*you|dhonnobad|please|pls|plz|urgent|আসসালামু\s*আলাইকুম|সালাম|ভাই|ভাইয়া|ধন্যবাদ|প্লিজ)\.?$/i.test(trimmed)) {
    return true;
  }
  if (/\b(?:order\s*(?:ta|ti)?\s*confirm|confirm\s*(?:koren|korun|please)|delivery\s*charge\s*koto)\b/i.test(trimmed) || /(?:অর্ডার\s*কনফার্ম|কনফার্ম\s*করেন|কনফার্ম\s*করুন)/.test(trimmed)) {
    return true;
  }

  // Pure divider lines
  if (/^[-━=_*#~.]{3,}$/.test(trimmed)) return true;

  return false;
}

/**
 * Smart single-box parser to extract ONLY Name, Mobile Number, and Address
 * from clean or jumbled multiline/single-line text while trimming away junk/labels.
 */
export function parseCombinedAddressBox(text: string): {
  name: string;
  phone: string;
  address: string;
} {
  if (!text || !text.trim()) return { name: '', phone: '', address: '' };

  let explicitName = '';
  let explicitPhone = '';
  const explicitAddressParts: string[] = [];
  const unlabeledCandidates: string[] = [];

  const rawLines = text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map(stripEmojisAndNoiseSymbols)
    .filter(Boolean);

  for (const rawLine of rawLines) {
    if (isJunkOrNonAddressLine(rawLine)) continue;

    // 1. Check explicit Phone / Mobile label
    const phoneLabelMatch = rawLine.match(
      /^(?:mobile(?:\s*(?:no|number))?|phone(?:\s*(?:no|number))?|contact(?:\s*(?:no|number))?|cell|mob|ph|tel|whatsapp|মোবাইল(?:\s*(?:নাম্বার|নং))?|ফোন(?:\s*(?:নাম্বার|নং))?|নাম্বার|নম্বর)\s*[:\-=.\s]+(.+)$/i
    );
    if (phoneLabelMatch && phoneLabelMatch[1]) {
      const cleanedPhone = cleanAndFormatPhoneNumber(phoneLabelMatch[1]);
      if (cleanedPhone.length >= 6 && !explicitPhone) {
        explicitPhone = cleanedPhone;
        continue;
      }
    }

    // 2. Check explicit Name label
    const nameLabelMatch = rawLine.match(
      /^(?:customer\s*name|full\s*name|receiver\s*name|recipient|your\s*name|name|নাম|কাস্টমারের\s*নাম|গ্রাহকের\s*নাম)\s*[:\-=.]+\s*(.+)$/i
    );
    if (nameLabelMatch && nameLabelMatch[1]) {
      let candidateName = nameLabelMatch[1].trim();
      const inlinePhoneMatch = convertBengaliToEnglishDigits(candidateName).match(
        /(?:\+?88\s*[-]?\s*)?01[3-9](?:[\s\-.]*\d){8}/
      );
      if (inlinePhoneMatch) {
        if (!explicitPhone) {
          explicitPhone = cleanAndFormatPhoneNumber(inlinePhoneMatch[0]);
        }
        const engLine = convertBengaliToEnglishDigits(candidateName);
        candidateName = engLine.replace(inlinePhoneMatch[0], '').replace(/^[\s,|/\-]+|[\s,|/\-]+$/g, '').trim();
      }
      if (candidateName && !explicitName) {
        explicitName = candidateName;
      }
      continue;
    }

    // 3. Check explicit Address label
    const addrLabelMatch = rawLine.match(
      /^(?:delivery\s*address|shipping\s*address|full\s*address|home\s*address|present\s*address|address|location|ঠিকানা|ডেলিভারি\s*ঠিকানা|বাসার\s*ঠিকানা)\s*[:\-=.]+\s*(.+)$/i
    );
    if (addrLabelMatch && addrLabelMatch[1]) {
      let candidateAddr = addrLabelMatch[1].trim();
      const inlinePhoneMatch = convertBengaliToEnglishDigits(candidateAddr).match(
        /(?:\+?88\s*[-]?\s*)?01[3-9](?:[\s\-.]*\d){8}/
      );
      if (inlinePhoneMatch) {
        if (!explicitPhone) {
          explicitPhone = cleanAndFormatPhoneNumber(inlinePhoneMatch[0]);
        }
        const engLine = convertBengaliToEnglishDigits(candidateAddr);
        candidateAddr = engLine.replace(inlinePhoneMatch[0], '').replace(/^[\s,|/\-]+|[\s,|/\-]+$/g, '').trim();
      }
      if (candidateAddr) {
        explicitAddressParts.push(candidateAddr);
      }
      continue;
    }

    // 4. Unlabeled line: inspect for BD phone number (full or standalone partial)
    const convertedLine = convertBengaliToEnglishDigits(rawLine);
    const digitsOnly = convertedLine.replace(/\D/g, '');
    const alphaCount = convertedLine.replace(/[\d\s+\-().:,/|]/g, '').length;

    // Pure / predominantly phone line (including partial while typing)
    if (
      !explicitPhone &&
      alphaCount <= 2 &&
      (digitsOnly.length === 11 ||
        digitsOnly.startsWith('8801') ||
        (digitsOnly.startsWith('01') && digitsOnly.length >= 4))
    ) {
      explicitPhone = cleanAndFormatPhoneNumber(convertedLine);
      continue;
    }

    // Inline full 11-digit BD mobile inside mixed text (e.g. "Rakib Hasan 01715123766 Chawkbazar, Chittagong")
    const inlineBdPhoneMatch = convertedLine.match(/(?:\+?88\s*[-]?\s*)?01[3-9](?:[\s\-.]*\d){8}/);
    if (inlineBdPhoneMatch && inlineBdPhoneMatch.index !== undefined) {
      if (!explicitPhone) {
        explicitPhone = cleanAndFormatPhoneNumber(inlineBdPhoneMatch[0]);
      }
      const beforePart = convertedLine
        .slice(0, inlineBdPhoneMatch.index)
        .replace(/\b(?:mobile|phone|contact|cell|mob|ph|no|number)\s*[:\-=]?\s*$/gi, '')
        .replace(/^[\s,|/\-]+|[\s,|/\-]+$/g, '')
        .trim();
      const afterPart = convertedLine
        .slice(inlineBdPhoneMatch.index + inlineBdPhoneMatch[0].length)
        .replace(/^[\s,|/\-]+|[\s,|/\-]+$/g, '')
        .trim();

      if (beforePart && !isJunkOrNonAddressLine(beforePart)) {
        unlabeledCandidates.push(beforePart);
      }
      if (afterPart && !isJunkOrNonAddressLine(afterPart)) {
        unlabeledCandidates.push(afterPart);
      }
      continue;
    }

    // Single-line comma-separated fallback when there's only 1 line
    if (rawLines.length === 1 && rawLine.includes(',')) {
      rawLine.split(',').map(s => s.trim()).filter(Boolean).forEach(seg => {
        if (!isJunkOrNonAddressLine(seg)) unlabeledCandidates.push(seg);
      });
      continue;
    }

    unlabeledCandidates.push(rawLine);
  }

  // 5. Classify unlabeled candidates into Name vs Address
  const finalAddressParts = [...explicitAddressParts];
  let finalName = explicitName;

  if (!finalName && unlabeledCandidates.length > 0) {
    const isLikelyName = (cand: string): boolean => {
      const converted = convertBengaliToEnglishDigits(cand);
      if (/\d/.test(converted)) return false;
      if (/[,/|]/.test(cand)) return false;
      if (ADDRESS_KEYWORD_REGEX.test(cand)) return false;
      const wordCount = cand.trim().split(/\s+/).length;
      return wordCount >= 1 && wordCount <= 5 && cand.length <= 45;
    };

    let pickedIdx = unlabeledCandidates.findIndex(isLikelyName);

    if (pickedIdx === -1) {
      pickedIdx = unlabeledCandidates.findIndex(c => !ADDRESS_KEYWORD_REGEX.test(c));
    }
    if (pickedIdx === -1) {
      pickedIdx = 0;
    }

    finalName = unlabeledCandidates[pickedIdx];
    unlabeledCandidates.forEach((cand, idx) => {
      if (idx !== pickedIdx) {
        finalAddressParts.push(cand);
      }
    });
  } else if (explicitAddressParts.length === 0) {
    // Only fall back to unlabeled candidates as address if no explicit Address: label was provided
    finalAddressParts.push(...unlabeledCandidates);
  }

  return {
    name: finalName.trim(),
    phone: explicitPhone.trim(),
    address: finalAddressParts.join(', ').replace(/,\s*,+/g, ', ').trim()
  };
}

